import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/opencode/capturas';
const BASE = 'http://localhost:5173';
const SESSION_ID = process.env.SESSION_ID ?? 'ses_02bec7cd3ffeZDUuJqXNCjG7Yy';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

mkdirSync(OUT, { recursive: true });

async function gotoAndSettle(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // settle post-idle animations
}

async function shot(
  page: import('@playwright/test').Page,
  name: string,
  viewport: 'desktop' | 'mobile',
) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}-${viewport}-dark.png` });
}

// Requires backend at :8420 to serve dashboard stats — KPI section never renders without data.
test.skip(true, 'Requires backend at :8420 — kpi-section never appears without stats API');
test('wave-1 after screenshots (dark, default theme)', async ({ browser }) => {
  // Fresh context: no localStorage, so theme-provider defaults to dark (wave-1 change).
  const desktop = await browser.newContext({ viewport: DESKTOP });
  const page = await desktop.newPage();

  await gotoAndSettle(page, `${BASE}/`);
  await page.waitForSelector('[data-testid="kpi-section"]');
  await shot(page, 'dashboard-after-wave-1', 'desktop');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: MOBILE });
  const mpage = await mobile.newPage();
  await gotoAndSettle(mpage, `${BASE}/`);
  await mpage.waitForSelector('[data-testid="kpi-section"]');
  await shot(mpage, 'dashboard-after-wave-1', 'mobile');
  await mobile.close();

  const sessionDesktop = await browser.newContext({ viewport: DESKTOP });
  const spage = await sessionDesktop.newPage();
  await gotoAndSettle(spage, `${BASE}/session/${SESSION_ID}`);
  await spage.waitForSelector('.react-flow__node');
  await shot(spage, 'session-after-wave-1', 'desktop');
  await sessionDesktop.close();

  const sessionMobile = await browser.newContext({ viewport: MOBILE });
  const smpage = await sessionMobile.newPage();
  await gotoAndSettle(smpage, `${BASE}/session/${SESSION_ID}`);
  await smpage.waitForSelector('.react-flow__node');
  await shot(smpage, 'session-after-wave-1', 'mobile');
  await sessionMobile.close();
});
