## Requirement: Timeline scrubber has better visibility

The timeline scrubber track is thicker and the handle is larger for better usability.

### Scenarios

- GIVEN the session detail page with the timeline scrubber
  WHEN I look at the track
  THEN it is `h-0.5` (2px) tall with `rounded-full bg-border`

- GIVEN the scrubber handle
  WHEN I look at it
  THEN it is `h-5 w-5` with `border-2 border-background bg-primary shadow-md`

- GIVEN the scrubber handle
  WHEN I hover over it
  THEN it scales up slightly (`hover:scale-110 transition-transform`)

- GIVEN the live-tail badge
  WHEN the session is streaming
  THEN it uses `bg-[hsl(var(--status-success))]` token (not hardcoded emerald-500)

- GIVEN the scrubber stats bar
  WHEN I look at it
  THEN it is inside a `rounded-md bg-muted/50 px-3 py-1.5` container with `text-xs`
