import { expect, test } from '@playwright/test';

// Keyboard smoke test for the Radix Dialog node-detail drawer (design D5).
//
// Prereqs: dev server on :5173 (`npm run dev`) and the FastAPI backend on
// :8000 seeded with a session whose chain has at least one node. There is
// no `webServer` entry in playwright.config.ts and no seeded fixture yet,
// so the test self-skips unless a session id is pinned via PW_SESSION_ID.
// Example: PW_SESSION_ID=<id> npx playwright test tests/a11y/drawer-keyboard

const SESSION_ID = process.env.PW_SESSION_ID ?? null;

test('drawer keyboard: close focused on open, Tab trapped, Enter dismisses', async ({ page }) => {
  test.skip(
    SESSION_ID === null,
    'No session fixture: set PW_SESSION_ID to a session id with a non-empty chain, with the dev server and backend running.',
  );

  await page.goto(`/session/${SESSION_ID}`);

  // The graph renders inside [data-testid="graph-area"] once the chain loads.
  const graph = page.getByTestId('graph-area');
  await expect(graph).toBeVisible();

  // Open the drawer by clicking the first node in the graph.
  const firstNode = graph.locator('.react-flow__node').first();
  await expect(firstNode).toBeVisible();
  await firstNode.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Focus lands on the close button when the dialog opens.
  const closeButton = dialog.getByRole('button', { name: 'Close' });
  await expect(closeButton).toBeFocused();

  // Tab is trapped inside the dialog: focus moves to the next focusable in
  // the panel, never to the page behind it.
  await page.keyboard.press('Tab');
  const focusInsideDialog = await page.evaluate(() => {
    const el = document.querySelector('[role="dialog"]');
    return el !== null && el.contains(document.activeElement);
  });
  expect(focusInsideDialog).toBe(true);

  // Enter on the close button dismisses the dialog.
  await closeButton.focus();
  await page.keyboard.press('Enter');
  await expect(dialog).not.toBeVisible();
});
