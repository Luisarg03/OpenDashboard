## ADDED Requirements

### Requirement: Status colors are first-class Tailwind utilities

The system SHALL expose every status color declared in `frontend/src/index.css` (`--status-success`, `--status-warning`, `--status-error`, `--status-info`) as a Tailwind utility via the `@theme inline` block, so a component author can write `bg-status-success`, `text-status-error`, `border-status-warning`, etc. without arbitrary values. Components MUST NOT use `bg-[hsl(var(--status-*))]` or equivalent arbitrary values in any file under `frontend/src/`.

#### Scenario: A status utility renders the token color

- **WHEN** a component uses `className="bg-status-success"`
- **THEN** the rendered background color matches the value of `--status-success` for the active theme

#### Scenario: Existing arbitrary values are replaced

- **WHEN** the codebase is searched for `bg-[hsl(var(--status-`
- **THEN** no occurrences exist outside `frontend/src/index.css`

### Requirement: Dark mode is the default theme

The `ThemeProvider` component SHALL initialize the active theme to `dark` on first render, regardless of the user's `prefers-color-scheme`. The visible `<ThemeToggle />` SHALL continue to cycle through `light / dark / system` and the user's choice SHALL persist across reloads.

#### Scenario: First paint renders in dark mode

- **WHEN** a user opens the dashboard with no prior preference stored
- **THEN** the `<html>` element has the `dark` class on first paint

#### Scenario: User override persists

- **WHEN** a user clicks the theme toggle to switch to `light` and reloads the page
- **THEN** the dashboard renders in `light` mode

### Requirement: Status hues pass WCAG AA on body text

Every status color token in light mode MUST reach a contrast ratio of at least 4.5:1 against the `--background` token when rendered as `text-status-*` on a `bg-background` surface at font sizes ≤ 14px. Dark mode values MUST reach at least 4.5:1 against `--background` (the near-black `#0A0A0B`).

#### Scenario: Success text on background is legible

- **WHEN** a `<span class="text-status-success">` is rendered on a `bg-background` surface in light mode
- **THEN** the contrast ratio of the foreground against the background is at least 4.5:1

#### Scenario: Warning text on background is legible

- **WHEN** a `<span class="text-status-warning">` is rendered on a `bg-background` surface in light mode
- **THEN** the contrast ratio of the foreground against the background is at least 4.5:1

### Requirement: Data values render in a monospace font

Text elements marked as data values (timestamps, IDs, token counts, durations, prices) SHALL render in `font-data` (a JetBrains Mono stack declared in `index.css`). The `font-data` class SHALL be reachable as a Tailwind utility and SHALL be applied automatically to the documented data-value elements (session metadata, scrubber stats, KPI tile values, drawer text fields).

#### Scenario: A timestamp uses the data font

- **WHEN** a `<span class="font-data tabular-nums">` contains a formatted timestamp
- **THEN** the computed `font-family` includes `JetBrains Mono` at the top of the stack

#### Scenario: Tabular numerals are stable

- **WHEN** a `<span class="font-data tabular-nums">` contains a changing number (e.g. a live-updating total)
- **THEN** the glyphs do not shift horizontally as the value changes

### Requirement: Status colors are lightened in dark mode

The `.dark` block of `index.css` SHALL declare `--status-*` values whose lightness is at least 10 percentage points higher than the corresponding `:root` value, so the colors remain readable against the near-black `--background` of dark mode. Components MUST inherit the theme value automatically via the new utilities; no per-component override is permitted.

#### Scenario: Success is readable on dark

- **WHEN** `bg-status-success` is rendered in dark mode
- **THEN** the rendered color matches the `.dark --status-success` value, not the `:root` value

#### Scenario: No per-component status override exists

- **WHEN** the codebase is searched for arbitrary `hsl(...)` values used as a status indicator
- **THEN** no occurrences exist outside `index.css`
