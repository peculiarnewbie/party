import { test, expect } from "@playwright/test";
import { nanoid } from "nanoid";
import { MultiplayerRoomPage } from "./helpers/multiplayer-room-page";

function createRoomId(prefix: string) {
    return `${prefix}-${nanoid(6).toLowerCase()}`;
}

test.describe("poker-live", () => {
    test("fold propagation", async ({ page }) => {
        const room = new MultiplayerRoomPage(page);
        const roomId = createRoomId("poker-live-fold");

        await room.gotoRoom(roomId);
        const aliceId = await room.joinAsBrowser("Alice");
        const bobId = await room.addPlayerAndJoin("Bob");
        await room.waitForJoined(2);

        await room.selectGame("poker");
        await room.startGame();
        await room.waitForPokerRoom();
        await room.waitForMyTurn();

        await expect(page.getByTestId("poker-fold-button")).toBeEnabled();
        await page.getByTestId("poker-fold-button").click();

        await room.switchPlayer(bobId);
        await expect(
            page.locator(`[data-testid="poker-seat-${aliceId}"]`),
        ).toHaveAttribute("data-status", "folded", { timeout: 15_000 });
        await expect(page.getByTestId("poker-street")).toContainText(/HAND OVER/i, {
            timeout: 15_000,
        });

        await room.switchPlayer(aliceId);
        await expect(page.getByTestId("poker-street")).toContainText(/HAND OVER/i, {
            timeout: 15_000,
        });
    });

    test("spectator join", async ({ page }) => {
        const room = new MultiplayerRoomPage(page);
        const roomId = createRoomId("poker-live-spectator");

        await room.gotoRoom(roomId);
        const aliceId = await room.joinAsBrowser("Alice");
        await room.addPlayerAndJoin("Bob");
        await room.waitForJoined(2);

        await room.selectGame("poker");
        await room.startGame();
        await room.waitForPokerRoom();

        const danaId = await room.addPlayerAndJoin("Dana");
        await room.waitForJoined(3);
        await room.switchPlayer(danaId);
        await room.waitForPokerRoom();

        await expect(page.getByTestId("poker-hero-hand")).toContainText(/Spectating/);
        await expect(page.locator('[data-testid="poker-fold-button"]')).toHaveCount(0);
        await expect(
            page.locator('[data-testid="poker-check-call-button"]'),
        ).toHaveCount(0);
        await expect(page.getByTestId("poker-spectator-copy")).toBeVisible();

        await room.switchPlayer(aliceId);
        await expect(page.getByTestId("poker-spectator-list")).toContainText(/Dana/);
    });
});
