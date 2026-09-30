# 6 nimmt!

A 2–10 player game with simultaneous private choices, four public rows, and
ascending resolution. The standard 104-card deck is reshuffled each hand; each
player gets ten cards. Cards show their penalty points. The lowest score wins
when any remaining player reaches 66 at the end of a hand; tied leaders share
the win. The host deals subsequent hands and returns the room to the lobby.

Rules reference: [AMIGO's rulebook](https://blog.amigo-spiele.de/content/ap/rule/04910-GB-AmigoRule.pdf).

Choose full-table or Party phone controls in the lobby. The Party display shows
rows, scores, readiness, and revealed plays, but never hands or unrevealed
choices. Each player entry keeps the name, score, and a face-down card together;
the same card reveals in place, then flies from the nameplate into its row slot
and highlights after placement, without a second player list. During a row take,
the played card arrives at the end of the row; the taken cards fly into the
player's nameplate while the played card slides into the first slot. A full row
briefly compresses to fit its sixth card inside the board. Reduced-motion
preferences skip the movement; resizing cancels flights and restored views do
not replay old placements.
Each player's phone includes the public rows so choosing a row works
without depending on a view of the shared display.

The pure engine lives in `packages/www/src/game/six-nimmt/engine.ts`. Effect
schemas define persisted state and both wire views. Every command includes its
hand and turn so delayed requests cannot act on a later turn. Locks are final;
all choices reveal together. Resolution advances every 1.2 seconds using the
existing room timer, persists each step, and resumes from the queue after room
restoration. A low card pauses resolution until its owner chooses a row.

Temporary disconnections retain the hand and lock under the room's existing
grace policy. Leaving or grace expiry removes that player from pending choices
and the resolution queue. Remaining locked players proceed; with fewer than two
active players, the game ends. A departed player's score stays on the board.

The board and number cards use StyleX and the shared paper palette. The shared
TableLayout keeps controls below through 18:9 and beside the board on wider
desktops. Short landscape phones also put controls beside the board. Hands use
two rows of five cards on phones and in the desktop sidebar; short screens show
row-card values and penalties side by side to keep both readable.

Validation:

- `pnpm --filter www exec vitest run --project ui src/game/six-nimmt`
- `pnpm --filter www exec vitest run --project worker src/worker/six-nimmt-room.test.ts`
- `pnpm test:e2e -- --browser six-nimmt`

The browser test exercises separate player sessions, the public display, a
locked-player reload, phone and desktop viewport fit, all ten turns, row
choices, scoring, and the host's next deal.
