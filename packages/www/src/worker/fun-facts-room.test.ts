import { describeGameRoomSmoke } from "./test-utils/game-room-smoke";

describeGameRoomSmoke({
    gameType: "fun_facts",
    playerCount: 3,
    initialMessageType: "fun_facts:state",
});
