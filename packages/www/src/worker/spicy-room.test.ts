import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "spicy",
    playerCount: 3,
    initialMessageType: "spicy:state",
});
