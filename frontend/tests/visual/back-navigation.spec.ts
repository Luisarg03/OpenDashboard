import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:5173';
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

async function gotoAndSettle(page: import('@playwright/test').Page, url: string) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}

test.describe('back navigation', () => {
  test('no back button on dashboard root', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await gotoAndSettle(page, `${BASE}/`);

    const backBtn = page.locator('header').getByRole('link', { name: /back/i });
    await expect(backBtn).toHaveCount(0);

    await ctx.close();
  });

  test('back button present on session detail', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await gotoAndSettle(page, `${BASE}/session/some-id`);

    const backBtn = page.locator('header').getByRole('link', { name: /back/i });
    await expect(backBtn).toBeVisible();

    await ctx.close();
  });

  test('clicking back button navigates to /', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await gotoAndSettle(page, `${BASE}/session/some-id`);

    await page.locator('header').getByRole('link', { name: /back/i }).click();
    await page.waitForURL('**/');
    expect(page.url()).toBe(`${BASE}/`);

    await ctx.close();
  });

  test('no aside element at desktop or mobile', async ({ browser }) => {
    const desktopCtx = await browser.newContext({ viewport: DESKTOP });
    const dpage = await desktopCtx.newPage();
    await gotoAndSettle(dpage, `${BASE}/`);
    await expect(dpage.locator('aside')).toHaveCount(0);
    await desktopCtx.close();

    const mobileCtx = await browser.newContext({ viewport: MOBILE });
    const mpage = await mobileCtx.newPage();
    await gotoAndSettle(mpage, `${BASE}/`);
    await expect(mpage.locator('aside')).toHaveCount(0);
    await mobileCtx.close();
  });

  test('no tab nav items in header at any viewport', async ({ browser }) => {
    const desktopCtx = await browser.newContext({ viewport: DESKTOP });
    const dpage = await desktopCtx.newPage();
    await gotoAndSettle(dpage, `${BASE}/`);
    const dTabs = dpage.locator('header nav a, header nav button');
    await expect(dTabs).toHaveCount(0);
    await desktopCtx.close();

    const mobileCtx = await browser.newContext({ viewport: MOBILE });
    const mpage = await mobileCtx.newPage();
    await gotoAndSettle(mpage, `${BASE}/`);
    const mTabs = mpage.locator('header nav a, header nav button');
    await expect(mTabs).toHaveCount(0);
    await mobileCtx.close();
  });
});
