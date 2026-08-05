# Tutorial: Getting Started with OpenDashboard

**Audience:** Newcomers who want to install, run, and explore OpenDashboard for the first time.

**What you'll learn:**
1. What OpenDashboard is and what it shows
2. How to install and run it
3. How to navigate the dashboard UI
4. How to read the delegation tree
5. How to use the timeline slider
6. How to use focus mode

**Time to complete:** ~10 minutes

---

## Prerequisites

Before you begin, make sure you have:

- **Python 3.12 or later** installed. Check with:
  ```bash
  python --version
  ```

- **UV** installed (modern Python package manager):
  ```bash
  uv --version
  ```

- **OpenCode** run at least once. OpenDashboard reads the OpenCode SQLite database located at:
  ```
  ~/.local/share/opencode/opencode.db
  ```
  If you've never run OpenCode, this file doesn't exist and OpenDashboard will show an error.

---

## Step 1: Install OpenDashboard

Clone the repository and install dependencies:

```bash
git clone <repository-url> opendashboard
cd opendashboard
uv sync
```

This creates a virtual environment (`.venv/`) and installs all dependencies:
- `fastapi` — Web framework
- `jinja2` — Template engine
- `uvicorn[standard]` — ASGI server
- `aiosqlite` — Async SQLite (reserved for future use)

---

## Step 2: Run the Application

Start the development server:

```bash
uv run opendashboard
```

You should see:
```
OpenDashboard starting at http://127.0.0.1:8080
DB: /home/youruser/.local/share/opencode/opencode.db
```

Open your browser to **http://127.0.0.1:8080**.

> **If you see "OpenCode database not found":** Make sure you've run OpenCode at least once to generate the database. The first time OpenCode runs, it creates `~/.local/share/opencode/opencode.db` automatically.

---

## Step 3: Explore the Dashboard

When the page loads, you'll see a two-column layout:

```
┌──────────────────────────────────────────────────┐
│  OpenDashboard — Agent delegation visualizer      │
├──────────────┬───────────────────────────────────┤
│  Sidebar     │  Main Panel (trace map)           │
│  280px       │                                   │
│              │  Session metadata:                 │
│  Stats:      │  ├ Title / Agent / ID / Cost      │
│  Sessions    │  ├ Tokens / Created               │
│  Cost        │                                   │
│  Tokens      │  Summary chips:                    │
│  Agents      │  Tasks  Cost  Tokens  Duration    │
│              │                                   │
│  ──────────  │  Timeline ●────────────────       │
│  Root        │                                   │
│  Sessions    │  Delegation Tree                   │
│  ─ list ─    │  ├ orchestrator                   │
│  • agent1    │  │  ├ explorer                    │
│  • agent2    │  │  │  ├ librarian                │
│  • agent3    │  │  │  └ fixer                    │
│              │  └ ...                            │
└──────────────┴───────────────────────────────────┘
```

### Sidebar (left, 280px)

The sidebar shows two sections:

**Dashboard Stats** — at the top, aggregate numbers across all sessions:
- **Sessions** — total number of sessions in the database
- **Cost** — total accumulated cost across all sessions
- **Tokens** — total input + output tokens
- **Agents** — number of distinct agent types

**Root Sessions** — below the stats, a scrollable list of top-level sessions (those with no parent). Each entry shows:
- The agent badge (color-coded)
- The session title (truncated)
- Relative time (e.g., "2h ago")

Click any root session to load its delegation tree in the main panel.

### Main Panel (right, flexible)

The main panel has three sections:

1. **Session metadata grid** — Shows the session ID, agent, model, title, cost, token counts, and creation time.
2. **Summary chips** — Quick stats: total tasks, cost, tokens, completed/running count, and duration.
3. **Delegation tree** — The interactive LangGraph-style tree (see Step 4).

> The first root session is pre-loaded automatically so you never see an empty main panel.

---

## Step 4: Understand the Delegation Tree

The delegation tree visualizes how OpenCode agents delegate tasks to each other. Each node represents a single agent call within a session.

### Node Anatomy

```
┌─────────────────────────────────────────────┐
│  ▶  [orchestrator]  Implement login flow   │
│     ● Running          14:32               │
├─────────────────────────────────────────────┤
│  (expanded view)                            │
│  ID: sess_abc123                            │
│  Model: claude-3-opus                       │
│  Tokens: in 1,234 · out 567                │
│  Reasoning: 89 · Cache R: 0 · Cache W: 0  │
│  Cost: $0.042                              │
│  Created: 2026-07-04 14:32                 │
│  Depth: 0                                  │
└─────────────────────────────────────────────┘
```

Each node displays:

| Element | Description |
|---------|-------------|
| **Expand arrow** (`▶` / `▼`) | Opens/closes the detail panel |
| **Agent badge** | Color-coded by agent type (see [color table](#agent-badge-colors)) |
| **Title** | Truncated to 60 characters |
| **State badge** | "Running" (amber, pulsing) or "Completed" (green) |
| **Timestamp** | When the session was created |

### Tree Structure

The tree shows parent-child relationships through visual elbow connectors:

```
orchestrator  ← root node (always open)
├── explorer  ← child, completed
│   ├── librarian
│   └── fixer
├── fixer     ← another child
│   └── documenter
└── oracle    ← leaf = deepest level
```

- Lines connect parent to children
- Indentation increases with depth
- `▶` collapsed nodes can be expanded to show their children
- The root node starts expanded

### Agent Badge Colors

| Agent | Badge Color | Text Color |
|-------|-------------|------------|
| orchestrator | `#3a3a5a` | `#d0d0e8` |
| explorer | `#1e3a6a` | `#60a5fa` |
| fixer | `#1a3a2a` | `#4ade80` |
| librarian | `#3a3a1a` | `#facc15` |
| oracle | `#2a1a3a` | `#c084fc` |
| designer | `#3a1a2a` | `#f472b6` |
| documenter | `#1a2a3a` | `#22d3ee` |
| validator | `#1a2a1a` | `#4ade80` |
| observer | `#2a2a2a` | `#a8a29e` |
| council | `#3a1a1a` | `#f87171` |

### State Detection

OpenDashboard uses a heuristic to determine node state:
- **Running** — A leaf node (no children) whose `time_created` equals the latest timestamp in the chain
- **Completed** — Every other node

> **Note:** This is a heuristic. If a completed leaf happens to be the last to finish, it will briefly show as "running." True state detection requires a `status` column in the OpenCode database.

### Expand Details

Click the `▶` arrow on any node header to see its detail panel with: session ID, model name, token breakdown (input, output, reasoning, cache reads/writes), cost, creation timestamp, and depth level.

---

## Step 5: Use the Timeline Slider

The timeline slider sits above the delegation tree and lets you "play back" the delegation sequence chronologically.

```
[earliest] ●──────────────────────────── [latest]
              ↑ drag to filter
```

### How it works

1. The slider range spans from the earliest to the latest `time_created` in the chain
2. Drag the thumb to set a **cutoff time**
3. All nodes created **after** the cutoff are hidden
4. The fill bar updates to show the proportion visible
5. A **delta label** shows the relative time from earliest (e.g., `+5m`, `+2h 15m`)

### Try it

1. Drag the slider all the way to the left — all nodes are visible
2. Drag it right slowly — nodes disappear one by one as they're filtered out
3. Watch the delta label update to show elapsed time

This is useful for understanding the order of delegation: which agent ran first, which ran in parallel, and which ran last.

> The timeline re-initializes automatically when you click a new session in the sidebar (HTMX `afterSwap` event).

---

## Step 6: Use Focus Mode

Focus mode helps you concentrate on a specific branch of a deep delegation tree.

### Activate Focus Mode

1. **Expand** any node in the tree by clicking its `▶` arrow
2. The tree automatically enters **focus mode**:

   ```
   ⬤ dim      orchestrator
   ⬤ dim      ├── explorer
   ⬤ HIGHLIGHT│   ├── librarian  ← expanded
   ⬤ HIGHLIGHT│   └── fixer      ← descendant
   ⬤ dim      └── oracle
   ```

   - The expanded node and all its descendants stay at **100% opacity**
   - Everything else dims to **35% opacity**

3. **Collapse** the expanded node (click `▼` arrow) to exit focus mode and restore full visibility

### Why use it

In sessions with 10+ delegation levels, focus mode makes it easy to trace a single branch without visual noise from unrelated branches.

---

## Next Steps

Now that you've explored the basics:

- **Read the [Architecture deep-dive](architecture.md)** to understand the stack, route map, and data flow
- **Read [Trace Visualization Details](trace-visualization.md)** for the complete tree rendering system
- **Follow the [How-to Guide: Add a New Route](howto-add-route.md)** if you want to extend the dashboard
- **Check the [API Reference](api-reference.md)** for complete function and route documentation

---

## Troubleshooting

| Problem | Likely Cause | Solution |
|---------|-------------|----------|
| "Database not found" | OpenCode never run | Run `opencode` at least once |
| Empty sidebar | No sessions in DB | Check OpenCode has produced output |
| All nodes show "Completed" | No leaf matches latest heuristic | Normal — this is the common case |
| Timeline slider doesn't appear | No session selected | Click a root session in sidebar |
| CSS looks broken | Browser caching old styles | Hard reload (Ctrl+Shift+R) |
