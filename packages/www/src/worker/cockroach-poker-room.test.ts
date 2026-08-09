import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "cockroach_poker",
    playerCount: 3,
    initialMessageType: "cockroach_poker:state",
});
