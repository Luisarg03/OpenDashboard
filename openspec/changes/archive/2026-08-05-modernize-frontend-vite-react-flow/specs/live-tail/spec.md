# live-tail Spec

## Purpose

Stream live updates of the active OpenCode session from FastAPI to the React frontend over Server-Sent Events (SSE), and merge them into the running view (graph + summary) without reloads. The backend polls the existing read-only SQLite connection (the OpenCode writer is a separate process); the frontend subscribes with an `EventSource`-based hook modeled on the Vercel vibe-coding-ide `useAgentStream` pattern.

## Requirements

### REQ-1: SSE endpoint

The backend MUST expose `GET /api/sessions/{id}/events` returning a `StreamingResponse` with `media_type="text/event-stream"` and hand-rolled `data: <json>\n\n` framing.

#### Scenario: Client subscribes to a session

- **WHEN** the frontend opens an `EventSource` on `/api/sessions/{id}/events`
- **THEN** the response is a text/event-stream and the client receives events for that session only

### REQ-2: Event payloads

The system MUST emit a `node:new` event (full `DelegationNode` payload) whenever new rows appear in the session's delegation chain, and a `session:updated` event (full `SessionSummary`) when the session row's totals change.

#### Scenario: New delegation node written by OpenCode

- **WHEN** the OpenCode process inserts a new row in the session's chain while the client is subscribed
- **THEN** the backend detects it within the poll interval and emits `node:new` with the node payload

### REQ-3: Heartbeat and termination

The system MUST emit periodic heartbeat comments (`: ping`) to keep the stream alive, and MUST terminate the stream after the session shows no updates for a defined idle window (no leaks).

#### Scenario: Idle session closes the stream

- **WHEN** no new rows or updates arrive for the idle timeout
- **THEN** the server closes the stream and the client transitions the session to its terminal state

### REQ-4: Frontend subscription hook

The frontend MUST provide a `useSessionEvents(sessionId)` hook that creates `new EventSource(url)`, handles `open`/`message`/`error`, closes the connection on unmount, and exposes connection status to the UI.

#### Scenario: Component unmount

- **WHEN** the user navigates away from the session view
- **THEN** the hook closes the `EventSource` and no further events are processed

### REQ-5: Reconnection

The system MUST tolerate connection drops: rely on the native `EventSource` auto-reconnect with a bounded manual backoff, and surface a reconnecting state in the UI.

#### Scenario: Stream interrupted

- **WHEN** the SSE connection drops mid-session
- **THEN** the client reconnects automatically (bounded retries), resumes the stream, and the UI shows reconnecting status until the stream is open again

### REQ-6: Merge into view

The system MUST merge received events into the active graph and summary state: `node:new` appends the node and its edge to the graph and updates aggregate totals; `session:updated` refreshes the session header/summary. Merging MUST NOT require a full chain refetch.

#### Scenario: Live update applied in place

- **WHEN** `node:new` or `session:updated` events arrive for the open session
- **THEN** the graph gains the node and the cost/token totals update in place without reloading the page

### REQ-7: Error handling and read-only guarantee

The system MUST keep the connection to the database read-only (`PRAGMA query_only = 1` is already enforced by `db.py`) and MUST surface stream errors (404 session, DB unavailable) as UI state rather than unhandled exceptions.

#### Scenario: Session does not exist

- **WHEN** the client subscribes to events for a nonexistent session id
- **THEN** the endpoint responds with an error status and the UI shows a session-not-found state
