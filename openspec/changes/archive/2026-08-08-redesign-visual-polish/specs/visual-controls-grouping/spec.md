## Requirement: Controls grouped in visual containers

Playback and filter controls are wrapped in a grouped container with visual separators.

### Scenarios

- GIVEN the session detail page with controls visible
  WHEN I look at the control bar
  THEN buttons are inside a `rounded-lg border border-border bg-card p-1` container

- GIVEN the control bar
  WHEN I look at the button groups
  THEN there are vertical separators (`h-4 w-px bg-border`) between functional groups (filters | playback | speed)

- GIVEN the dashboard filter bar
  WHEN I look at the filter controls
  THEN they are wrapped in a `rounded-lg border border-border bg-card p-3` container
