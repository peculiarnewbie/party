import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "flip_7",
    playerCount: 3,
    initialMessageType: "flip_7:state",
});
