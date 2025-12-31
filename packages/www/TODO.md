# Multiplayer Quiz MVP Todo List

## ✅ Completed Features

### Foundation

- WebSocket upgrade handling in API route (`src/routes/api/room/$roomId.ts`)
- Durable Object WebSocket handler (`src/worker/ws.ts`)
- Basic message types (`join`, `leave`, `start`, `end`, `info`, `answer`)
- Player storage in Durable Object (`src/game/index.ts`)
- Room type extensibility (`lobby`, `quiz`, `rps`)

### Player Identity & Session

- Cookie-based player identity using nanoid(10)
- Server matches playerId on reconnect (preserves score/name)
- Room state sent immediately on WebSocket connect (`room_state` message)
- Name autofill when reconnecting to existing room

### Host System

- First player to join becomes host
- Server tracks `hostId` in DO storage
- All clients notified of host assignment (`host_assigned` message)

### UI Components

- Home page with room name input (`src/routes/index.tsx`)
- Original home moved to `/home` route
- Room lobby component (`src/components/room-lobby.tsx`)
- Proper SolidJS patterns (Show, For instead of ternary/.map)
- SSR-safe code (document.cookie in onMount only)

### Join/Rename Flow

- Input disabled when joined
- "Rename" button enables input for editing
- Auto-focus on input when entering rename mode
- Enter key support to save renamed name
- Visual distinction: "Join" (blue) → "Rename" (yellow) → "Save" (green)

### Testing

- Bun native test runner, no external dependencies
- Tests for player management, host assignment, message types
- Tests for quiz question schema validation

---

## Remaining Tasks

### Quiz Game Logic (Phase 2)

#### Message Protocol

- [ ] `start` → host triggers game start, broadcast `game_started`
- [ ] `question` → server sends current question to players
- [ ] `answer` → player submits answer (index of option)
- [ ] `timer_update` → broadcast seconds remaining (host-controlled)
- [ ] `round_end` → show results for current question
- [ ] `game_end` → final leaderboard

#### Question Data

- [ ] Create `src/games/quiz/questions.ts` with 10 hardcoded questions
- [ ] Zod schema: question text, 4 options, correct index, timerSeconds

#### Quiz State Machine

- [ ] Track: `gameState` (`lobby` | `playing` | `ended`)
- [ ] Track: `currentQuestionIndex`, `players` with scores
- [ ] On `start`: validate host, set state to `playing`, send Q0
- [ ] On `answer`: validate not answered yet, check correctness, update score
- [ ] On `next`: validate host, advance index or end game

### UI Components (Phase 3)

#### Question Screen

- [ ] Question text (large, mobile-friendly)
- [ ] 4 answer cards (tappable, visual feedback)
- [ ] Timer bar (host-controlled updates)
- [ ] Disable answers after timer/next

#### Results Screen

- [ ] Show correct answer if wrong
- [ ] Leaderboard (sorted by score)
- [ ] "Next Question" button (host) or countdown
- [ ] "End Game" button (host) after final question

#### Lobby Screen

- [x] Room ID display with copy button
- [x] "Start" button (host only, 2+ players)
- [ ] Show host badge (crown icon) next to host's name in player list (all clients)

### Host Controls (Phase 4)

- [ ] "Kick" button next to player names
- [ ] "Next" button to advance questions
- [ ] "End Game" to return to lobby
- [ ] Host disconnect handling (reassign or end)

### Mobile Polish (Phase 5)

- [ ] Prevent input zoom (viewport meta, font-size: 16px+)
- [ ] Touch targets ≥44px
- [ ] WebSocket reconnection on app focus
- [ ] Loading states during connect

---

## User Added Notes

- [ ] check if tanstack start have cookie helper. currently we're doing weird parsing and it's not http only. idk if it's necessary to be http only though
- [ ] review how the user id refresh. probably fine right now unless we add user logins
- [ ] gotta update agents.md about how i'd like it to use typescript. it's not using it enough at all

---

## Design Decisions

1. **First join = host** - first player to join room is auto-assigned host
2. **Questions** - hardcoded for MVP, question creation page later
3. **Timer** - host-controlled, not auto-advance
4. **Scoring** - points for correct answer only, no time bonus
5. **Player identity** - stored in cookie, nanoid(10) for session persistence
6. **State ownership** - route owns state, components receive via props (extensible for multiple game types)
7. **Testing** - Bun's native test runner, no external packages

---

## File Structure

```
src/
├── components/
│   └── room-lobby.tsx      # Lobby UI component (receives state via props)
├── game/
│   ├── index.ts            # Game logic, message handling, player/host management
│   └── game.test.ts        # Unit tests
├── routes/
│   ├── index.tsx           # Home: room name input → /room/$roomId
│   ├── home.tsx            # Demo home (original content)
│   └── room/
│       └── $roomId/
│           └── index.tsx   # Route: owns state, manages WebSocket
├── utils/
│   └── ...                 # Utility functions
└── worker/
    └── ws.ts               # Durable Object WebSocket handler
```

---

## Quick Reference

```bash
# Run dev server
bun dev

# Build + typecheck
bun run build

# Run tests
bun test
bun test src/game/game.test.ts

# Deploy
bun run deploy
```
