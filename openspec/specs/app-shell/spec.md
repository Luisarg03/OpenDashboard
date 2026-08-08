# app-shell Specification

## Purpose
TBD - created by archiving change frontend-modernization-wave-1. Update Purpose after archive.
## Requirements
### Requirement: Sidebar shows application navigation

The fixed left sidebar in `AppShell` SHALL render a vertical list of navigation entries — at minimum `Dashboard` and `Sessions`, with a future `Agents` slot — each rendered as a link to the corresponding route. The active route SHALL be visually distinguished (a `bg-muted` background, a left-edge accent bar in `bg-primary`, or an equivalent affordance). Empty-state copy and the "Wave 3 KPI cards" placeholder in `app-shell.tsx:33-41` MUST be removed.

#### Scenario: The Dashboard link is visible

- **WHEN** the user loads any route
- **THEN** the sidebar renders a link labeled `Dashboard` that points to `/`

#### Scenario: The active link is highlighted

- **WHEN** the current route is `/session/abc`
- **THEN** the `Sessions` link in the sidebar has a visual active-state treatment distinct from inactive links

#### Scenario: Clicking a link navigates

- **WHEN** the user clicks the `Dashboard` link in the sidebar
- **THEN** the browser navigates to `/` and the page re-renders the dashboard

### Requirement: The sidebar is collapsible on small viewports

On viewports narrower than the `md` Tailwind breakpoint, the sidebar SHALL be hidden by default and SHALL be revealed by tapping the menu icon in the sticky header. While the mobile drawer is open, the rest of the page SHALL be covered by a translucent backdrop that closes the drawer when tapped. Tapping the close icon or pressing `Escape` SHALL also close the drawer.

#### Scenario: Mobile sidebar is hidden by default

- **WHEN** the viewport width is 600px and the user loads the page
- **THEN** the sidebar is not visible in the layout

#### Scenario: The menu icon reveals the sidebar

- **WHEN** the viewport is 600px wide and the user taps the menu icon
- **THEN** the sidebar slides in from the left and a backdrop covers the rest of the page

#### Scenario: The backdrop closes the sidebar

- **WHEN** the mobile sidebar is open and the user taps the backdrop
- **THEN** the sidebar slides out and the backdrop is removed

#### Scenario: Escape closes the sidebar

- **WHEN** the mobile sidebar is open and the user presses the `Escape` key
- **THEN** the sidebar closes

### Requirement: The header is sticky and always visible

The top header SHALL be `position: sticky; top: 0` and SHALL remain visible while the user scrolls. The header MUST contain the product wordmark, the `ThemeToggle`, and the mobile-only menu icon. The header SHALL render above the sidebar in the stacking order (z-index higher than the sidebar but lower than the mobile drawer overlay).

#### Scenario: The header stays in place on scroll

- **WHEN** the user scrolls the main content area 600px down
- **THEN** the header is still visible at the top of the viewport

#### Scenario: The header contains the expected controls

- **WHEN** the user inspects the header
- **THEN** it contains the product wordmark, the `ThemeToggle`, and (on viewports narrower than `md`) the menu icon

### Requirement: The skip-to-content link is the first focusable element

A visually hidden skip link MUST be the first focusable element in the document so that keyboard users can bypass the header and sidebar. Activating the link MUST move focus to the `<main id="main-content">` element.

#### Scenario: Tab reveals the skip link

- **WHEN** the user presses `Tab` once on a fresh page load
- **THEN** the skip link becomes visible and is the focused element

#### Scenario: Activating the link moves focus

- **WHEN** the user activates the skip link
- **THEN** the `<main>` element receives focus and the next `Tab` press focuses the first interactive element inside the main content

