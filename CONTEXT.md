# Party Game Platform

A casual multiplayer party game platform where players join rooms, select games, and play together in real-time via WebSockets.

## Language

### Room Layer

**Room**:
A Durable Object instance that hosts a game session. Top-level container for players and game state.
_Avoid_: Lobby, session, instance

**Player**:
A person in a room. Identified by `PlayerId`. Has a display name, no account required.
_Avoid_: User, client, member

**Host**:
The player who created the room. Controls game selection, start, and end.
_Avoid_: Owner, admin, creator

**RoomPhase**:
Lifecycle stage of a room: `"lobby"`, `"playing"`, `"hibernated"`.
_Avoid_: State, stage, status (for room lifecycle)

### Game Layer

**Action**:
A player intent sent from client to server. What a player *wants* to do. Examples: throw rock, bid 3, draw a card.
_Avoid_: Move, command, input

**Event**:
Something that happened in the game. Recorded in the ledger. Examples: throw registered, round advanced, card dealt.
_Avoid_: Action (for ledger entries), message, result

**State**:
The full internal game representation. Includes all data, even hidden information. Lives on the server.
_Avoid_: Data, model, context (for game data)

**View**:
The per-player filtered state visible to a specific player. Derived from state by removing hidden information.
_Avoid_: Snapshot, perspective, display

**Engine**:
The umbrella system that manages a game's full lifecycle. Owns the ledger, snapshot management, server-side folding, and hidden data dispatch. Composed of smaller parts: game logic, ledger, fold, dispatcher. Fulfills the room's contract directly — no separate adapter. All games implement the same `GameEngine` interface.
_Avoid_: Logic, processor, handler

**Game Logic**:
Pure rule functions: `initGame`, `processAction`, `removePlayer`. Returns `{ newState, events, hiddenData? }` — no mutation. Split into three files per game: `mechanics.ts`, `reduce.ts`, `fold.ts`.
_Avoid_: Engine (for just the rules), processor, handler

**Mechanics** (`mechanics.ts`):
Game-specific evaluation helpers: `evaluateHand`, `calculateScore`, `getLegalActions`. The game's internal math. Used by transitions and validation, not by the fold directly.
_Avoid_: Rules, helpers, utils

**Reduce** (`reduce.ts`):
Shared state transition logic: `(state, event) → newState`. The common core that both server and client fold call into. Game-specific — each game defines how events update state.
_Avoid_: Apply, mutate, transition

**Fold** (`fold.ts`):
The fold orchestrator. Wraps `reduce` + handles hidden data. Same file on server and client — parameterized by available hidden data. Server has all, client has only its own.
_Avoid_: Apply, reduce (fold is the orchestrator, reduce is the shared core)

**Server** (deprecated):
Was the adapter bridging room and engine. Renamed to Engine. `server.ts` → `engine.ts`.
_Avoid_: Use Engine instead

### Event Sourcing Layer

**Ledger**:
The ordered sequence of events for a game. In-memory only (for now). The source of truth for current state.
_Avoid_: Log, journal, history

**Snapshot**:
A checkpoint in the ledger where the server has computed full state. Used for fast reconnection and cold start. Also used for persistence (same concept — a saved point-in-time state). Created at game-specific natural breakpoints (round end, hand dealt, phase change) — each game defines when.
_Avoid_: Checkpoint, save, persist (use "snapshot" for both)

**Fold**:
Deriving current state by applying events on top of the last snapshot. `currentState = fold(events_since_snapshot, snapshot)`. Both server and client fold using the same logic from the engine.
_Avoid_: Apply, reduce, replay

**Hidden Data**:
Private per-player information that can't be in the public ledger. Sent only to the relevant player. First-class schema concern, not bolted on.
_Avoid_: Secret, private, privileged

**Reconcile**:
When a client detects missing events or lost hidden data, it requests a full sync from the server starting from the last snapshot.
_Avoid_: Resync, catchup, refresh

**Dispatcher**:
Shared utility that routes events and hidden data to clients. Configurable — takes a message prefix and schema definitions, broadcasts events to all, sends hidden data to specific players. Does not touch the ledger.
_Avoid_: Sender, router, broadcaster

### Wire Layer

**MessagePrefix**:
String like `"poker:"`, `"rps:"` used to route messages to the correct game adapter.
_Avoid_: Namespace, channel, topic

**GameConnection**:
Client-side interface providing `view`, `send`, and `subscribe` for a game. Typed per game. Will change with event sourcing — `view` becomes derived from fold, `subscribe` handles events instead of state snapshots.
_Avoid_: Socket, channel, link

### Persistence Layer

**PersistedGameSnapshot**:
Serialized game state saved to DO SQL. The persistence artifact.
_Avoid_: Save, backup, stored state

## Example Dialogue

> **Dev**: When Alice throws rock, the engine produces an event `throw_registered`. The server appends it to the ledger and broadcasts it to all clients. Alice also gets hidden data `{ choice: "rock" }`.
>
> **Other dev**: So the ledger only has the public event, and Alice's client folds the hidden data on top?
>
> **Dev**: Right. The fold function takes `(state, event, hidden?) → newState`. Everyone sees "Alice threw". Only Alice knows what she threw. When both throw, a `throw_revealed` event broadcasts both choices.
>
> **Other dev**: What about reconnection?
>
> **Dev**: Client sends `sync` with its last snapshot index and last event index. Server responds with the snapshot + missing events + missing hidden data. Client folds from there.
