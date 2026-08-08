# feedback-system Specification

## Purpose
TBD - created by archiving change frontend-modernization-wave-1. Update Purpose after archive.
## Requirements
### Requirement: A toast surface is mounted at the application root

The application SHALL mount a `<Toaster />` from `sonner` in `main.tsx` so that any component can call `toast(...)` to surface a non-fatal message. The toaster SHALL render in the top-right corner of the viewport, SHALL respect the active theme, and SHALL render no more than three toasts at a time (older toasts dismissed first).

#### Scenario: A toast appears in the top-right

- **WHEN** any component calls `toast.error('Could not refresh stats')`
- **THEN** a toast appears in the top-right corner of the viewport with the message and a close button

#### Scenario: Toasts respect the theme

- **WHEN** the dashboard is in dark mode and a toast is triggered
- **THEN** the toast uses the dark theme (matching surface and foreground tokens)

#### Scenario: Older toasts are dismissed first

- **WHEN** four toasts are triggered in quick succession
- **THEN** the oldest is dismissed to make room for the fourth, so no more than three are visible at once

### Requirement: Transient errors toast non-fatally; hard errors keep their full-page state

The codebase SHALL split error surfaces into two categories. Transient errors (data-refresh failures, SSE reconnects, copy-to-clipboard failures, mutating-action failures on the dashboard) SHALL be rendered as toasts so the user can continue working. Hard errors (the initial session-detail load fails, the chain request fails on first paint, the user navigates to a non-existent session) SHALL continue to render the full-page `SessionError` or `SessionNotFound` card.

#### Scenario: An SSE reconnect toasts

- **WHEN** the SSE connection drops and the reconnect attempt fails more than `MAX_CONSECUTIVE_ERRORS` (3) times in a row
- **THEN** a toast appears with the message "Live updates paused — retrying" and the page remains interactive

#### Scenario: A 404 still renders the full page

- **WHEN** the user navigates to `/session/does-not-exist` and the backend returns 404
- **THEN** the full `SessionNotFound` card is rendered, not a toast

#### Scenario: A first-paint error still renders the full page

- **WHEN** the user loads a session-detail page and the chain request fails on first paint
- **THEN** the full `SessionError` card with a `Retry` button is rendered, not a toast

### Requirement: Toasts are dismissible and time out automatically

Every toast SHALL have a visible close button that dismisses the toast immediately. Default toasts (no explicit `duration` argument) SHALL auto-dismiss after 4 seconds. Error toasts (`toast.error(...)`) SHALL auto-dismiss after 6 seconds unless the caller passes a longer `duration`.

#### Scenario: A user dismisses a toast manually

- **WHEN** the user clicks the close button on a visible toast
- **THEN** the toast is removed from the viewport

#### Scenario: A default toast auto-dismisses

- **WHEN** a default `toast('Saved')` is triggered and the user does not interact with it
- **THEN** the toast disappears after 4 seconds

#### Scenario: An error toast auto-dismisses

- **WHEN** a `toast.error('Could not save')` is triggered and the user does not interact with it
- **THEN** the toast disappears after 6 seconds

