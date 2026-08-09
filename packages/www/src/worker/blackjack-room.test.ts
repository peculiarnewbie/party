import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "blackjack",
    playerCount: 1,
    initialMessageType: "blackjack:state",
});
