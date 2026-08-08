## Why

The current dashboard has a "template" feel compared to polished data tools like CompAI CRM. Root causes: missing Tremor CSS (broke card/chart styles), semi-transparent borders that disappear in dark mode, mixed accent colors (indigo + teal + hardcoded greens/amber), oversized radius (16px cards), and loose typography (text-sm default). The visual language lacks discipline — no single brand color, no design governance, no consistent density. This redesign establishes a cohesive, modern data-tool aesthetic.

## What Changes

- **Fix broken styles**: Import Tremor CSS, install tailwindcss-animate or replace with motion
- **Unify color system**: Single brand color (keep indigo), eliminate teal accent, add design tokens for status (success/warning/error/info) instead of hardcoded colors
- **Tighten typography**: text-xs as workhorse for data-heavy areas, font-medium (500) for headings instead of bold
- **Solidify borders**: Replace semi-transparent borders with solid opaques for clear surface separation
- **Standardize radius**: 4px/5px/8px scale, eliminate rounded-xl (16px) from cards
- **Add design tokens**: Centralized status colors, bloom glow utility, row accent bar interaction
- **Clean dead dependencies**: Remove unused @dagrejs/dagre

## Capabilities

### New Capabilities

- `design-tokens`: Centralized CSS variables for status colors (success/warning/error/info), bloom glow utility, and spacing/radius governance
- `visual-polish`: Row hover accent bars, status indicator bloom effects, chart dither texture option

### Modified Capabilities

- `dashboard-layout`: Card styling changes (radius, borders), KPI card refinements, typography density shift
- `theme-system`: Color token restructuring, border opacity changes, radius scale standardization

## Impact

- **Files**: `frontend/src/index.css` (tokens, globals), `frontend/src/components/app-shell.tsx` (header/sidebar borders), `frontend/src/components/ui/card.tsx` (radius), `frontend/src/features/dashboard/components/kpi-section.tsx` (card styling, remove hardcoded colors), `frontend/src/features/dashboard/components/cost-timeseries.tsx` (chart polish), `frontend/src/features/dashboard/components/agent-breakdown.tsx` (chart polish), `frontend/src/features/session/components/session-list.tsx` (row hover), `frontend/src/features/session/components/delegation-node.tsx` (status indicators)
- **Dependencies**: Remove `@dagrejs/dagre`, verify `tailwindcss-animate` compatibility with Tailwind v4 or use motion替代
- **Breaking**: No API changes. Visual-only. Existing feature behavior preserved.
