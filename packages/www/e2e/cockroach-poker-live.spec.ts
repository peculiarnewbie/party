import { defineLiveGameSmoke } from "./helpers/live-game-smoke";

defineLiveGameSmoke({
    gameType: "cockroach_poker",
    playerCount: 3,
    roomTestId: "cockroach-poker-room",
});
