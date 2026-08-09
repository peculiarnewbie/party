import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "quiz",
    playerCount: 2,
    initialMessageType: null,
});
