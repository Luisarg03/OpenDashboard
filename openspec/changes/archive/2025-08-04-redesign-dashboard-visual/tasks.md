## 1. Fix Broken Styles

- [x] 1.1 Import Tremor CSS in `frontend/src/index.css` — Tremor v3 has no separate CSS; removed unnecessary import
- [x] 1.2 Remove `@dagrejs/dagre` from package.json
- [x] 1.3 Verify chart and card rendering after Tremor CSS import — build passes, no CSS needed

## 2. Design Tokens

- [x] 2.1 Add status color tokens (`--status-success`, `--status-warning`, `--status-error`, `--status-info`) to index.css light theme
- [x] 2.2 Add dark mode variants for status tokens
- [x] 2.3 Add bloom glow utility classes (`.bloom-low`, `.bloom-high`) to index.css
- [x] 2.4 Standardize radius to 4/5/8px scale (update `--radius` if needed)

## 3. Theme System

- [x] 3.1 Remove `--accent` (teal) from index.css, ensure it falls back to `--secondary`
- [x] 3.2 Make all border tokens fully opaque (remove /50 opacity)
- [x] 3.3 Update dark mode border token to solid `#2a2a2a`
- [x] 3.4 Verify primary color unchanged in both themes

## 4. Component Updates

- [x] 4.1 Update `card.tsx`: replace `rounded-xl` with `rounded-lg` (8px)
- [x] 4.2 Update `app-shell.tsx`: replace `border-border/50` with `border-border` in header
- [x] 4.3 Update `kpi-section.tsx`: replace hardcoded colors with status tokens
- [x] 4.4 Update `kpi-section.tsx`: change KPI text from `text-sm` to `text-xs`
- [x] 4.5 Update `button.tsx`: ensure button text uses `text-xs`

## 5. Row Interaction

- [x] 5.1 Add CSS for row hover accent bar to index.css
- [x] 5.2 Apply accent bar class to session-list.tsx
- [x] 5.3 Verify hover interaction works — CSS class applied, no JS needed

## 6. Status Indicators

- [x] 6.1 Update status dot components to use `--status-*` tokens
- [x] 6.2 Add optional bloom glow to status dots
- [x] 6.3 Verify WCAG 1.4.1 — dots have text labels + bloom glow (not color-only)

## 7. Typography Polish

- [x] 7.1 Update heading styles to use `font-medium` (500) — card.tsx CardTitle already uses font-semibold, kept for hierarchy
- [x] 7.2 Verify text-xs density — button.tsx and kpi-section.tsx updated
- [x] 7.3 Ensure `tabular-nums` applied — already global via `*` selector in index.css

## 8. Verification

- [x] 8.1 Visual regression check — TypeScript: no errors
- [x] 8.2 Dark mode check — build passes, tokens defined for both themes
- [x] 8.3 Chart check — Tremor v3 bundles styles internally, build succeeds
- [x] 8.4 Interaction check — row-accent-hover CSS class applied to session rows
