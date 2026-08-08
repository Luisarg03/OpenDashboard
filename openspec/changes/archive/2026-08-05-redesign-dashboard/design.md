## Context

The OpenDashboard frontend uses a standard shadcn/ui indigo+teal palette that feels generic. The dark mode has critical bugs (invisible chart axes) and the overall aesthetic doesn't match modern data tools. The stack is React 19 + Tailwind 4 + Tremor 3 + React Flow 12.

Current state:
- CSS vars define light/dark palettes in `index.css`
- No `@tremor/react` CSS import — charts use browser defaults for axes
- Agent colors are deterministic but use muted Tailwind 500 shades
- Cards use shadow-based elevation (feels flat in dark mode)

## Goals / Non-Goals

**Goals:**
- Dark-first design with near-black base and grayscale surfaces
- Linear/Vercel aesthetic: content-first, chrome-last
- Fix Tremor chart visibility in dark mode
- Single vivid accent color (indigo-500) for interactive elements
- JetBrains Mono for all data-layer values
- Border-only elevation (no shadows on cards)

**Non-Goals:**
- Redesigning the React Flow graph layout algorithm
- Changing the data model or API responses
- Adding new features or components
- Redesigning the session detail page (separate effort)
- Mobile-specific optimizations

## Decisions

### D1: Palette — Dark-first grayscale + indigo accent

**Decision:** Use near-black (#0A0A0B) as background, grayscale surfaces (#18181B, #27272A), and indigo-500 (#6366F1) as the sole accent color.

**Rationale:** Linear and Vercel both use this pattern. Single accent color reduces visual noise and creates clear hierarchy. Grayscale surfaces provide depth without color competition.

**Alternatives considered:**
- Blue accent: Too corporate, less distinctive
- Teal accent: Current choice, feels generic
- Multi-accent: Increases visual complexity, harder to hierarchy

### D2: Tremor CSS import + chart theming

**Decision:** Import `@tremor/react` CSS in `main.tsx` and override chart colors via Tremor's `colors` prop with explicit hex values for dark mode.

**Rationale:** Tremor charts default to black axes/labels. Importing the CSS gives us baseline styling. Overriding with explicit colors ensures visibility.

**Alternatives considered:**
- Custom Recharts: More work, loses Tremor's defaults
- CSS-only overrides: Tremor uses inline styles for axes, CSS can't reach them

### D3: Card elevation — border-only

**Decision:** Remove `shadow` from Card component, use `border-white/10` for elevation. Dark mode cards get slightly lighter background.

**Rationale:** Shadows are invisible on dark backgrounds. Border-based elevation is what Linear/Vercel use. Cleaner, more predictable.

### D4: Agent colors — brighter for dark mode

**Decision:** Use 400-level Tailwind colors in dark mode instead of 500-level. Increase saturation for better visibility on dark backgrounds.

**Rationale:** 500-level colors look muted on near-black backgrounds. 400-level provides better contrast without being garish.

### D5: Remove gradient header

**Decision:** Replace gradient header with clean solid background + subtle border-bottom.

**Rationale:** Gradients on data tool surfaces feel decorative rather than functional. Linear/Vercel use minimal headers.

## Risks / Trade-offs

- **[Tremor version compatibility]** → Tremor 3.x may not expose all theming APIs. Mitigation: Test with current version, fallback to CSS overrides.
- **[Light mode degradation]** → Dark-first design may make light mode feel secondary. Mitigation: Ensure light mode palette has sufficient contrast.
- **[Agent color regression]** → Changing agent colors affects existing visual associations. Mitigation: Keep the same color family, just brighten the shade.
- **[Scope creep]** → Session detail page has similar issues but is out of scope. Mitigation: Explicitly exclude from this change.
