import { expect, test } from "@playwright/test";
import { nanoid } from "nanoid";

import type { Page } from "@playwright/test";
import type { GameType } from "../../src/game";
import { MultiplayerRoomPage } from "./multiplayer-room-page";

type LiveGameSmokeConfig = {
    gameType: GameType;
    playerCount: number;
    roomTestId: string;
};

type StartLiveGameConfig = Omit<LiveGameSmokeConfig, "roomTestId"> & {
    roomPrefix?: string;
};

export async function startLiveGame(page: Page, config: StartLiveGameConfig) {
    const room = new MultiplayerRoomPage(page);
    const prefix = config.roomPrefix ?? "journey";
    const roomId = `${prefix}-${config.gameType.replaceAll("_", "-")}-${nanoid(6).toLowerCase()}`;

    await room.gotoRoom(roomId);
    const hostId = await room.joinAsBrowser("Host");
    const guestIds = await room.addPlayersAndJoin(config.playerCount - 1);
    await room.waitForJoined(config.playerCount);
    await room.selectGame(config.gameType);
    await room.startGame();

    await expect
        .poll(async () => (await room.snapshot()).room.activeGame)
        .toBe(config.gameType);

    return { room, playerIds: [hostId, ...guestIds] };
}

export function defineLiveGameSmoke(config: LiveGameSmokeConfig) {
    test(`${config.gameType} starts through the live room`, async ({
        page,
    }) => {
        const { room } = await startLiveGame(page, {
            gameType: config.gameType,
            playerCount: config.playerCount,
            roomPrefix: "smoke",
        });

        await expect(page.getByTestId(config.roomTestId)).toBeVisible({
            timeout: 15_000,
        });
        const snapshot = await room.snapshot();
        expect(snapshot.room.phase).toBe("playing");
        expect(
            snapshot.players.filter((player) => player.isJoined),
        ).toHaveLength(config.playerCount);
    });
}
