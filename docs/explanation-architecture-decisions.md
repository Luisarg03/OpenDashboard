# Explanation: Architecture Decisions

This document explains the **why** behind OpenDashboard's key architectural decisions. It complements the existing documentation by focusing on the reasoning and trade-offs that shaped the system.

## 1. Why FastAPI + HTMX Instead of an SPA

**Zero JS framework, server-rendered partials, simpler dev loop**

OpenDashboard avoids client-side frameworks entirely. FastAPI serves HTML partials, and HTMX handles all navigation via `hx-get`/`hx-target`/`hx-swap`. This eliminates the need for:

- Build steps (no bundler, no npm, no package.json)
- Client-side routing logic
- State synchronization between server and client
- Complex JavaScript frameworks to learn and maintain

**Vanilla JS <50 lines** (timeline slider and focus mode) keeps the frontend lightweight while still providing interactive features.

**Trade-offs:** No optimistic updates, no client-side state, full page reloads for some flows. However, the simplicity outweighs these limitations for a developer tool that primarily displays read-only data.

**Reference:** See [Architecture Overview](architecture.md) for the route map and [README](README.md) for the tech stack.

## 2. Why Read-Only SQLite with PRAGMA query_only

**Safety guarantee: OpenDashboard never modifies OpenCode's DB**

SQLite with `PRAGMA query_only = 1` ensures OpenDashboard cannot accidentally corrupt OpenCode's database. This provides:

- **No write locks:** Prevents contention with OpenCode's own writes
- **No corruption risk:** Read-only connections cannot corrupt the database
- **No sync issues:** No need to worry about concurrent modifications

SQLite is sufficient for single-user developer tool traffic. The database is local to the user's machine (`~/.local/share/opencode/opencode.db`).

**Cached connection singleton with double-checked locking** (`threading.Lock`) avoids opening repeated connections while maintaining thread safety for FastAPI's async workers.

**Reference:** See [DB Functions](api-reference.md#db-functions) and [Architecture](architecture.md#data-flow).

## 3. Why Recursive CTE for Delegation Chains

**Single round-trip vs N+1 queries for deep delegation trees**

Instead of fetching each parent node individually (N+1 problem), OpenDashboard uses a **recursive CTE** in SQL to traverse the entire delegation chain in a single query. This:

- Returns a flat list sorted by depth + time_created
- Eliminates multiple round-trips to the database
- Leverages SQLite's native recursion for efficient traversal

**Reference:** See [DB Functions](api-reference.md#get_delegation_chain) and [Architecture](architecture.md#data-flow).

## 4. Why Server-Side Tree Building (build_tree)

**Python dict-based node_map algorithm: O(n) time, O(n) space**

The recursive CTE returns a flat list, but the actual tree hierarchy is built in Python using `build_tree()`:

- **Keeps SQL simple:** No JSON/recursive nesting in queries
- **Pydantic models:** Clean transformation from flat to tree structure
- **Template rendering:** Also server-side — no client-side tree construction

This separation of concerns keeps SQL focused on data retrieval while Python handles complex data transformations.

**Reference:** See [Pydantic Models](api-reference.md#pydantic-models) and [Architecture](architecture.md#data-flow).

## 5. Anti-Jitter Layout Strategy

**3-layer defense against layout shift**

OpenDashboard prevents visual jitter during HTMX swaps with a three-layer strategy:

### 5.1 Scrollbar-gutter: stable
```css
html { overflow-y: scroll; scrollbar-gutter: stable; }
```
The scrollbar always occupies space, even when content doesn't require it. Eliminates jumps when content height changes.

### 5.2 Min-width: 0 chain
```css
.layout { grid-template-columns: 280px minmax(0, 1fr); }
#main-content-area, #map-panel { min-width: 0; }
```
Each grid/flex item propagates `min-width: 0` to prevent overflow from expanding the grid beyond its container.

### 5.3 Contain: layout paint style
```css
#main-content-area, #map-panel { contain: layout paint style; }
```
Isolates sub-trees during HTMX swaps, limiting browser recalculations.

**Reference:** See [Anti-Jitter Layout Strategy](architecture.md#anti-jitter-layout-strategy).

## 6. State Detection Heuristics and Limitations

**Running/completed inferred: leaf + latest timestamp = "running"**

OpenCode's database doesn't store explicit state (completed/running/failed). OpenDashboard infers state:

- **Running:** Leaf node (no children) with `time_created == latest_time` in the chain
- **Completed:** All other nodes
- **Failed:** Not detectable (no status column in source DB)

**Heuristic limitation:** A completed leaf that finished last shows as "running". True fix requires upstream OpenCode DB schema change (add status column).

**Reference:** See [State Detection Logic](trace-visualization.md#state-detection-logic).

## 7. Dark Theme Design

**Single unified dark theme (no light/dark toggle)**

OpenDashboard uses a consistent dark theme throughout:

- **CSS custom properties** for token management
- **Grain texture** via `body::before` for subtle atmosphere
- **Agent badge colors** follow a consistent semantic scheme

This eliminates theme switching complexity while providing a cohesive visual experience that matches the trace map's dark aesthetic.

**Reference:** See [Color Coding](trace-visualization.md#color-coding) and [Dark theme as default global](architecture.md#dark-theme-as-default-global).

## Data Flow Architecture

```mermaid
flowchart TD
    A[Browser] --> B[HTMX requests]
    B --> C[FastAPI Routes]
    C --> D[SQLite (read-only)]
    D --> E[db.py queries]
    E --> F[models.py]
    F --> G[Jinja2 templates]
    G --> H[HTML partials]
    H --> A
    
    subgraph "Server Processing"
        D -->|Recursive CTE| E
        E -->|Flat list| F
        F -->|build_tree()| F
        F -->|SessionSummary| C
    end
```

**Key:** Data flows as Python dicts → context Jinja2 → HTML. No JSON serialization or API REST layer. HTMX swaps HTML snippets directly.

## Related Documentation

- [Architecture Overview](architecture.md) — Detailed stack and route map
- [Trace Visualization](trace-visualization.md) — Tree rendering and interaction details
- [API Reference](api-reference.md) — Function and model documentation
- [README](README.md) — Quick start and project structure

## Decision Philosophy

These decisions follow the **KISS principle** (Keep It Simple, Stupid) and **YAGNI** (You Ain't Gonna Need It):

- **Simplicity over complexity:** No unnecessary abstractions or frameworks
- **Single responsibility:** Each component has one clear purpose
- **Safety first:** Read-only database access prevents corruption
- **Performance through simplicity:** Efficient algorithms without over-engineering

The architecture prioritizes reliability and maintainability for a developer tool that needs to be predictable and debuggable.
