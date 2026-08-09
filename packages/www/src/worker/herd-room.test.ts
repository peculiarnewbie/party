import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "herd",
    playerCount: 3,
    initialMessageType: "herd:state",
});
