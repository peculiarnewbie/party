# Effect Migration Plan

## Goal

Adopt Effect as the primary reliability and boundary-validation library for the app without forcing a risky repo-wide rewrite.

The migration should improve:

- connection resilience for room and game actions
- typed validation at transport boundaries
- structured domain errors instead of flat string errors
- telemetry and observability for multiplayer failures
- deterministic testing for transport and game flows

## Non-Goals For The First Rollout

- do not rewrite every pure game engine to return `Effect` immediately
- do not replace every Zod schema in one pass
- do not convert every game room component at once
- do not introduce `Layer` everywhere before there is a concrete need

## Guiding Principles

- run the new Effect-based path alongside the existing path first
- keep the transport protocol compatible during the pilot
- migrate one vertical slice end-to-end before broad rollout
- keep pure game logic mostly pure unless effects provide real value
- push observability into the design from the start

## Current State Summary

- client room transport is raw `WebSocket` usage in `packages/www/src/routes/room/$roomId/index.tsx`
- individual game room components call `props.ws.send(...)` directly
- there is no websocket queueing, reconnect strategy, or typed action failure path
- room and game message validation currently uses Zod
- many engines return `{ type: "error"; message: string }`
- worker-side telemetry is mostly ad hoc `console.log` and uncaught exceptions
- `packages/www/wrangler.jsonc` has no `tail_consumers` or explicit `observability` block yet

## Architecture Target

### Client

- Solid signals remain the UI state primitive
- Effect owns websocket lifecycle, retries, send queueing, boundary decode/encode, and typed failures
- Effect Schema gradually replaces Zod at message boundaries

### Server

- Durable Object remains the authority for room and game coordination
- transport parsing and validation move toward Effect Schema
- domain failures become typed errors with a transport-safe mapping
- structured logs are emitted from the Worker and Durable Object code

### Telemetry

- producer Worker and Durable Object emit structured Effect logs
- Workers Logs handles sampled operational detail
- Tail Worker handles important product events and failures only

## Rollout Strategy

### Phase 0: Preparation

1. Confirm package manager and lockfile workflow for dependency changes.
2. Choose the initial Effect version.
3. Decide whether to start on the latest beta or the newest stable release.
4. Create a small migration surface first instead of a repo-wide API switch.

Recommendation:

- use the newest stable Effect release unless there is a beta-only feature we immediately need
- if beta is required, isolate wrappers so API churn stays local

## Phase 1: Install Effect And Add Base Utilities

### Scope

- add `effect`
- add a small internal Effect utility layer for this app
- keep all existing code working

### Commands

From repo root, prefer the workspace package add for `packages/www`.

Examples:

```bash
pnpm --filter www add effect
```

Or if the team prefers Bun for package changes:

```bash
bun add effect
```

### Files To Add

- `packages/www/src/utils/effect/runtime.ts`
- `packages/www/src/utils/effect/logging.ts`
- `packages/www/src/utils/effect/errors.ts`
- `packages/www/src/utils/effect/schema.ts`

### Deliverables

- a single place to run Effect code in client and worker contexts
- a single place for logging helpers and shared annotations
- a small shared error base for transport and domain failures
- a clear rule for where Effect code lives in the repo

### Notes

- avoid introducing app-wide `Layer` usage yet
- wrappers should be small and boring

## Phase 2: Define Transport Contract

### Scope

- define the new shared transport envelope without breaking the old protocol
- support correlation and telemetry from the first migrated slice

### Transport Additions

Add the following fields to the new path:

- `clientMessageId`
- `sentAt`
- `roomId`
- `playerId`
- `playerName`
- `type`
- `data`

Server responses for the new path should support:

- normal state and action messages
- ack messages tied to `clientMessageId`
- typed error messages mapped from domain failures

### Files To Touch

- `packages/www/src/game/index.ts`
- `packages/www/src/game/*/messages.ts` as games are migrated
- new shared transport file such as `packages/www/src/utils/transport.ts`

### Deliverables

- transport envelope schema
- ack schema
- error payload schema
- compatibility notes for old and new message senders

## Phase 3: Build Effect WebSocket Client

### Scope

- replace raw route-level websocket handling with a wrapper
- keep existing game UIs usable during migration

### File To Add

- `packages/www/src/utils/ws-client.ts`

### Responsibilities

- connect and reconnect
- exponential backoff with jitter
- outgoing queue while disconnected
- typed send function
- optional ack waiting for important actions
- connection status stream or subscription API
- decode incoming messages at the boundary
- emit telemetry for lifecycle changes

### Route Integration

Refactor `packages/www/src/routes/room/$roomId/index.tsx` to:

- create the wrapper in `onMount`
- use wrapper callbacks for room state updates
- stop holding raw websocket ownership in the route
- pass an adapter into game components until they are migrated

### Deliverables

- a tested websocket state machine
- visible connection state in UI plumbing
- no more silent send failure on disconnect

## Phase 4: Telemetry Foundation

### Goal

Split telemetry into two streams:

- high-value business and failure events for Tail Workers
- broad sampled operational logs for Workers Logs / observability

### Workers Logs Plan

Enable `observability` in `packages/www/wrangler.jsonc`.

Initial settings:

```json
{
    "observability": {
        "enabled": true,
        "head_sampling_rate": 0.01
    }
}
```

Use Workers Logs for:

- websocket lifecycle detail
- validation failures
- reconnect attempts
- queue depth signals
- action retry or ack timeout logs

### Tail Worker Plan

Add a dedicated Tail Worker and configure `tail_consumers` on the producer Worker.

Tail Worker should only process:

- `game_started`
- `game_ended`
- `room_hibernated`
- `room_resumed`
- uncaught exceptions
- non-`ok` invocation outcomes

### Why This Split

- Tail Workers cost CPU and should stay high-signal
- Workers Logs is better for noisy sampled diagnostics
- the same structured producer logs can feed both paths

### Proposed Producer Event Shape

Every structured log should include an `event` field plus shared context where available:

- `event`
- `timestamp`
- `roomId`
- `playerId`
- `sessionId`
- `gameType`
- `messageType`
- `clientMessageId`
- `outcome`
- `latencyMs`
- `retryCount`

### Client Events

Workers Logs only, not Tail Worker by default:

- `ws_connecting`
- `ws_open`
- `ws_closed`
- `ws_reconnect_scheduled`
- `ws_send_queued`
- `ws_send_flushed`
- `ws_ack_timeout`
- `ws_decode_failed`
- `ui_action_rejected`

### Server Events

Workers Logs by default:

- `room_socket_open`
- `room_socket_close`
- `room_identify`
- `room_message_invalid`
- `room_action_received`
- `room_action_rejected`
- `room_action_applied`

Tail Worker allowlist:

- `game_started`
- `game_ended`
- `room_hibernated`
- `room_resumed`
- `unhandled_exception`
- `invocation_failed`

### Files To Add Or Update

- `packages/www/wrangler.jsonc`
- `packages/www/src/utils/effect/logging.ts`
- `packages/www/src/worker/index.ts`
- `packages/www/src/worker/ws.ts`
- Tail Worker entrypoint, for example `packages/www/src/tail-worker/index.ts`

### Optional Follow-Up

If aggregate reporting becomes useful, the Tail Worker can write directly to Analytics Engine later.

## Phase 5: Typed Error Model

### Scope

- replace stringly engine errors with typed domain failures in the first migrated game
- keep the old wire format mapped where compatibility is still needed

### Example Error Tags

- `NotYourTurn`
- `InvalidAction`
- `GameNotStarted`
- `GameOver`
- `PlayerNotFound`
- `ConnectionLost`
- `InvalidMessage`

### Error Mapping Layers

1. Domain error inside engine or server helper
2. Transport-safe error payload for client consumption
3. User-facing message mapping in UI where needed

### Rule

Never format user text deep inside engines if the error really represents a typed condition.

### Deliverables

- shared typed error definitions
- mapping helper from error tag to transport payload
- first migrated game no longer relies on `{ type: "error"; message: string }`

## Phase 6: Yahtzee Pilot

### Why Yahtzee

- it already exposes the silent failure problem clearly
- it is a focused game to prove transport, errors, and telemetry together

### Scope

- migrate Yahtzee client message schemas to Effect Schema
- convert Yahtzee room send path to the websocket wrapper
- add typed Yahtzee domain errors
- instrument Yahtzee action flow end-to-end

### Files To Touch

- `packages/www/src/components/yahtzee/yahtzee-room.tsx`
- `packages/www/src/game/yahtzee/messages.ts`
- `packages/www/src/game/yahtzee/engine.ts`
- `packages/www/src/game/yahtzee/server.ts`
- `packages/www/src/worker/ws.ts`
- `packages/www/src/routes/room/$roomId/index.tsx`

### Success Criteria

- a disconnected client does not silently lose important actions
- invalid Yahtzee actions surface a typed failure path
- telemetry shows the difference between send failure, validation failure, and game rejection
- existing Yahtzee gameplay remains functional

## Phase 7: Expand Boundary Validation

### Scope

- migrate shared room schemas from Zod to Effect Schema
- migrate game message schemas game by game
- keep migrations vertical, not all at once

### Priority Order

1. room-level shared messages
2. Yahtzee
3. games with the highest activity or complexity
4. remaining games

### Suggested Game Order

1. Yahtzee
2. Poker
3. Blackjack
4. Perudo
5. Go Fish
6. RPS
7. Herd
8. Fun Facts
9. Cheese Thief
10. Cockroach Poker
11. Flip 7
12. Skull

### Migration Pattern Per Game

1. replace message schemas
2. replace send path in room component
3. replace engine error union
4. add focused tests
5. verify telemetry

## Phase 8: Broader Engine Error Migration

### Scope

- standardize typed error unions across all games
- remove ad hoc string message branching from servers where possible

### Files To Expect

- `packages/www/src/game/*/engine.ts`
- `packages/www/src/game/*/types.ts`
- `packages/www/src/game/*/server.ts`

### Approach

- avoid converting pure success paths into `Effect` unless needed
- use tagged unions or Effect `Data` for typed failures
- keep engine APIs understandable for game-specific logic

## Phase 9: Test Strategy

### New Test Targets

1. websocket client state machine
2. ack timeout behavior
3. reconnect and queue flushing
4. schema decode failures
5. typed error mapping
6. Yahtzee migrated action flows

### Effect Testing Use Cases

Use Effect testing where it gives concrete leverage:

- deterministic time control for reconnect backoff
- deterministic timeout testing
- queue and retry behavior
- controlled failure injection

### Keep Existing Tests

- do not rewrite passing Bun tests just to look more Effect-native
- add Effect-based tests where transport and timing matter most

### Verification Commands

```bash
bun test
bun run build
```

For the browser and seeded flow checks already present:

```bash
npm run test:browser:yahtzee
```

## Phase 10: Tail Worker Implementation

### File To Add

- `packages/www/src/tail-worker/index.ts`

### Responsibilities

- receive invocation events from the producer Worker
- normalize logs and exceptions from the `events` array
- filter by allowlist and outcome failures
- optionally forward or aggregate important events

### Initial Filtering Rules

Keep:

- allowlisted business events
- invocations whose outcome is not `ok`
- any exception emitted by the producer

Drop:

- ordinary connection lifecycle logs
- regular successful validation logs
- noisy state broadcast logs

### Wrangler Configuration Tasks

1. create and deploy the Tail Worker
2. add `tail_consumers` to the producer Worker config
3. keep producer and consumer names explicit
4. run `bun run cf-typegen` after binding changes if types change

## Phase 11: Optional Layer Adoption

Only do this after the pilot and a second game validate the design.

Potential candidates:

- random service abstraction
- clock abstraction for timers and retries
- telemetry service abstraction
- transport service abstraction

Rule:

- do not add `Layer` just because Effect supports it
- add it only where construction and replacement are genuinely repetitive

## Deliverable Sequence

### PR 1

- install Effect
- add shared Effect utilities
- add structured logging helpers
- no behavior change beyond safe scaffolding

### PR 2

- add websocket client wrapper
- integrate route-level room transport
- add sampled observability config

### PR 3

- add Tail Worker
- wire `tail_consumers`
- filter important events only

### PR 4

- migrate Yahtzee schemas and send path
- add typed Yahtzee errors
- add transport and telemetry tests

### PR 5+

- migrate remaining games incrementally
- expand typed errors and Effect Schema coverage

## Risks

### Effect Version Churn

- beta APIs may move during migration
- isolate wrappers so package upgrades stay local

### Protocol Drift

- client, worker, and game server changes must land together for each migrated slice
- use compatibility mode during the pilot

### Over-Architecture

- avoid full `Layer` and service refactors up front
- keep first changes focused on transport and boundaries

### Observability Cost And Noise

- keep Workers Logs sampled
- keep Tail Worker allowlist narrow
- log structured JSON, not verbose payload dumps

## Migration Checklist

### Foundation

- [ ] add `effect`
- [ ] add shared Effect runtime and logging helpers
- [ ] define shared transport envelope and ack shape

### Transport

- [ ] add `ws-client.ts`
- [ ] migrate room route to wrapper ownership
- [ ] expose connection status and queued-send behavior

### Telemetry

- [ ] enable Workers Logs with sampling
- [ ] define structured producer event schema
- [ ] add Tail Worker
- [ ] wire `tail_consumers`
- [ ] filter to important events only

### Pilot

- [ ] migrate Yahtzee messages to Effect Schema
- [ ] migrate Yahtzee send path
- [ ] migrate Yahtzee engine errors
- [ ] add Yahtzee telemetry coverage

### Rollout

- [ ] migrate shared room schemas
- [ ] migrate remaining games one by one
- [ ] standardize typed domain errors

### Verification

- [ ] unit tests pass
- [ ] build passes
- [ ] seeded Yahtzee browser test passes
- [ ] Tail Worker sees `game_started`, `game_ended`, and failures

## Definition Of Done

The migration is complete when:

- all room and game boundaries use Effect-based validation
- websocket sends no longer fail silently
- important multiplayer flows have typed error handling
- Tail Worker receives only high-signal business and failure events
- Workers Logs captures sampled operational detail
- the old raw websocket send path is removed
- the old string-only error pattern is removed from migrated games

## Immediate First Step

Start with PR 1 and PR 2 only:

1. install Effect and add shared utilities
2. build the websocket wrapper
3. enable sampled observability
4. do not migrate all games yet

That creates the foundation for Yahtzee and the Tail Worker without committing to a risky all-at-once rewrite.
