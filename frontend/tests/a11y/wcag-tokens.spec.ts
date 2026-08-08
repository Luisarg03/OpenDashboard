import { test, expect } from '@playwright/test';

// WCAG AA contrast check for the status tokens in light mode.
// Requires the dev server on :5173 (npm run dev). Text at 12px must clear 4.5:1
// against --background (white) per the design-tokens spec.

const STATUS_TOKENS = ['status-success', 'status-warning', 'status-error', 'status-info'] as const;

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const linear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

function parseColor(color: string): [number, number, number] {
  const channels = color.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  return [channels[0], channels[1], channels[2]] as [number, number, number];
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(parseColor(fg));
  const l2 = relativeLuminance(parseColor(bg));
  const [lighter, darker] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (lighter + 0.05) / (darker + 0.05);
}

test.describe('status token contrast (light mode)', () => {
  test.use({ colorScheme: 'light' });

  for (const token of STATUS_TOKENS) {
    test(`text-${token} on bg-background is >= 4.5:1`, async ({ page }) => {
      // next-themes persists the choice in localStorage; pin light before boot.
      await page.addInitScript(() => {
        localStorage.setItem('theme', 'light');
      });
      await page.goto('/');

      const { fg, bg } = await page.evaluate((tokenName) => {
        const el = document.createElement('span');
        el.className = `text-${tokenName} bg-background`;
        el.style.fontSize = '12px';
        el.textContent = 'Aa';
        document.body.appendChild(el);
        const computed = getComputedStyle(el);
        return { fg: computed.color, bg: computed.backgroundColor };
      }, token);

      expect(contrastRatio(fg, bg), `${token} (${fg} on ${bg})`).toBeGreaterThanOrEqual(4.5);
    });
  }
});
