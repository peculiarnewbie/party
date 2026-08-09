import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "skull",
    playerCount: 3,
    initialMessageType: "skull:state",
});
