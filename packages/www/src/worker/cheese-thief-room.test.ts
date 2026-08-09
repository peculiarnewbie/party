import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "cheese_thief",
    playerCount: 4,
    initialMessageType: "cheese_thief:state",
});
