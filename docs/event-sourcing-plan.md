# Event Sourcing Plan

## Problem

The current architecture has the server managing game state and sending per-player view snapshots on every mutation. This creates several issues:

1. **Double broadcast**: Every game sends an action message (broadcast) + state messages (per-player). N+1 messages per mutation.
2. **Redundant room messages**: Server sends `player_list`, `host_assigned`, `game_selected`, `game_started`, `game_ended` alongside `room_state`. Client only uses `room_state`.
3. **No reconnection protocol**: If a client misses messages, there's no way to catch up. Client shows stale state silently.
4. **Server does client work**: Server computes per-player views (`getPlayerView()`) which is wasted effort if the client could derive state from actions.
5. **Snapshots are the only mechanism**: No event log exists. State is ephemeral — lost on crash unless explicitly persisted.

## Goals

- Replace per-player view snapshots with an action ledger + client-side state folding
- Keep snapshots as checkpoints for fast reconnection and cold start
- Eliminate the double broadcast pattern (action + state)
- Build a reconnection protocol based on action indices
- Incremental migration: RPS first, then Quiz, then Poker, then remaining games

## Non-Goals

- Rewriting the lobby protocol (lobby stays snapshot-based — it's simple enough)
- Full event sourcing from game start (hybrid model: snapshots + actions)
- Changing the game engine interfaces (`processAction` stays the same)
- Persisting the action ledger across DO hibernations (future enhancement)

## Architecture

### Current flow

```
Client sends action
Server validates (processAction)
Server broadcasts action event to all
Server computes getPlayerView() for each player
Server sends state to each player individually
```

### New flow

```
Client sends action
Server validates (processAction)
Server appends action to ledger with index N
Server broadcasts action + index to all (one message)
Server sends hidden data to specific player (if applicable)
Client folds action into local state
```

### Hybrid model: snapshots + actions

```
Snapshot #0: initial state (dealt cards, player order, etc.)
Actions #1-#9: fold on top of snapshot #0
Snapshot #10: state checkpoint after action #10
Actions #11-#19: fold on top of snapshot #10
```

Client holds: latest snapshot + actions since that snapshot. Current state = fold(actions, snapshot).

### When to snapshot

- **Game start**: Initial state is always a snapshot
- **After significant events**: Round end, hand dealt, book made
- **Periodically**: Every N actions (tuning knob)
- **On sync response**: If client is very far behind, send snapshot instead of many actions

## Protocol

### New message types

```typescript
// Server → All clients (broadcast)
type ActionMessage = {
  type: "{game}:action";
  index: number;        // monotonic, starts at 1
  data: PublicAction;   // game-specific, no hidden info
}

// Server → All clients (broadcast, periodic)
type SnapshotMessage = {
  type: "{game}:snapshot";
  index: number;        // action index this snapshot corresponds to
  data: StateSnapshot;  // full public state
}

// Server → Specific player (private, per action with hidden data)
type HiddenMessage = {
  type: "{game}:hidden";
  index: number;        // matches the action index
  data: HiddenData;     // game-specific private info
}

// Client → Server (reconnect/sync)
type SyncRequest = {
  type: "{game}:sync";
  lastSnapshotIndex: number;
  lastActionIndex: number;
}

// Server → Client (sync response)
type SyncResponse = {
  type: "{game}:sync_response";
  snapshot: { index: number; data: StateSnapshot };
  actions: ActionMessage[];
  hidden: HiddenMessage[];  // only this player's hidden data
}
```

### Room protocol (stays snapshot-based)

The lobby is simple enough that snapshots work fine. No event sourcing needed.

```
// Room messages (unchanged)
type RoomStateMessage = {
  type: "room_state";
  data: {
    players: Player[];
    hostId: string | null;
    phase: "lobby" | "playing" | "hibernated";
    selectedGameType: GameType;
    activeGameType: GameType | null;
    gameSessionId: string | null;
    gameParticipants: GameParticipant[];
  };
}
```

The redundant room messages (`player_list`, `host_assigned`, `game_selected`, `game_started`, `game_ended`) are removed. `room_state` is the single source of truth for room-level state.

## Private Information

Some game actions have hidden data (hole cards, drawn cards, dice rolls). The ledger is public, so hidden data can't be included in the action.

### Pattern: public action + private hidden message

```
Public ledger:  { index: 5, action: "deal", playerId: "alice", cardCount: 2 }
Private to alice: { index: 5, hidden: { cards: ["Ah", "Ks"] } }
```

The client's fold function takes `(state, action, hiddenData?) → newState`. Public state says "Alice has 2 cards". Alice's local state knows which 2. Everyone else sees the count.

### Per-game private info

| Game | Hidden data | When |
|------|------------|------|
| RPS | Choice (rock/paper/scissors) | Player throws |
| Quiz | Answer text | Player submits answer |
| Poker | Hole cards, deck order | Deal, showdown |
| Go Fish | Drawn card | Draw from pile |
| Blackjack | Hole cards, deck order | Deal, hit |
| Yahtzee | Dice roll | Roll |
| Skull | Card identity | Play card |
| Spicy | Card identity | Play card |
| Perudo | Dice values | Roll |
| Cockroach Poker | Card identity | Play/pass |
| Cheese Thief | Role, vote | Assignment, vote |
| Flip 7 | Drawn card | Hit |
| Herd | Secret number | Assignment |
| Fun Facts | Secret fact | Assignment |

### Client-side hidden data storage

```typescript
interface ClientGameState<S, A, H> {
  snapshot: S;                    // latest snapshot
  actions: Array<{ index: number; action: A }>;  // actions since snapshot
  hidden: Map<number, H>;        // index → hidden data (only for this player)
  lastSnapshotIndex: number;
  lastActionIndex: number;

  // Computed
  currentState: S;                // fold(actions, snapshot)
}
```

On receiving action #N:
1. If N > lastActionIndex + 1, request sync
2. Fold action into currentState
3. If hidden message for #N arrives, store in hidden map

On reconnect:
1. Send `{ type: "{game}:sync", lastSnapshotIndex, lastActionIndex }`
2. Receive snapshot + missing actions + missing hidden data
3. Fold actions onto snapshot

## Utility Design

### `createLedger(stateRef, opts)`

Server-side utility. Manages the action log and snapshot creation.

```typescript
interface Ledger<S, A> {
  // Append action, returns index
  append(action: A): number;

  // Get current state (folded from snapshot + actions)
  getCurrentState(): S;

  // Get snapshot at a specific index
  getSnapshot(index: number): { index: number; state: S } | null;

  // Get actions since an index
  getActionsSince(index: number): Array<{ index: number; action: A }>;

  // Create a new snapshot at the current index
  createSnapshot(): void;

  // Get the latest snapshot
  getLatestSnapshot(): { index: number; state: S };
}
```

### `createLedgerClient(foldFn)`

Client-side utility. Manages state folding from actions + snapshot.

```typescript
interface LedgerClient<S, A, H> {
  // Current derived state
  getState(): S;

  // Apply a new action
  applyAction(index: number, action: A): void;

  // Apply hidden data for an action
  applyHidden(index: number, hidden: H): void;

  // Apply a snapshot (resets base)
  applySnapshot(index: number, state: S): void;

  // Check if we're missing actions
  getGap(lastServerIndex: number): { from: number; to: number } | null;

  // Get indices for sync request
  getSyncInfo(): { lastSnapshotIndex: number; lastActionIndex: number };
}
```

### `buildGameLedgerProtocol(gameType, schemas)`

Shared utility for creating the protocol messages for a game.

```typescript
function buildGameLedgerProtocol(config: {
  prefix: string;
  actionSchema: Schema;
  snapshotSchema: Schema;
  hiddenSchema?: Schema;  // optional — some games have no hidden data
}) {
  return {
    actionMessageSchema,    // "{prefix}:action" with index
    snapshotMessageSchema,  // "{prefix}:snapshot" with index
    hiddenMessageSchema,    // "{prefix}:hidden" with index
    syncRequestSchema,      // "{prefix}:sync"
    syncResponseSchema,     // "{prefix}:sync_response"
    encodeAction,
    encodeSnapshot,
    encodeHidden,
    encodeSyncResponse,
    decodeSyncRequest,
  };
}
```

## Implementation Phases

### Phase 1: RPS (zero hidden state)

RPS has no hidden information — choices are revealed simultaneously, and the choice itself is only hidden during the "throwing" phase until both players have thrown. We can treat the choice as hidden data initially, or simplify by not hiding it (since the opponent can't act on it — they've already thrown).

**Option A: No hidden data**
- Player A throws rock → action is `{ index: 1, playerId: "alice", choice: "rock" }`
- Player B can see it, but can't use the info (they've already thrown or must throw independently)
- Simpler, but breaks the game if players haven't both thrown yet

**Option B: Hidden choice**
- Player A throws → action is `{ index: 1, playerId: "alice", threw: true }` (public)
- Hidden to Alice: `{ index: 1, choice: "rock" }` (private)
- When both throw → reveal action with both choices (public)
- More correct, requires hidden data support

**Decision: Option B** — we need to test the hidden data pattern anyway, and RPS is the simplest game to do it with.

#### Files to create/modify

1. `src/game/rps/ledger-protocol.ts` — Protocol messages (action, snapshot, hidden, sync)
2. `src/game/rps/ledger-server.ts` — Server-side ledger + action processing
3. `src/game/rps/ledger-client.ts` — Client-side state folding
4. `src/components/rps/rps-room.tsx` — Update to use ledger client instead of state messages
5. `src/game/rps/schemas.ts` — Add snapshot schema (derive from state schema)
6. `src/game/shared/game-ledger-types.ts` — Shared ledger interfaces

#### Step-by-step

1. **Define action schema** (public):
   ```typescript
   const rpsPublicActionSchema = Schema.Union([
     Schema.Struct({
       type: Schema.Literal("throw_registered"),
       index: Schema.Number,
       playerId: Schema.String,
     }),
     Schema.Struct({
       type: Schema.Literal("throw_revealed"),
       index: Schema.Number,
       player1Choice: rpsChoiceSchema,
       player2Choice: rpsChoiceSchema,
       winnerId: Schema.NullOr(Schema.String),
     }),
     Schema.Struct({
       type: Schema.Literal("round_advanced"),
       index: Schema.Number,
       roundNumber: Schema.Number,
     }),
     Schema.Struct({
       type: Schema.Literal("best_of_changed"),
       index: Schema.Number,
       bestOf: rpsBestOfSchema,
     }),
     Schema.Struct({
       type: Schema.Literal("tournament_over"),
       index: Schema.Number,
       winnerId: Schema.String,
     }),
   ]);
   ```

2. **Define hidden data schema** (private per player):
   ```typescript
   const rpsHiddenDataSchema = Schema.Struct({
     choice: rpsChoiceSchema,
   });
   ```

3. **Define snapshot schema** (public state checkpoint):
   ```typescript
   // Same as RpsState but without hidden choices
   const rpsSnapshotSchema = Schema.Struct({
     players: Schema.Array(rpsPlayerStateSchema),
     bestOf: rpsBestOfSchema,
     rounds: Schema.Array(rpsRoundStateSchema),  // throws visible, pending choices hidden
     currentRound: Schema.Number,
     phase: rpsPhaseSchema,
     winnerId: Schema.NullOr(Schema.String),
     totalRounds: Schema.Number,
   });
   ```

4. **Server-side ledger** (`rps/ledger-server.ts`):
   - Wraps `processAction` from engine
   - Appends each action to the ledger with an index
   - Broadcasts public action + sends hidden data per player
   - Creates snapshots periodically (every round end)

5. **Client-side fold** (`rps/ledger-client.ts`):
   - Receives actions and folds them into local state
   - Stores hidden data in a map (indexed by action index)
   - Exposes `currentState` derived from snapshot + actions

6. **Update room component** (`rps-room.tsx`):
   - Replace `connection.subscribe()` with ledger client
   - State comes from `ledgerClient.getState()` instead of `setView()`
   - Handle sync requests on reconnect

7. **Update adapter** (`rps/adapter.ts`):
   - Remove `sendStateToPlayer` (no more state messages)
   - Add `sendLedgerSync` for reconnection
   - Keep `processMessage` but route through ledger

#### Testing

- Unit test: fold function produces correct state from action sequence
- Unit test: hidden data is correctly scoped per player
- Unit test: sync response contains correct actions since requested index
- Integration test: full game via ledger protocol
- Verify existing `rps.test.ts` still passes with the new architecture

### Phase 2: Quiz (room-level event sourcing)

The quiz is unique — it has no game engine, no server.ts. It's handled entirely at the room level. The room tracks answers and broadcasts `player_answered` messages.

This makes it a good test of the event sourcing pattern at the room level, not the game level.

#### Approach

The quiz's "actions" are answer submissions. The "state" is the list of players and their answers.

```
Action: { index: 1, type: "answer_submitted", playerId: "alice", answer: "42" }
Snapshot: { index: 0, players: [...], answers: {} }
```

Since there's no hidden data in quiz (answers are revealed when submitted), this is simpler than RPS.

#### Files to create/modify

1. `src/game/quiz/ledger-protocol.ts` — Protocol messages
2. `src/game/quiz/ledger-server.ts` — Server-side ledger
3. `src/game/quiz/ledger-client.ts` — Client-side state folding
4. `src/components/sample-quiz-room.tsx` — Update to use ledger
5. `src/routes/room/$roomId/index.tsx` — Update quiz handling in room

#### Note on quiz architecture

The quiz currently works differently from other games:
- No `server.ts` — the room handles answer tracking
- `player_answered` is a room-level message, not a game-level message
- The room's `server()` function manages the answers state

For event sourcing, we have two options:
1. **Keep quiz at room level**: The room's action ledger includes quiz answers. This means the room protocol needs to support event sourcing for quiz-specific actions.
2. **Create a quiz game server**: Move quiz logic into `src/game/quiz/server.ts` like other games. The room delegates to the quiz adapter.

**Decision: Option 2** — create a proper quiz game server. This aligns quiz with the other games and makes the event sourcing pattern uniform.

### Phase 3: Poker (complex hidden state)

Poker has the most complex private information:
- Hole cards (2 per player, hidden from others)
- Deck order (hidden from all)
- Showdown reveals (selective disclosure)

#### Approach

```
Public actions:
  - hand_started: { dealerId, smallBlindId, bigBlindId }
  - blinds_posted: { playerId, amount }
  - player_action: { playerId, actionType, amount? }
  - board_dealt: { cards: [...] }  (community cards are public)
  - showdown: { playerId, cards: [...] }  (revealed at showdown)
  - pot_awarded: { playerId, amount }

Hidden data (per player):
  - deal: { holeCards: [Card, Card] }
  - (no hidden data for bets/checks/folds — those are public)
```

The deck order is never revealed to clients. It's server-only state. Clients don't need to fold deck shuffling — they just see the results (dealt cards, community cards).

#### Files to create/modify

1. `src/game/poker/ledger-protocol.ts` — Protocol messages
2. `src/game/poker/ledger-server.ts` — Server-side ledger
3. `src/game/poker/ledger-client.ts` — Client-side state folding
4. `src/components/poker/poker-room.tsx` — Update to use ledger
5. `src/game/poker/engine.ts` — May need to split public/private actions
6. `src/game/poker/schemas.ts` — Add snapshot and action schemas

#### Special considerations

- **Showdown**: At showdown, hole cards become public. This is a public action that reveals previously hidden data.
- **Spectators**: Spectators see public state but no hidden data. They can't see hole cards (unless in "backwards poker" mode).
- **Event log**: Poker already has an event log (`eventLog`). The ledger replaces this — the event log becomes the ledger itself.
- **Reconnection**: Poker reconnection needs to resend hole cards (hidden data) for the current hand.

### Phase 4: Remaining games

After RPS, Quiz, and Poker, migrate the remaining games:

| Game | Complexity | Hidden data | Notes |
|------|-----------|------------|-------|
| Go Fish | Medium | Drawn card | Already has `lastAction`/`lastResult` in view |
| Blackjack | Medium | Hole cards, deck | Similar to Poker |
| Yahtzee | Low | Dice roll | Simple fold |
| Skull | Medium | Card identity | Similar to Go Fish |
| Spicy | Medium | Card identity | Similar to Skull |
| Perudo | Medium | Dice values | Bid + challenge pattern |
| Cockroach Poker | Low | Card identity | Already has `lastResult` in view |
| Cheese Thief | Medium | Role, vote | Night phase + vote |
| Flip 7 | Low | Drawn card | Simple hit/stay |
| Herd | Low | Secret number | Simple assignment |
| Fun Facts | Low | Secret fact | Simple assignment |

Each game follows the same pattern:
1. Define public action schema
2. Define hidden data schema (if any)
3. Define snapshot schema
4. Create ledger server (wraps existing `processAction`)
5. Create ledger client (folds actions into state)
6. Update room component
7. Update adapter

### Phase 5: Shared utilities and cleanup

1. Extract shared ledger utilities into `src/game/shared/ledger/`
2. Create `createGameLedgerAdapter()` — generates a `GameAdapter` from a ledger config
3. Update `GameAdapter` interface to support ledger mode
4. Remove old `sendStateToPlayer` pattern
5. Remove old action broadcast pattern
6. Remove redundant room messages (already done in #3 fix)
7. Update `ws.ts` to support sync requests

## Relationship to Existing Code

### GameAdapter interface

The `GameAdapter` interface currently has:
- `processMessage(msg, broadcast, sendTo)` — processes a client message
- `sendStateToPlayer(playerId, sendTo)` — sends current state to one player
- `initGame(players, hostId, broadcast, sendTo)` — initializes game
- `removePlayer(playerId, broadcast, sendTo)` — removes a player
- `endGame(broadcast, sendTo)` — ends the game

With event sourcing:
- `processMessage` stays but now appends to ledger instead of sending state
- `sendStateToPlayer` is replaced by `sendLedgerSync(playerId, fromIndex, sendTo)`
- `initGame` creates the initial snapshot
- `removePlayer` appends a "player_removed" action
- `endGame` appends a "game_ended" action

### Game engines

The game engines (`processAction`) don't change. They still take `(state, action) → result` and mutate state in place. The ledger wraps them — it calls `processAction` and records the action.

### Client components

Client components change from:
```tsx
// Current: receive state from server
const [view, setView] = createSignal(null);
connection.subscribe((event) => {
  if (event.type === "rps:state") setView(event.data);
});
```

To:
```tsx
// New: fold actions into local state
const ledger = createLedgerClient(rpsFold);
connection.subscribe((event) => {
  if (event.type === "rps:action") ledger.applyAction(event.index, event.data);
  if (event.type === "rps:hidden") ledger.applyHidden(event.index, event.data);
  if (event.type === "rps:snapshot") ledger.applySnapshot(event.index, event.data);
});
const view = () => ledger.getState();
```

## Open Questions

~~1. **Snapshot frequency**: Every N actions? Every round? Configurable per game?~~
~~2. **Ledger storage**: In-memory only (lost on DO restart) or persisted to SQLite?~~
~~3. **Sync response size**: Cap on number of actions in a sync response? If too many, send snapshot instead.~~
~~4. **Backwards compatibility**: Can we run old and new protocol simultaneously during migration?~~
~~5. **DO hibernation**: How does the ledger survive hibernation? Snapshot + recent actions in SQLite?~~

All resolved — see ADR and Grill Session Notes below.

## Grill Session Notes (2026-05-30)

### Key clarifications from review

1. **Snapshots are server-side checkpoints, not client state.** The server folds state itself and creates snapshots at natural breakpoints (round end, deal, etc.). Clients reconcile by resetting to the latest snapshot + folding actions on top. Snapshots are an optimization, not a second source of truth.

2. **The real win is eliminating per-player view computation.** The server currently computes `getPlayerView()` for every player on every mutation. With the ledger, the server broadcasts public events + sends hidden data to specific players, and each client folds their own view. This is genuine server simplification — not just a protocol optimization.

3. **Hidden data is a first-class schema concern.** Hidden data isn't bolted on — it's part of the schema from the start. The fold function takes `(state, event, hidden?) → newState`. If hidden data is lost or out of order, the client requests a full reconcile from the last snapshot.

4. **The engine adapts fold logic.** The engine's fold logic is the single source of truth. Both server and client use the same fold. This means the engine can't just mutate state in place — the fold has to be a pure function that both sides can call.

5. **The ledger IS the state.** Current state is derived by folding events since the last snapshot onto that snapshot. The engine produces events, the ledger stores them. Snapshots are checkpoints where the server knows all data is in place (e.g., after a round ends, after dealing completes).

6. **The server isn't a dumb ledger.** The server still needs intelligence — it decides what events to broadcast, when to snapshot, and how to handle hidden data routing. The simplification is in not computing per-player views, not in removing server logic entirely.

### Resolved decisions

1. **Terminology**: Action = player intent. Event = ledger entry. Fold = derive state from snapshot + events. Snapshot = checkpoint in the ledger.
2. **Engine is the umbrella**: Replaces `server.ts`. Owns ledger, fold, dispatcher, snapshot management. All games implement `GameEngine` interface.
3. **`engine.ts` split into 3**: `mechanics.ts` (evaluation helpers), `reduce.ts` (shared state transitions), `fold.ts` (fold orchestrator, same on server and client, parameterized by hidden data).
4. **`GameAdapter` goes away**: Engine fulfills the room's contract directly.
5. **Dispatcher is a shared configurable utility**: Takes prefix + schemas, broadcasts events, sends hidden data. Doesn't touch ledger.
6. **`processAction` is pure**: Returns `{ newState, events, hiddenData? }`. No mutation.
7. **Snapshots are game-specific, event-driven**: Each game defines when to create snapshots. No periodic timer.
8. **Hibernation deferred**: Ledger stays in memory. DO restart resets to last snapshot.
9. **Migration via sync**: Old games implement `sync` as full state dump. New games return snapshot + events + hidden. Client reconciles same way either way.
10. **Sync response size naturally bounded**: Snapshot frequency limits sync response. No extra cap needed.
11. **Property-based testing on `mechanics.ts`**: `fast-check` for scoring, hand evaluation, legal moves. Unit tests on `reduce.ts` and `fold.ts`.
12. **RPS first**: Tests full pipeline — events, hidden dispatch, fold with hidden data, sync.
