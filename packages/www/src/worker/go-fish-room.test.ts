import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "go_fish",
    playerCount: 2,
    initialMessageType: "go_fish:state",
});
