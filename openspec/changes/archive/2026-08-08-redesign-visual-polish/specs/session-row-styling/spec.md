## Requirement: Session rows use solid borders and proper hover

Session list rows use fully opaque borders and meaningful hover states.

### Scenarios

- GIVEN the session list
  WHEN I look at any session row
  THEN it has `border border-border` (fully opaque, no opacity modifier)

- GIVEN a session row
  WHEN I hover over it
  THEN the background changes to `bg-muted/50` (visible hover state)

- GIVEN a session row
  WHEN I hover over it
  THEN the left accent bar appears (via row-accent-hover class) at 36px height

- GIVEN a session row with status "completed"
  WHEN I look at the status dot
  THEN it uses `bg-[hsl(var(--status-success))]` token (not hardcoded emerald)

- GIVEN a session row with status "failed"
  WHEN I look at the status dot
  THEN it uses `bg-[hsl(var(--status-error))]` token (not hardcoded red)
