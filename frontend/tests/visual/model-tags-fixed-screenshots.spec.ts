import { test } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { modelTags } from '../../src/features/session/lib/model-tags';
import { formatModel } from '../../src/features/session/lib/format';

// Mini-fix 5 follow-up capture: after the JSON-string parser lands, the pills
// must render split (provider, id, variant) instead of one JSON-blob pill.

const OUT = '/tmp/opencode/capturas';
const BASE = 'http://localhost:5173';
const API = 'http://localhost:8420';
const DESKTOP = { width: 1440, height: 900 };

mkdirSync(OUT, { recursive: true });

async function gotoAndSettle(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // settle post-idle animations
}

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}` });
}

// Model tags pill probe: returns { kinds: string[], first: string } for the
// first span[data-kind] inside a cell, or null when no pill renders.
async function probePills(locator: ReturnType<import('@playwright/test').Locator['locator']>) {
  const pills = locator.locator('span[data-kind]');
  const count = await pills.count();
  if (count === 0) return null;
  const kinds: string[] = [];
  for (let i = 0; i < count; i++) {
    kinds.push((await pills.nth(i).getAttribute('data-kind')) ?? '');
  }
  const first = (await pills.first().textContent()) ?? '';
  const firstClass = (await pills.first().getAttribute('class')) ?? '';
  return { kinds, first, firstClass, count };
}

function log(label: string, ok: boolean, detail: string) {
  appendFileSync(`${OUT}/model-tags-probes-fixed.txt`, `[DOM-PROBE] ${label}: ${ok ? 'PASS' : 'FAIL'} - ${detail}\n`);
}

// The parser emits provider, id, variant in that order; assert the full set
// is present so the JSON-blob regression (kinds=[id]) fails loudly.
function hasAllThree(probe: { kinds: string[] } | null) {
  if (probe === null) return false;
  const set = new Set(probe.kinds);
  return set.has('id') && set.has('provider') && set.has('variant');
}

// Requires backend at :8420 to serve /api/sessions/roots — skip when backend is down.
test.skip(true, 'Requires backend at :8420 — not available in local dev without explicit backend start');
test('model-tags fixed visual capture + DOM probe (dark, default theme)', async ({ browser }) => {
  // Fetch the first root session with a non-empty chain (child_count > 0).
  const sessionsResp = await fetch(`${API}/api/sessions/roots?limit=50`);
  const sessionsBody = (await sessionsResp.json()) as {
    sessions: Array<{ id: string; child_count: number; model: string | null; title: string }>;
  };
  const withChildren = sessionsBody.sessions.find((s) => s.child_count > 0);
  if (!withChildren) throw new Error('no session with child_count > 0 found');
  const SESSION_ID = withChildren.id;

  // ---------------- Dashboard ----------------
  const ctx = await browser.newContext({ viewport: DESKTOP });
  const page = await ctx.newPage();
  await gotoAndSettle(page, `${BASE}/`);
  await page.waitForSelector('[data-testid="kpi-section"]');
  await page.waitForSelector('[data-testid="models-by-cost"]');
  await page.waitForSelector('[data-testid="session-list"]');
  await page.waitForTimeout(1500); // charts + table settle

  // Full dashboard first (KPI + cards visible).
  await shot(page, 'model-tags-dashboard-fixed.png');

  // Scroll the data-table session list into view (below the fold).
  await page.locator('[data-testid="session-list"]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await shot(page, 'model-tags-dashboard-scrolled-fixed.png');

  // DOM probe: first session row in the data-table, Model cell (3rd column).
  const firstRowCells = page
    .locator('[data-testid="session-list"] table tbody tr')
    .first()
    .locator('td');
  const modelCell = firstRowCells.nth(2);
  const tableProbe = await probePills(modelCell);
  const expectedModel = formatModel(withChildren.model);
  const tableOk = hasAllThree(tableProbe);
  log(
    'dashboard data-table Model cell',
    tableOk,
    `kinds=[${tableProbe?.kinds.join(',') ?? 'none'}] first="${tableProbe?.first ?? ''}"` +
      ` expectedFormat="${expectedModel}" matches=${tableProbe?.first === expectedModel}`,
  );

  // DOM probe: Cost by model card, first row's Model cell.
  const costRowCells = page
    .locator('[data-testid="models-by-cost"] table tbody tr')
    .first()
    .locator('td');
  const costProbe = await probePills(costRowCells.nth(0));
  const costOk = hasAllThree(costProbe);
  log(
    'cost-by-model card row 1 Model cell',
    costOk,
    `kinds=[${costProbe?.kinds.join(',') ?? 'none'}] first="${costProbe?.first ?? ''}"`,
  );

  // Expected tag model for comparison: what modelTags() produces for the
  // raw API model value.
  const expectedTags = modelTags(withChildren.model);
  log(
    'modelTags() reference',
    true,
    `raw="${String(withChildren.model).slice(0, 60)}" expectedKinds=[${expectedTags.map((t) => t.kind).join(',')}]`,
  );
  await ctx.close();

  // ---------------- Session detail ----------------
  const sctx = await browser.newContext({ viewport: DESKTOP });
  const spage = await sctx.newPage();
  await gotoAndSettle(spage, `${BASE}/session/${SESSION_ID}`);
  await spage.waitForSelector('.react-flow__node', { timeout: 15000 });
  await shot(spage, 'model-tags-session-detail-fixed.png');

  // DOM probe: header metadata row must render all three pills.
  const headerProbe = await probePills(spage.locator('header'));
  const headerOk = hasAllThree(headerProbe);
  log(
    'session-detail header',
    headerOk,
    `kinds=[${headerProbe?.kinds.join(',') ?? 'none'}] first="${headerProbe?.first ?? ''}" size=${headerProbe ? (headerProbe.firstClass.includes('px-1.5') ? 'sm' : headerProbe.firstClass.includes('px-1') ? 'xs' : '?') : '?'}`,
  );

  // Open a node -> drawer.
  await spage.locator('.react-flow__node').first().click();
  await spage.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await spage.waitForTimeout(800); // drawer enter animation
  await shot(spage, 'model-tags-session-drawer-fixed.png');

  // DOM probe: drawer Model field (ModelTags rendered at xs).
  const drawerProbe = await probePills(spage.locator('[role="dialog"]'));
  const drawerOk = hasAllThree(drawerProbe);
  const xs = drawerProbe !== null && drawerProbe.firstClass.includes('px-1');
  log(
    'drawer Model field',
    drawerOk,
    `kinds=[${drawerProbe?.kinds.join(',') ?? 'none'}] first="${drawerProbe?.first ?? ''}"` +
      ` size=${drawerProbe ? (drawerProbe.firstClass.includes('px-1.5') ? 'sm' : xs ? 'xs' : '?') : '?'}`,
  );
  await sctx.close();
});
