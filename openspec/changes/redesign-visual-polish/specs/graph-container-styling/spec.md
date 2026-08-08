## Requirement: Graph container has proper visual definition

The delegation graph container has explicit border, background, padding, and radius.

### Scenarios

- GIVEN the session detail page with the delegation graph
  WHEN I look at the graph container
  THEN it has `border border-border bg-card rounded-lg p-2`

- GIVEN the graph container
  WHEN I look at the edges
  THEN nodes do not touch the container border (p-2 provides padding)

- GIVEN the graph container
  WHEN I look at the MiniMap
  THEN node colors use status tokens (indigo for live, emerald for completed, zinc for pending) instead of hardcoded hex values
