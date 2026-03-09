# Pulse — Design Principles

## Core philosophy: zero-instruction UI

Pulse is built for data professionals who understand their domain. The interface should feel immediately obvious — not because it explains itself, but because it behaves exactly as you'd expect.

**If something requires a tooltip or label to be understood, it's a design problem, not a documentation problem.**

---

## Principles

### 1. Obvious over explained
Interactive elements work without instruction. Clickable things look clickable. Sortable columns respond to a click without a hover tooltip saying "click to sort". Collapsible sections open and close — the arrow tells you which way it goes.

### 2. Minimal surface, maximum signal
Every element on screen earns its place. Status is communicated with color and shape, not verbose descriptions. Numbers speak louder than labels when context is clear. White space is not empty — it's structure.

### 3. Consistent mental model
The same action always produces the same result. Navigation reflects how data is actually organized (workspace → model → runs/issues). Nothing is renamed or restructured mid-flow.

### 4. Show what happened, not what could happen
Pulse surfaces facts: what failed, when, what the likely cause is. It does not predict, warn preemptively, or add badges for hypothetical states. Active issues are shown because they exist, not as a call to action.

### 5. History is always accessible
Resolved incidents and past runs are never deleted or hidden behind a separate flow. The default view shows what matters now; the full record is one scroll away.

### 6. Auto over manual
Pulse closes issues automatically when the underlying condition is resolved. No manual "resolve" button. No stale open incidents. The system is the source of truth — not the user's administrative action.

### 7. Context without clutter
Workspace, model, and run information are shown where they're needed — in the same view, not behind a modal or secondary page. But only the fields that matter in that context are shown.

---

## Applied examples

| Situation | Right approach | Wrong approach |
|---|---|---|
| Collapsible section | Arrow indicator (▾/▸) | "Click to expand" label |
| Sortable column | Click header, arrow appears | "Sort" button or tooltip |
| Resolved incident | Dimmed row with timestamp | Separate "history" page |
| Workspace context | Column in the same table | Drill-down click required |
| Auto-resolved issue | Disappears from active, appears in resolved | Stays open until user clicks "Resolve" |
