import { expect, test } from "@playwright/test";
import { nanoid } from "nanoid";

import type { GameType } from "../../src/game";
import { MultiplayerRoomPage } from "./multiplayer-room-page";

type LiveGameSmokeConfig = {
    gameType: GameType;
    playerCount: number;
    roomTestId: string;
};

export function defineLiveGameSmoke(config: LiveGameSmokeConfig) {
    test(`${config.gameType} starts through the live room`, async ({
        page,
    }) => {
        const room = new MultiplayerRoomPage(page);
        const roomId = `smoke-${config.gameType.replaceAll("_", "-")}-${nanoid(6).toLowerCase()}`;

        await room.gotoRoom(roomId);
        await room.joinAsBrowser("Host");
        await room.addPlayersAndJoin(config.playerCount - 1);
        await room.waitForJoined(config.playerCount);
        await room.selectGame(config.gameType);
        await room.startGame();

        await expect(page.getByTestId(config.roomTestId)).toBeVisible({
            timeout: 15_000,
        });
        await expect
            .poll(async () => (await room.snapshot()).room.activeGame)
            .toBe(config.gameType);
        const snapshot = await room.snapshot();
        expect(snapshot.room.phase).toBe("playing");
        expect(
            snapshot.players.filter((player) => player.isJoined),
        ).toHaveLength(config.playerCount);
    });
}
