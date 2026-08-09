## REMOVED Requirements

### Requirement: Sidebar shows application navigation

**Reason:** The sidebar and its navigation entries were removed. The dashboard at `/` is the single main view; navigation into a session or agents route happens by clicking into data or entering a URL directly, and return navigation uses the header back button.

**Migration:** Navigation to `/sessions` and `/agents` is by direct URL only. Return to the dashboard uses the header back button.

### Requirement: The sidebar is collapsible on small viewports

**Reason:** The sidebar no longer exists, so the mobile drawer, backdrop, and Escape handler are all unnecessary.

**Migration:** Navigation to `/sessions` and `/agents` is by direct URL only. Return to the dashboard uses the header back button.

## MODIFIED Requirements

### Requirement: The header is sticky and always visible

The top header SHALL be `position: sticky; top: 0` and SHALL remain visible while the user scrolls. The header MUST contain the product wordmark, the `ThemeToggle`, and (on non-root routes only) a back button. The header SHALL render above the main content in the stacking order.

#### Scenario: The header stays in place on scroll

- **WHEN** the user scrolls the main content area 600px down
- **THEN** the header is still visible at the top of the viewport

#### Scenario: The header contains the expected controls

- **WHEN** the user inspects the header on the dashboard root (`/`)
- **THEN** it contains the product wordmark and the `ThemeToggle`, and no back button is rendered

#### Scenario: The header contains the back button on sub-routes

- **WHEN** the user inspects the header on a non-root route (e.g. `/sessions`)
- **THEN** it contains the product wordmark, the `ThemeToggle`, and a back button labeled `Back`

### Requirement: The skip-to-content link is the first focusable element

A visually hidden skip link MUST be the first focusable element in the document so that keyboard users can bypass the header. Activating the link MUST move focus to the `<main id="main-content">` element.

#### Scenario: Tab reveals the skip link

- **WHEN** the user presses `Tab` once on a fresh page load
- **THEN** the skip link becomes visible and is the focused element

#### Scenario: Activating the link moves focus

- **WHEN** the user activates the skip link
- **THEN** the `<main>` element receives focus and the next `Tab` press focuses the first interactive element inside the main content

## ADDED Requirements

### Requirement: A back button returns to the dashboard from sub-routes

The app shell SHALL render a back control in the header on every route except the dashboard root (`/`). It SHALL be a link whose destination is always `/` (not a history-based `navigate(-1)`), so the destination is deterministic regardless of how the user arrived. It SHALL carry a visible `Back` text label in addition to its icon, and an accessible name of `Back to dashboard`. On `/` the control SHALL NOT be rendered.

#### Scenario: Dashboard root shows no back control

- **WHEN** the user loads the dashboard root (`/`)
- **THEN** the header does not contain a back button

#### Scenario: A session detail route shows the back control

- **WHEN** the user loads `/session/abc` or any non-root route
- **THEN** the header contains a back button with a visible `Back` label

#### Scenario: Clicking the back control navigates to `/`

- **WHEN** the user clicks the back button while on `/session/abc`
- **THEN** the browser navigates to `/` and the dashboard renders

#### Scenario: The back control has an accessible name

- **WHEN** a screen reader announces the back button
- **THEN** its accessible name is `Back to dashboard`
