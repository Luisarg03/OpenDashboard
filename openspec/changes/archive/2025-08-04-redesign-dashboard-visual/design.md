## Context

OpenDashboard's frontend uses React 19 + Vite 5 + Tailwind CSS v4 + shadcn/ui + Tremor 3 for charts. The current visual implementation has structural issues: missing Tremor CSS import (broken card/chart styles), semi-transparent borders that vanish in dark mode, multiple competing accent colors (indigo primary + teal accent + hardcoded emerald/amber/red in components), oversized radius (rounded-xl = 16px on cards), and text-sm as default (too loose for data-heavy dashboards). The goal is a disciplined, modern data-tool aesthetic inspired by CompAI CRM's "flat white + one brand color" philosophy.

Current token definitions live in `frontend/src/index.css` using HSL CSS variables with `@theme inline` mapping. Dark mode uses `.dark` class via next-themes. shadcn components are in `frontend/src/components/ui/`. Feature components (KPI cards, charts, session list) are in `frontend/src/features/`.

## Goals / Non-Goals

**Goals:**
- Fix broken visual styles (Tremor CSS, tailwindcss-animate)
- Establish single brand color (indigo-500) — eliminate teal accent
- Add centralized design tokens for status colors (success/warning/error/info)
- Solidify surface separation with opaque borders
- Standardize radius to 4/5/8px scale
- Shift typography density: text-xs as workhorse, font-medium for headings
- Add row hover accent bar interaction pattern
- Add bloom glow utility for status indicators
- Remove dead dependency (@dagrejs/dagre)

**Non-Goals:**
- View Transitions API (experimental, low browser support)
- Icon micro-motion presets (high effort, low impact)
- Chart dither texture (too specific to CompAI's brand)
- Complete component rewrite — modify existing, don't replace
- Changing React/Vite/Tremor versions
- Modifying session-detail page layout (only polish existing)

## Decisions

### D1: Keep indigo-500 as sole brand color

**Decision**: `--primary: 239 84% 67%` (indigo-500) stays. Remove `--accent: 172 66% 50%` (teal).

**Rationale**: CompAI's principle — one brand color that doesn't change between themes creates visual consistency. Indigo is already established in the codebase. Teal accent creates competition for attention.

**Alternatives considered**:
- Switch to green like CompAI: Rejected — indigo is already the project's identity
- Keep both indigo + teal: Rejected — multi-accent is what makes it feel template-like
- Use accent only for interactive elements: Rejected — adds complexity without clear value

### D2: Status tokens as CSS variables, not hardcoded classes

**Decision**: Define `--status-success`, `--status-warning`, `--status-error`, `--status-info` in index.css. Replace all hardcoded `bg-emerald-500`, `bg-red-500` etc. with these tokens.

**Rationale**: Centralized tokens enable consistent theming and dark mode handling. CompAI uses oklch for status colors — we'll use HSL to match existing token format.

**Alternatives considered**:
- Keep Tailwind color classes: Rejected — scattered, no dark mode control
- Use CSS `color-mix()` for variants: Rejected — adds complexity, Tailwind already handles shades

### D3: Opaque borders, not semi-transparent

**Decision**: Replace `border-border/50` with `border-border` (100% opacity). Update dark mode border token to solid `#2a2a2a`.

**Rationale**: CompAI's design language uses hairline borders as primary surface separator. Semi-transparent borders disappear in dark mode against dark backgrounds.

**Alternatives considered**:
- Increase opacity to /80: Rejected — still not fully solid, inconsistent with CompAI pattern
- Use different border tokens for light/dark: Rejected — already handled by CSS variables

### D4: Radius scale: 4/5/8px, eliminate 16px

**Decision**: `--radius: 5px` base. Cards use `rounded-lg` (8px). Buttons/inputs use `rounded-md` (5px). Small controls use `rounded-sm` (4px). Remove `rounded-xl` (16px) from card.tsx.

**Rationale**: CompAI's strict 3-step radius scale creates visual consistency. 16px cards look "bubbly" — enterprise data tools use tighter radius.

**Alternatives considered**:
- Keep rounded-xl for cards: Rejected — contradicts the denser, more disciplined aesthetic
- Use rounded-none like CompAI for edge-to-edge: Not needed — our layout doesn't have that pattern

### D5: Typography density shift

**Decision**: In index.css, change default button/card text to `text-xs`. Keep `text-sm` for body copy only. Headings use `font-medium` (500) not `font-bold` (700).

**Rationale**: CompAI's density (12px workhorse) makes data feel tighter and more professional. Current text-sm default feels "inflated."

**Alternatives considered**:
- Keep text-sm, just tighten spacing: Rejected — density comes from type size, not just spacing
- Go even smaller (text-[11px]): Rejected — too aggressive for our font/viewport

### D6: Row hover accent bar via CSS, not JS

**Decision**: Add CSS rule for clickable rows: `hover:pl-5 hover:border-l-2 hover:border-l-primary` with transition. No JS state needed.

**Rationale**: CompAI's row accent bar is a key interaction signal. Pure CSS is simpler and more performant than JS-driven animation.

**Alternatives considered**:
- Background tint (current approach): Rejected — generic, doesn't distinguish interactive rows
- Motion library animation: Rejected — overkill for simple hover state

### D7: Bloom glow as utility class

**Decision**: Add `.bloom-low` and `.bloom-high` classes in index.css using box-shadow. Apply to status dots and KPI accents.

**Rationale**: CompAI's bloom is the one decorative flourish that adds "alive" feeling without complexity. Simple CSS, no JS.

**Alternatives considered**:
- Skip bloom: Rejected — status indicators need more than just color (WCAG 1.4.1 compliance with multiple signals)
- Use drop-shadow filter: Rejected — box-shadow is more performant and consistent

### D8: Remove tailwindcss-animate, use motion library

**Decision**: Since `motion` (Framer Motion successor) is already installed, replace inert `animate-in/zoom-in` classes with motion components where animations are needed. Remove `tailwindcss-animate` dependency.

**Rationale**: motion is already in the project and more powerful. Installing tailwindcss-animate adds redundancy.

**Alternatives considered**:
- Install tailwindcss-animate: Rejected — adds dependency for what motion already does
- Remove all animations: Rejected — animations add polish when used sparingly

## Risks / Trade-offs

- **Risk: Breaking existing component styles** → Mitigation: Test each change in isolation. Start with index.css tokens, then update components one by one.
- **Risk: text-xs too small for readability** → Mitigation: Keep text-sm for body copy. Use text-xs only for data cells, labels, buttons. Monitor in actual use.
- **Risk: Motion library animations differ from tailwindcss-animate** → Mitigation: Only replace animations that are currently broken (inert). Don't add new animations in this change.
- **Risk: Status token colors don't match existing hardcoded colors** → Mitigation: Use the same HSL values currently hardcoded (emerald-500, red-500, amber-500) as starting point.
- **Trade-off: Less "playful" than current** → Accepted: Enterprise data tools prioritize clarity over playfulness. CompAI's restraint is the goal.
