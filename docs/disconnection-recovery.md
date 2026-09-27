# Disconnection recovery

Room hosts can choose a 30-second, 60-second (default), or 2-minute grace period, or wait indefinitely. Changes apply to future disconnects. For a waiting player, the host can add 30 seconds, wait indefinitely, or continue immediately. These controls appear above the room; the Party display shows presence and countdowns without management controls.

A lost connection preserves the player's room identity and capability. The browser retries with backoff and jitter, identifies using its saved capability, and enables controls only after the server has restored state and sent `room_ready`. Offline actions are not queued or replayed. Multiple authenticated tabs count as one player: losing one tab does not start a grace period while another remains connected.

Clients send heartbeats every 30 seconds. The server treats a socket as lost after 90 seconds without a heartbeat, then starts the full grace period. Explicit socket closure starts grace immediately. Returning to the foreground or regaining network connectivity prompts a connection check. A connection timeout starts retries without waiting for the old socket's close handshake.

## Game behavior

- During grace, the game preserves the player's state and continues until their input is needed.
- Poker expiry enables automatic checks when legal and folds when facing a bet, only on that player's turn. All-in hands remain eligible for showdown. Expired players sit out later hands without paying blinds. Their seat and chips remain available on authenticated return. A folded hand stays folded; future hands wait for at least two connected players with chips.
- Other games use their existing player-removal rules when grace expires. The room records `sitting_out`, retains the player's room membership, and explains that they can play the next game. It does not revoke their reconnect capability.
- Explicitly leaving a game remains `left_game`; subsequent socket closures cannot change that into a reconnectable participant.
- In the lobby, waiting players reserve their place and block starting. The host can continue without them; expired offline players are excluded from the next game's roster but retain room access.
- If the host's grace expires, authority transfers to a connected player, preferring active game participants. Games that store their own host identity are updated too. The returning host does not automatically take the role back.
- When all game participants disconnect, the room suspends before applying disconnect penalties. On resume, waiting players with timed grace receive a fresh grace period. Indefinite waits stay indefinite. Empty suspended rooms expire after three hours.

## Persistence and scheduling

`GameState.recovery` stores the policy, offline records, and cleanup deadline. Older room snapshots receive default recovery state. An offline record is either waiting with an optional deadline, or expired. Returning removes the record without replacing the player identity.

The room's single Durable Object alarm schedules the earliest socket lease, reconnect deadline, or suspended-room cleanup. Socket events, commands, and alarms share the room's message queue. Each alarm rechecks current presence and deadlines, so duplicate alarms or alarms scheduled before an extension do not repeat a game penalty. Socket heartbeat timestamps are serialized in WebSocket attachments; room recovery records and game state are persisted in SQLite.

Coverage includes real workerd reconnection, expiry, extension, host handover, state reload, multiple tabs, silent sockets, room suspension, and explicit departure; deterministic client retry tests; poker fallback tests; and a Playwright phone-disconnection scenario in `poker-live.spec.ts`.
