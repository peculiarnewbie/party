# Event Sourcing Architecture

We're replacing per-player view snapshots with an action ledger + client-side state folding. The server broadcasts public events and dispatches hidden data to specific players. Clients fold events into their own state. This eliminates the N+1 message pattern and removes per-player view computation from the server.

## Key Decisions

### Terminology

- **Action**: player intent (client → server). Existing `XxxAction` types stay.
- **Event**: something that happened (server → clients). Ledger entries. New concept.
- **Ledger**: ordered sequence of events. In-memory only for now. Source of truth for current state.
- **Fold**: deriving current state from snapshot + events. `fold.ts` wraps `reduce.ts` + handles hidden data.
- **Snapshot**: checkpoint in the ledger. Created at game-specific natural breakpoints, not on a timer.

### Engine Architecture

The Engine is the umbrella system for a game. Replaces the old `server.ts` (adapter) pattern. Owns ledger, fold, dispatcher, snapshot management, and game lifecycle.

Per-game files:
- `engine.ts` — the Engine. Entry point the room calls. Orchestrates everything. Replaces `server.ts`.
- `mechanics.ts` — pure evaluation helpers (scoring, legal moves, hand evaluation). Extracted from old `engine.ts`.
- `reduce.ts` — shared state transition logic: `(state, event) → newState`. Both server and client fold call this.
- `fold.ts` — fold orchestrator. Same file on server and client, parameterized by available hidden data. Server has all hidden data, client has only its own.

The old `GameAdapter` interface goes away. The Engine fulfills the room's contract directly.

### Dispatcher

Shared configurable utility. Takes a message prefix and schema definitions. Broadcasts events to all clients, sends hidden data to specific players. Does not touch the ledger.

### Client-Side

`GameConnection` stays generic — it delivers events, doesn't know about folds. The room component creates the game-specific fold and wires it to the connection:

```ts
const fold = createRpsFold();
connection.subscribe((event) => {
  if (event.type === "rps:event") fold.applyEvent(event.index, event.data);
  if (event.type === "rps:hidden") fold.applyHidden(event.index, event.data);
  if (event.type === "rps:snapshot") fold.applySnapshot(event.index, event.data);
});
const view = () => fold.getState();
```

### Hidden Data

First-class schema concern. Public events go to the ledger + broadcast. Hidden data goes only to the relevant player. Fold function takes `(state, event, hidden?) → newState`. Client reconciles if hidden data is missing.

### Snapshots

Game-specific, event-driven. Each game's Engine defines when to create snapshots (round end, hand dealt, phase change). No periodic timer. The room also persists snapshots to DO SQL for cold start.

### Hibernation

Deferred. Ledger stays in memory. If the DO restarts, game resets to last snapshot. Future: persist ledger entries to SQLite for async games.

### Engine is Pure

`processAction` becomes pure: `(state, action) → { newState, events, hiddenData? }`. No mutation. The fold function (from `reduce.ts`) handles state transitions.

### GameEngine Interface

All games implement a shared `GameEngine` interface. The room calls this directly — no separate adapter.

```ts
interface GameEngine {
  initGame(players: Player[], hostId: string | null): void;
  processMessage(msg: string): void;
  removePlayer(playerId: string): void;
  endGame(): void;
  sync(playerId: string, lastSnapshotIndex: number, lastEventIndex: number): SyncResponse;
}
```

Old games (not yet migrated) implement `sync` by returning a full state snapshot wrapped in `SyncResponse`. New games return the actual snapshot + missing events + missing hidden data. The client reconciles the same way either way.

### Migration Path

The room doesn't care which pattern a game uses. It calls the same `GameEngine` interface. Old games implement `sync` as a full state dump. New games implement it as a ledger response. No room code changes needed during migration.

### Testing

Start with the fold — it's the core. Unit test each game's fold:
1. Given snapshot + events → correct current state
2. Given snapshot + events + hidden data → correct state with private info
3. Gap detection works correctly
4. Sync response produces correct state

Existing game logic tests (`rps.test.ts`, etc.) stay — they test `mechanics.ts`.

Property-based testing with `fast-check` on `mechanics.ts` — the pure evaluation helpers (scoring, hand evaluation, legal moves). These are the hot paths that benefit from random inputs. Properties like:
- `evaluateHand(cards)` is commutative (order doesn't matter)
- `calculateScore(dice, category)` is always non-negative
- `getLegalActions(state, playerId)` never returns actions that `processAction` would reject

Add `fast-check` as a dev dependency. Create shared test helpers for generating random game state. Games that need it opt in.
