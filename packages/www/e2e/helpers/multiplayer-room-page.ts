import type { Page } from "@playwright/test";
import type { GameType } from "../../src/game";
import type {
    DevToolsSnapshot,
} from "../../src/room/devtools-api";
import { PARTY_DEVTOOLS_API_VERSION } from "../../src/room/devtools-api";
import { E2E_BASE_URL } from "./e2e.config";

export class MultiplayerRoomPage {
    constructor(private readonly page: Page) {}

    async gotoRoom(roomId: string) {
        await this.page.goto(new URL(`/room/${roomId}`, E2E_BASE_URL).toString(), {
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });
        await this.page.waitForSelector('[data-testid="room-lobby"]');
        await this.waitForDevtools();
    }

    async waitForDevtools() {
        await this.page.waitForFunction(
            (version) => window.__PARTY_DEVTOOLS__?.version === version,
            PARTY_DEVTOOLS_API_VERSION,
            { timeout: 15_000 },
        );
    }

    async snapshot(): Promise<DevToolsSnapshot> {
        return this.page.evaluate(() => window.__PARTY_DEVTOOLS__!.snapshot());
    }

    async joinAsBrowser(name: string): Promise<string> {
        await this.page.locator('[data-testid="room-name-input"]').fill(name);
        await this.page.locator('[data-testid="room-join-button"]').click();
        await this.page.waitForFunction(() => {
            return (
                document.querySelector('[data-testid="room-leave-button"]') !==
                    null ||
                document.querySelector('[data-testid="poker-room"]') !== null
            );
        });
        await this.waitForJoined(1);
        const snap = await this.snapshot();
        const browserPlayer = snap.players.find(
            (player) => player.origin === "browser",
        );
        if (!browserPlayer) {
            throw new Error("Browser player not found after join");
        }
        return browserPlayer.id;
    }

    async addPlayerAndJoin(name?: string): Promise<string> {
        const playerId = await this.page.evaluate((playerName) => {
            return window.__PARTY_DEVTOOLS__!.addPlayerAndJoin(
                playerName ? { name: playerName } : undefined,
            );
        }, name);
        await this.waitForPlayerJoined(playerId);
        return playerId;
    }

    async addPlayersAndJoin(count: number): Promise<string[]> {
        const playerIds: string[] = [];
        for (let i = 0; i < count; i++) {
            playerIds.push(await this.addPlayerAndJoin());
        }
        return playerIds;
    }

    async switchPlayer(playerId: string) {
        await this.page.evaluate((id) => {
            window.__PARTY_DEVTOOLS__!.setActivePlayer(id);
        }, playerId);
        await this.page.waitForFunction(
            (id) => window.__PARTY_DEVTOOLS__!.snapshot().activePlayerId === id,
            playerId,
        );
    }

    async selectGame(gameType: GameType) {
        await this.page
            .locator(`[data-testid="room-game-option-${gameType}"]`)
            .click();
    }

    async startGame() {
        await this.page.locator('[data-testid="room-start-button"]').click();
    }

    async waitForPokerRoom() {
        await this.page.waitForSelector('[data-testid="poker-room"]');
    }

    async waitForMyTurn() {
        await this.page.waitForFunction(() => {
            const banner = document.querySelector(
                '[data-testid="poker-turn-banner"]',
            );
            return banner?.textContent?.includes("YOUR TURN");
        });
    }

    async waitForConnected(count: number, timeoutMs = 15_000) {
        await this.page.waitForFunction(
            (expected) => {
                const snap = window.__PARTY_DEVTOOLS__!.snapshot();
                return snap.room.connectedSockets >= expected;
            },
            count,
            { timeout: timeoutMs },
        );
    }

    async waitForJoined(count: number, timeoutMs = 15_000) {
        await this.page.waitForFunction(
            (expected) => {
                const snap = window.__PARTY_DEVTOOLS__!.snapshot();
                return (
                    snap.players.filter((player) => player.isJoined).length >=
                    expected
                );
            },
            count,
            { timeout: timeoutMs },
        );
    }

    async waitForPlayerConnected(playerId: string, timeoutMs = 15_000) {
        await this.page.waitForFunction(
            (id) => {
                const player = window
                    .__PARTY_DEVTOOLS__!.snapshot()
                    .players.find((entry) => entry.id === id);
                return player?.connectionStatus === "connected";
            },
            playerId,
            { timeout: timeoutMs },
        );
    }

    async waitForPlayerJoined(playerId: string, timeoutMs = 15_000) {
        await this.page.waitForFunction(
            (id) => {
                const player = window
                    .__PARTY_DEVTOOLS__!.snapshot()
                    .players.find((entry) => entry.id === id);
                return player?.isJoined === true;
            },
            playerId,
            { timeout: timeoutMs },
        );
    }

    async browserPlayerId(): Promise<string> {
        const snap = await this.snapshot();
        const browserPlayer = snap.players.find(
            (player) => player.origin === "browser",
        );
        if (!browserPlayer) {
            throw new Error("Browser player not found");
        }
        return browserPlayer.id;
    }
}
