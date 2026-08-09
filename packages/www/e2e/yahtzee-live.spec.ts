import { defineLiveGameSmoke } from "./helpers/live-game-smoke";

defineLiveGameSmoke({
    gameType: "yahtzee",
    playerCount: 2,
    roomTestId: "yahtzee-room",
});
defineLiveGameSmoke({
    gameType: "lying_yahtzee",
    playerCount: 2,
    roomTestId: "yahtzee-room",
});
