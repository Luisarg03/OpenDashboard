import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/opencode/capturas';
const BASE = 'http://localhost:5173';
const SESSION_ID = process.env.SESSION_ID ?? 'ses_02bb1728cffeLgKyM8DwzM64q9';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

mkdirSync(OUT, { recursive: true });

async function gotoAndSettle(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500); // settle post-idle animations
}

async function shot(page: import('@playwright/test').Page, name: string) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}` });
}

test('wave-2 after screenshots (dark, default theme)', async ({ browser }) => {
  // Dashboard (desktop + mobile): KPI tiles + the two new sub-agent cards.
  const desktop = await browser.newContext({ viewport: DESKTOP });
  const page = await desktop.newPage();
  await gotoAndSettle(page, `${BASE}/`);
  await page.waitForSelector('[data-testid="kpi-section"]');
  await page.waitForSelector('[data-testid="tokens-by-subagent"]');
  await page.waitForSelector('[data-testid="cost-by-subagent"]');
  await page.waitForTimeout(1500); // let the per-session chain queries resolve into bars
  await shot(page, 'dashboard-after-wave-2-desktop-dark.png');
  await desktop.close();

  const mobile = await browser.newContext({ viewport: MOBILE });
  const mpage = await mobile.newPage();
  await gotoAndSettle(mpage, `${BASE}/`);
  await mpage.waitForSelector('[data-testid="kpi-section"]');
  await mpage.waitForTimeout(1500);
  await shot(mpage, 'dashboard-after-wave-2-mobile-dark.png');
  await mobile.close();

  // Session detail: cascade mode, then timeline mode, then a mid-scrub timeline.
  const session = await browser.newContext({ viewport: DESKTOP });
  const spage = await session.newPage();
  await gotoAndSettle(spage, `${BASE}/session/${SESSION_ID}`);
  await spage.waitForSelector('.react-flow__node');
  await shot(spage, 'session-after-wave-2-cascade-desktop-dark.png');

  const timelineBtn = spage.getByRole('button', { name: 'Timeline layout' });
  await timelineBtn.click();
  await spage.waitForSelector('.react-flow__node');
  await spage.waitForTimeout(800); // enter animation (0.2s) + settle
  await shot(spage, 'session-after-wave-2-timeline-desktop-dark.png');

  // Drag the scrubber to the midpoint of its track.
  const slider = spage.getByRole('slider', {
    name: 'Timeline: filter delegation nodes up to this time',
  });
  const box = await slider.boundingBox();
  if (!box) throw new Error('timeline scrubber not visible');
  await spage.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await spage.waitForTimeout(800); // mid-scrub reveal animation + settle
  await shot(spage, 'session-after-wave-2-timeline-scrubbed-mid-desktop-dark.png');
  await session.close();
});
