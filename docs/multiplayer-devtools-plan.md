# Multiplayer DevTools Plan

## Overview

Add a development-only Multiplayer DevTools interface to live room pages. It
will let one browser tab create and control several real players, keep every
player connected, and switch the rendered game between their views.

The tool must exercise the production room architecture:

- Real player IDs
- Real WebSocket connections
- The real room Durable Object
- Real room and game actions
- Real game engines and persistence
- Real per-player views and hidden data

Nothing in the live room is mocked. The only simulation is that one browser tab
owns several otherwise-normal player sessions.

This plan also records games that currently depend on component-owned gameplay
state. Those games must be fixed rather than accommodated with DevTools-specific
workarounds.

## Goals

- Test multiplayer games without opening and arranging several browser tabs
- Add, remove, rename, connect, and disconnect development players
- Switch player view instantly without disconnecting inactive players
- Preserve private views such as hands, dice, roles, and submitted answers
- Exercise real room presence, reconnection, transport, and game behavior
- Make multiplayer state and transport behavior easier to inspect
- Keep the feature absent from production
- Expose architectural problems where a game cannot reconstruct its current
  player view from the server

## Non-Goals

- Mocking the room, game engine, WebSocket transport, or persistence
- Replacing unit tests, fixtures, worker tests, or browser E2E tests
- Adding privileged server APIs for fake players
- Letting developers mutate internal game state directly
- Preserving unsent UI drafts when switching players
- Hiding game architecture problems behind DevTools state

## Core Principle: Real Players, One Browser

Every development player is a real anonymous player from the server's
perspective.

```text
Browser tab
└── RoomClientPool
    ├── Alice RoomClient ── WebSocket ──┐
    ├── Bob RoomClient ──── WebSocket ──┼── Room Durable Object
    ├── Cara RoomClient ─── WebSocket ──┤
    └── Dave RoomClient ─── WebSocket ──┘
```

Each `RoomClient` has:

- A stable player ID
- A display name
- Its own WebSocket
- Its own connection status
- Its latest room state
- Its current game connection
- Its latest player-specific game view
- Its own hidden data and reconciliation cursor when required by the game

Selecting a player only changes which `RoomClient` the UI renders and uses for
actions. It does not change or close any other player's connection.

## Server Authority Requirement

Gameplay state must never depend on a particular game component remaining
mounted.

This does not prohibit client-side folding. The event-sourcing architecture may
derive a player view locally from a server-provided snapshot, ordered events,
and player-specific hidden data. However:

- The server remains authoritative.
- The client projection must live with the player session, not a mounted game
  component.
- A newly created projection must be able to request reconciliation.
- Reconciliation must restore the complete current player view.
- Missing events or hidden data must be detected.
- UI-only state must not determine whether an action is legal or already
  completed.

Both of these models are compatible:

1. The server sends a complete player view after each transition.
2. The server sends snapshots, events, and hidden data from which the client
   deterministically reconstructs the complete player view.

The unacceptable model is gameplay state that exists only in transient
component signals or only in events previously observed by that mounted
component.

## User Experience

### Visual Direction

The DevTools should look separate from every game's visual design. Use a dense,
industrial debugging-console style based on the existing fixture island:

- Graphite and black surfaces
- Off-white text
- Green connected indicators
- Amber warning indicators
- Red error and disconnected indicators
- Monospaced labels and values
- Compact spacing and high information density

It should feel like instrumentation, not part of the game.

### Collapsed Dock

```text
┌──────────────────────────────────────────────────────────────┐
│ ● 4/4 connected   ROOM XKCD   Poker   Viewing: Alice      ▴ │
└──────────────────────────────────────────────────────────────┘
```

The collapsed dock shows:

- Connected socket count
- Room code
- Active or selected game
- Current player view
- Expand control

### Expanded Panel

```text
┌ MULTIPLAYER DEVTOOLS ─────────────────────────────────────────────┐
│ ROOM XKCD   PLAYING · POKER   SESSION a82f…   4 sockets      ─  × │
├────────────────────────────────────────────────────────────────────┤
│ Players │ Events │ Room                                            │
├────────────────────────────────────────────────────────────────────┤
│  ●  Alice       HOST · ACTIVE             VIEWING           ⋯     │
│  ●  Bob         ACTIVE · YOUR TURN        Switch            ⋯     │
│  ●  Cara        ACTIVE                    Switch            ⋯     │
│  ○  Dave        DISCONNECTED              Switch         Reconnect │
│                                                                    │
│  + Add player       + Add 4       Fill game       Disconnect all  │
├────────────────────────────────────────────────────────────────────┤
│  , previous player   . next player   ⇧M toggle   Esc collapse      │
└────────────────────────────────────────────────────────────────────┘
```

## Player Operations

### Switch Player

Switching changes:

- The player ID used by room and game UI
- Host calculations
- Participant status calculations
- The active game connection
- The player-specific view
- The socket used for subsequent actions

Switching does not:

- Disconnect any player
- Send a room or game action
- Change the normal browser identity cookie
- Reconnect a healthy socket

### Add Player

Adding a development player:

1. Generates a stable ID with `nanoid(10)`.
2. Assigns a generated or entered display name.
3. Creates a dedicated `RoomClient`.
4. Opens a WebSocket.
5. Identifies the player.
6. Joins the room when appropriate.

Suggested bulk operations:

- Add 2 players
- Add 4 players
- Fill minimum for the selected game
- Fill game to its configured maximum

Games with no maximum should require an explicit player count rather than
creating an unbounded roster.

### Manage Player

Each player menu should expose distinct operations:

- Switch view
- Rename
- Disconnect socket
- Reconnect socket
- Leave game
- Leave room
- Remove from DevTools

These operations must remain separate because they have different room and game
semantics.

The original browser player may be protected from deletion, but it can still be
disconnected for testing.

## DevTools Sections

### Players

Required for the first release.

Each row should show:

- Player name
- Abbreviated player ID
- Browser or development-player origin
- Host status
- Room membership
- Game participant status
- Connection status
- Current player view
- Current-turn status when exposed by the game view

### Events

Planned after the initial player switcher.

Maintain a bounded client-side log of real incoming and outgoing messages:

```text
12:41:03.214  ← poker:state       Bob       1.8 KB
12:41:04.002  → poker:act         Bob       call
12:41:04.018  ← poker:state       Alice     1.9 KB
```

Features:

- Filter by player
- Filter incoming or outgoing
- Filter by message prefix
- Pause capture
- Clear the log
- Inspect decoded payloads
- Retain the latest 500 entries

### Room

Planned after the initial player switcher.

Show:

- Room ID
- Room phase
- Selected game
- Active game
- Host
- Game session ID
- Room player list
- Game participant statuses
- Socket counts
- Raw room state
- Invite URL

### Network Controls

Later extension:

- Add artificial latency
- Pause incoming messages
- Drop the next incoming message
- Duplicate the next outgoing message
- Force disconnect
- Reconnect

These controls manipulate real client transport behavior. They do not replace
the real transport.

## Keyboard Controls

Outside input, textarea, and editable elements:

- `,`: previous player
- `.`: next player
- `Ctrl/Command + Shift + M`: toggle DevTools
- `Escape`: collapse the panel
- Arrow keys: navigate player rows
- `Enter`: select the focused player

This matches the existing fixture viewer's player-cycling shortcuts.

## Client Architecture

### RoomTransport

Extract WebSocket handling behind a transport interface:

```ts
type ConnectionStatus =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected"
    | "error";

interface RoomTransport {
    status: Accessor<ConnectionStatus>;
    send(message: unknown): void;
    subscribe(handler: (message: unknown) => void): () => void;
    latest(type: string): unknown | null;
    connect(): void;
    disconnect(): void;
    dispose(): void;
}
```

The concrete WebSocket transport should:

- Parse incoming JSON once
- Publish decoded messages to subscribers
- Cache replayable state messages
- Track connection state
- Support explicit disconnect and reconnect
- Clean up listeners and sockets
- Detect malformed messages without crashing the room UI

Caching only the most recent message by type is sufficient for snapshot-based
games. Event-sourced games must instead keep their projection and ledger cursor
inside the `RoomClient`.

### RoomClient

```ts
interface DevPlayerIdentity {
    id: string;
    name: string;
    origin: "browser" | "simulated";
}

interface RoomClient {
    identity: Accessor<DevPlayerIdentity>;
    transport: RoomTransport;
    status: Accessor<ConnectionStatus>;
    roomState: Accessor<RoomStatePayload | null>;
    sendRoomMessage(
        type: MessageType,
        data?: Record<string, unknown>,
    ): void;
    getGameConnection<T>(
        descriptor: GameClientDescriptor<T>,
    ): GameConnection<T>;
    rename(name: string): void;
    connect(): void;
    disconnect(): void;
    dispose(): void;
}
```

The client owns any long-lived player projection required by event-sourced
games. The rendered component consumes the projection but does not own it.

### RoomClientPool

```ts
interface RoomClientPool {
    clients: Accessor<readonly RoomClient[]>;
    activeClient: Accessor<RoomClient>;
    setActivePlayer(playerId: string): void;
    addPlayer(name?: string): RoomClient;
    removePlayer(playerId: string): void;
    dispose(): void;
}
```

The pool:

- Creates and disposes player clients
- Keeps inactive players connected
- Selects the rendered player
- Restores development players after reload
- Prevents accidental duplicate IDs
- Separates normal browser identity from development identities

### Game Connections

`createGameConnection` currently binds directly to a `WebSocket`. Change it to
consume `RoomTransport` or a game-specific projection owned by `RoomClient`.

Snapshot-based game connections should:

- Read the cached latest player view immediately
- Subscribe to subsequent state and side-event messages
- Send actions through the owning player's transport

Event-sourced game connections should:

- Retain the projection while the game UI is unmounted
- Reconcile missing state through the server
- Expose the derived player view to the UI

### Game Descriptor Registry

The room route currently repeats each game's prefix and schemas. Introduce a
registry:

```ts
interface GameClientDescriptor<View> {
    messagePrefix: string;
    stateType?: string;
    playerViewSchema?: Schema.Top;
    serverMessageSchema: Schema.Top;
    projection?: GameProjectionFactory<View>;
}
```

This registry should describe transport behavior without moving game rules into
the room route.

## Route Integration

The room route becomes a renderer over the selected `RoomClient`:

```text
Room route
├── createRoomClientPool(roomId)
├── activeClient()
├── derive room permissions from active client
├── get active game connection
├── render lobby or game
└── render development-only Multiplayer DevTools
```

The first implementation may retain the existing game-specific rendering
branches. The important change is replacing the route-owned global socket and
identity with the active `RoomClient`.

## Persistence

Persist development configuration in room-scoped `localStorage`:

```text
party:devtools:room:<roomId>
```

Suggested schema:

```ts
interface PersistedDevRoom {
    version: 1;
    activePlayerId: string;
    players: Array<{
        id: string;
        name: string;
        autoConnect: boolean;
    }>;
    panelOpen: boolean;
    selectedTab: "players" | "events" | "room";
}
```

Do not overwrite `playerId` or `playerName` cookies while switching players.

Provide a "Clear development players" action to remove stale room
configuration.

## Production Boundary

The feature must be statically development-gated:

```tsx
<Show when={import.meta.env.DEV}>
    <MultiplayerDevtools />
</Show>
```

Prefer a development-only dynamic import so the DevTools implementation is not
included in the production bundle.

The server receives ordinary player connections and does not need to know that
DevTools exists.

## Server Identity Hardening

The room currently accepts a `playerId` supplied with each message. A socket can
therefore attempt to act as another player.

Required protocol hardening:

1. `identify` or the initial `join` binds a socket to one player.
2. A bound socket cannot silently rebind to another player.
3. Later messages must match the bound player ID.
4. Mismatched messages are rejected and logged.
5. Longer term, later messages should omit `playerId`; the room supplies it
   from the bound socket session.
6. Duplicate joins must be idempotent.
7. Closing one socket must not mark a player disconnected while another socket
   for the same player remains connected.

These changes are security and correctness improvements independent of
Multiplayer DevTools.

## Game Architecture Audit

### Summary

| Severity | Game | Finding | Required action |
| --- | --- | --- | --- |
| Critical | RPS Tournament | The mounted component owns the player fold and reconciliation cursor | Move the projection into the player session or send complete authoritative player views |
| Critical | Quiz | The player answer and answer list live only in component signals; the declared player view is `null` | Add an authoritative player view and private result visibility |
| Medium | Herd Mentality | The UI uses a local `submitted` flag despite receiving `hasAnswered` from the server | Render submission state from the player view |
| Medium | Fun Facts | The UI uses a local `submitted` flag despite receiving `hasAnswered` from the server | Render submission state from the player view |

### RPS Tournament

Current behavior:

- `RpsRoom` creates `createRpsFold(...)` when the component mounts.
- The component subscribes to snapshot, event, hidden-data, and reconciliation
  messages.
- The fold stores the state, hidden choices, and ledger indices.
- Unmounting the component destroys that projection.

Why this is incompatible:

- Switching to another player unmounts the current RPS component.
- Events may arrive while that player's component is absent.
- Returning to the player creates a fresh fold with no state.
- Correctness depends on receiving and processing a new reconciliation
  response.
- A cached latest message is insufficient because ordered events and hidden
  data are required.

Required fix:

- Move the RPS projection from `RpsRoom` into the player's `RoomClient`, or
- Replace the client fold with complete player views sent after transitions.

If retaining event sourcing:

- The projection persists while the player view is inactive.
- The connection requests reconciliation when first created.
- The server returns a snapshot, all missing events, and that player's hidden
  data.
- The component only renders `connection.view()` and sends actions.
- UI announcements may still subscribe to events, but events must not be the
  only source of gameplay state.

Relevant files:

- `packages/www/src/components/rps/rps-room.tsx`
- `packages/www/src/game/rps/client-fold.ts`
- `packages/www/src/game/rps/engine-adapter.ts`

### Quiz

Current behavior:

- `QuizPlayerView` is `null`.
- `SampleQuizRoom` stores the selected answer in a local signal.
- The displayed answer list is accumulated from `player_answered` side events.
- Recreating the component resets the player's selected answer.
- The server broadcasts every player's answer to every socket.

Why this is incompatible:

- Switching away and back makes an answered player appear unanswered.
- A remounted host may not have the current answer list until another answer is
  submitted.
- Guests receive information that should be controlled by the game phase and
  player view.

Required fix:

- Define a real `QuizPlayerView`.
- Include at least:
  - `myAnswer`
  - `hasAnswered`
  - `answeredCount`
  - `totalPlayers`
  - current question and phase when the quiz is expanded beyond the sample
  - host-visible answer progress
  - revealed results only when permitted
- Send the correct player view after answer submission and on reconnection.
- Stop broadcasting all raw answers to all players.
- Treat answer-button locking as derived from `view.hasAnswered`.

Relevant files:

- `packages/www/src/components/sample-quiz-room.tsx`
- `packages/www/src/game/quiz/connection.ts`
- `packages/www/src/game/quiz/schemas.ts`
- `packages/www/src/game/index.ts`

### Herd Mentality

Current behavior:

- The server-derived player view already includes `myAnswer` and
  `hasAnswered`.
- The component separately tracks a local `submitted` signal.
- The answer form is controlled by the local signal rather than
  `view.hasAnswered`.

Why this is incompatible:

- Switching away and back resets `submitted`.
- The server still knows that the player answered.
- The UI may offer submission again and misrepresent current state.

Required fix:

- Remove `submitted` as gameplay state.
- Use `view.hasAnswered` to select between the form and submitted state.
- Use `view.myAnswer` for the submitted value.
- Keep `answerInput` as an unsent local draft.
- "Change answer" may reopen the local editor, but the authoritative answer
  remains the current server value until a replacement action succeeds.

Relevant files:

- `packages/www/src/components/herd/herd-room.tsx`
- `packages/www/src/game/herd/views.ts`

### Fun Facts

Current behavior and failure mode match Herd Mentality:

- `myAnswer` and `hasAnswered` already exist in the player view.
- The component uses a separate local `submitted` signal.
- Remounting displays the wrong submission state.

Required fix:

- Derive submitted state from `view.hasAnswered`.
- Display `view.myAnswer`.
- Keep only the unsent input draft in component state.
- Ensure replacement submissions are acknowledged through a new player view.

Relevant files:

- `packages/www/src/components/fun-facts/fun-facts-room.tsx`
- `packages/www/src/game/fun-facts/views.ts`

### Games That Pass This Audit

The following games currently derive canonical gameplay state from a
server-provided player view:

- Go Fish
- Poker
- Backwards Poker
- Blackjack
- Yahtzee
- Lying Yahtzee
- Perudo
- Cheese Thief
- Cockroach Poker
- Flip 7
- Skull
- Spicy

Their component signals currently represent acceptable transient UI state:

- Selected cards, opponents, bids, claims, or targets not yet submitted
- Form inputs
- Error messages
- Announcements
- Animation state

Switching players may discard those unsent drafts or visual effects. That is
acceptable and should not be compensated for by DevTools.

## Delivery Plan

### Phase 0: Fix Known Game Authority Problems

- Fix Herd Mentality submission rendering.
- Fix Fun Facts submission rendering.
- Add an authoritative Quiz player view and remove global answer leakage.
- Move RPS projection ownership out of the mounted component or migrate RPS to
  complete player views.
- Add remount and reconciliation regression tests.

RPS and Quiz are blockers for declaring all games compatible. The DevTools
foundation may be developed in parallel, but the tool should visibly mark
unsupported games until their fixes land.

### Phase 1: Transport Foundation

- Extract WebSocket handling from the room route.
- Add `RoomTransport`.
- Add connection status and cleanup.
- Add replay for latest snapshot-based messages.
- Change game connections to consume the transport abstraction.
- Preserve existing single-player behavior.

### Phase 2: Player Client Pool

- Add `RoomClient`.
- Add `RoomClientPool`.
- Keep one live socket per player.
- Add active-player switching.
- Add room-scoped local persistence.
- Keep event-sourced projections alive for inactive players.

### Phase 3: DevTools Player UI

- Add the collapsed dock.
- Add the expanded Players panel.
- Add, rename, switch, connect, disconnect, and remove operations.
- Add bulk player creation.
- Add keyboard controls.
- Gate and dynamically import the tool in development.

### Phase 4: Server Identity Hardening

- Bind socket identity.
- Reject mismatched player IDs.
- Prevent socket rebinding.
- Correct duplicate-socket presence accounting.
- Make duplicate joins idempotent.

### Phase 5: Inspection Features

- Add the bounded message log.
- Add event filters and payload inspection.
- Add the room-state inspector.
- Add copyable room and invite information.

### Phase 6: Network Controls

- Add artificial latency.
- Add incoming-message pause and drop controls.
- Add outgoing-message duplication.
- Add player-specific disconnect scenarios.

## Proposed Files

```text
packages/www/src/
├── components/dev/
│   ├── multiplayer-devtools.tsx
│   ├── multiplayer-player-list.tsx
│   ├── multiplayer-event-log.tsx
│   └── multiplayer-room-inspector.tsx
├── game/
│   ├── connection.ts
│   ├── connection-from-transport.ts
│   └── game-client-descriptors.ts
├── room/
│   ├── room-transport.ts
│   ├── room-socket-client.ts
│   ├── room-client.ts
│   ├── room-client-pool.ts
│   └── dev-room-persistence.ts
└── routes/room/$roomId/
    └── index.tsx
```

Exact names may change, but transport and player-session state should remain
outside UI component modules.

## Test Plan

### Game Authority Regression Tests

For every game:

1. Connect a real player.
2. Start the game.
3. Reach a player-specific state.
4. Destroy the rendered game component.
5. Allow other players to act.
6. Recreate the player component.
7. Verify the complete correct player view.
8. Verify hidden information remains isolated.

Specific required cases:

- RPS restores tournament state and the player's unrevealed choice.
- Quiz restores the player's submitted answer and correct lock state.
- Herd restores submitted status and answer.
- Fun Facts restores submitted status and answer.

### Unit Tests

`room-socket-client.test.ts`:

- Connects and identifies
- Parses room state
- Caches snapshot-based player views
- Replays current views to new subscribers
- Handles malformed messages
- Reconnects without duplicate listeners
- Cleans up sockets and subscriptions

`room-client-pool.test.ts`:

- Adds stable unique players
- Keeps inactive players connected
- Switches the active player
- Persists and restores development players
- Removes and disposes players
- Does not modify normal identity cookies while switching

`multiplayer-devtools.test.tsx`:

- Renders player and connection status
- Switches players
- Supports keyboard cycling
- Adds players individually and in bulk
- Exposes disconnect and reconnect operations
- Does not render in production

### Worker Tests

- A socket cannot act as another player.
- A socket cannot rebind after identification.
- Closing one of two same-player sockets keeps the player active.
- Closing the final socket marks the player disconnected.
- Reconnection restores the correct player view.
- Duplicate join remains idempotent.

### Browser E2E

Primary scenario:

1. Open one room page.
2. Add three development players.
3. Select a game.
4. Start the game.
5. Switch through every player.
6. Perform actions as each player.
7. Verify inactive players remain connected.
8. Reload the page.
9. Verify the development roster reconnects.
10. Verify each player restores the correct view.

Privacy scenarios:

- Poker: each player sees only permitted hole cards.
- Go Fish: each player sees only their hand.
- Perudo: each player sees only their dice.
- RPS: unrevealed choices remain player-specific.
- Quiz: unrevealed answers are not exposed to guests.
- Cheese Thief: roles and votes remain player-specific.
- Cockroach Poker: offered card identity remains correctly filtered.

Disconnection scenario:

1. Disconnect the player whose turn it is.
2. Verify the game's real disconnect behavior.
3. Switch to another player.
4. Reconnect the original player.
5. Verify complete state restoration.

## Acceptance Criteria

- A four-player live game can be tested from one browser tab.
- Every development player has a real WebSocket and real server identity.
- Switching players does not disconnect inactive players.
- Switching immediately displays the correct player-specific view.
- Every action is sent through the selected player's socket.
- Refreshing restores the configured development roster.
- Individual players can be disconnected and reconnected.
- Hidden information remains isolated between player clients.
- No canonical gameplay state depends on a mounted game component.
- RPS, Quiz, Herd Mentality, and Fun Facts pass remount tests.
- Socket identity spoofing is rejected.
- The DevTools code is absent from production behavior and preferably from the
  production bundle.
- Existing normal single-player room behavior remains unchanged.

## Recommended First Milestone

Deliver:

1. The four game-authority fixes.
2. Transport extraction.
3. `RoomClientPool`.
4. The Players DevTools panel.
5. Server socket-identity hardening.
6. Live browser tests for one public-information game and one
   hidden-information game.

The Events, Room, and network-fault panels can follow after the core player
switching workflow is reliable.
