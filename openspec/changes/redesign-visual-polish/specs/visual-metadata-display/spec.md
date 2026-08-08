## Requirement: Readable metadata extraction

Session metadata displays human-readable values instead of raw JSON.

### Scenarios

- GIVEN a session with `model` as a JSON object `{"id":"mimo-v2.5-free","providerID":"opencode"}`
  WHEN the model is displayed in the session header
  THEN it shows `mimo-v2.5-free` (the `.id` field)

- GIVEN a session with `model` as a string `"mimo-v2.5-free"`
  WHEN the model is displayed
  THEN it shows the string directly

- GIVEN a session with `model` as an unexpected shape
  WHEN the model is displayed
  THEN it falls back to a readable string representation (not `[object Object]`)
