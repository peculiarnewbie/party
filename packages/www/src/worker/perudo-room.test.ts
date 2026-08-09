import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "perudo",
    playerCount: 2,
    initialMessageType: "perudo:state",
});
