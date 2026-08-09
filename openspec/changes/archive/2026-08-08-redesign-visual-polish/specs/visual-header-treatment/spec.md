## Requirement: Headers use section divider treatment

Headers on both dashboard and session detail pages use `border-b border-border` as section dividers, not floating cards.

### Scenarios

- GIVEN the dashboard page is loaded
  WHEN I look at the header area
  THEN it has a bottom border (border-b border-border) and no background card or rounded corners

- GIVEN the session detail page is loaded
  WHEN I look at the header area
  THEN it has a bottom border (border-b border-border) and no background card, rounded corners, or gradient

- GIVEN either header
  WHEN I inspect the CSS
  THEN there is no `rounded-xl`, no `from-primary/5`, no `bg-gradient-to-br`
