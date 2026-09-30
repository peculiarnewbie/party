import { definePartyModeTest } from "./helpers/party-mode";
import { test, expect } from "@playwright/test";
import { nanoid } from "nanoid";
import { MultiplayerRoomPage } from "./helpers/multiplayer-room-page";
import type { BlackjackPlayerView } from "../src/game/blackjack/views";

function createRoomId(prefix: string) {
    return `${prefix}-${nanoid(6).toLowerCase()}`;
}

async function startBlackjackRound(page: import("@playwright/test").Page) {
    const room = new MultiplayerRoomPage(page);
    const roomId = createRoomId("blackjack-live");

    await room.gotoRoom(roomId);
    const aliceId = await room.joinAsBrowser("Alice");
    const bobId = await room.addPlayerAndJoin("Bob");
    await room.waitForJoined(2);

    await room.selectGame("blackjack");
    await room.startGame();
    await room.waitForBlackjackRoom();

    for (let attempt = 0; attempt < 4; attempt += 1) {
        await room.switchPlayer(aliceId);
        await expect(page.getByText("PLACE YOUR BET")).toBeVisible({
            timeout: 15_000,
        });
        await page.getByRole("button", { name: "DEAL" }).click();
        await expect(page.getByText("WAITING FOR OTHER BETS...")).toBeVisible({
            timeout: 15_000,
        });

        await room.switchPlayer(bobId);
        await expect(page.getByText("PLACE YOUR BET")).toBeVisible({
            timeout: 15_000,
        });
        await page.getByRole("button", { name: "DEAL" }).click();
        await page.waitForFunction(() => {
            return (
                document.querySelector(
                    '[data-testid^="blackjack-player-"][data-current-turn="true"]',
                ) !== null ||
                document.body.textContent?.includes("INSURANCE?") ||
                document.body.textContent?.includes(
                    "NEXT ROUND STARTING SOON...",
                )
            );
        });

        for (const playerId of [bobId, aliceId]) {
            await room.switchPlayer(playerId);
            await expect
                .poll(async () =>
                    (await room.gameView<BlackjackPlayerView>()).myId,
                )
                .toBe(playerId);
            const decline = page.getByRole("button", { name: "NO" });
            if ((await room.gameView<BlackjackPlayerView>()).needsInsurance) {
                await decline.click();
                await expect
                    .poll(async () =>
                        (
                            await room.gameView<BlackjackPlayerView>()
                        ).players.find((player) => player.id === playerId)
                            ?.insuranceDecided,
                    )
                    .toBe(true);
            }
        }
        await room.switchPlayer(bobId);

        await expect
            .poll(async () =>
                (await room.gameView<BlackjackPlayerView>()).phase,
            )
            .toMatch(/^(playing|settled)$/);
        if ((await room.gameView<BlackjackPlayerView>()).phase === "playing") {
            return { room, aliceId, bobId };
        }

        await expect(page.getByText("PLACE YOUR BET")).toBeVisible({
            timeout: 10_000,
        });
    }

    throw new Error("Unable to start an actionable blackjack round");
}

async function currentTurnPlayerId(page: import("@playwright/test").Page) {
    return page.evaluate(() => {
        const current = document.querySelector(
            '[data-testid^="blackjack-player-"][data-current-turn="true"]',
        );
        return (
            current
                ?.getAttribute("data-testid")
                ?.replace("blackjack-player-", "") ?? null
        );
    });
}

async function waitForCurrentTurnPlayerId(
    page: import("@playwright/test").Page,
) {
    await page.waitForFunction(
        () => {
            return Boolean(
                document.querySelector(
                    '[data-testid^="blackjack-player-"][data-current-turn="true"]',
                ),
            );
        },
        undefined,
        { timeout: 15_000 },
    );
    return currentTurnPlayerId(page);
}

test.describe("blackjack-live", () => {
    test("bet and deal", async ({ page }) => {
        const { room, aliceId, bobId } = await startBlackjackRound(page);

        await expect(
            page.getByText("YOUR TURN").or(page.getByText("'S TURN")),
        ).toBeVisible({
            timeout: 15_000,
        });

        const snap = await room.snapshot();
        const alice = snap.players.find((p) => p.id === aliceId);
        expect(alice?.isJoined).toBe(true);

        await expect(page.getByTestId("blackjack-room")).toBeVisible();

        const bobSnap = await room.snapshot();
        const bob = bobSnap.players.find((p) => p.id === bobId);
        expect(bob?.isJoined).toBe(true);
    });

    test("turn ownership switches by active player", async ({ page }) => {
        const { room, aliceId, bobId } = await startBlackjackRound(page);

        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        const currentId = await waitForCurrentTurnPlayerId(page);
        expect([aliceId, bobId]).toContain(currentId);

        await room.switchPlayer(currentId!);
        await expect(page.getByText("YOUR TURN")).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.getByRole("button", { name: "HIT" })).toBeVisible();

        const otherId = currentId === aliceId ? bobId : aliceId;
        await room.switchPlayer(otherId);
        await expect(page.getByTestId("blackjack-room")).toBeVisible();
        await expect(page.getByText("'S TURN")).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.getByRole("button", { name: "HIT" })).toHaveCount(0);
    });

    test("hit propagates to other player view", async ({ page }) => {
        const { room } = await startBlackjackRound(page);
        const currentId = await waitForCurrentTurnPlayerId(page);

        await room.switchPlayer(currentId!);
        const hand = page.getByTestId(`blackjack-hand-${currentId}-0`);
        const before = Number(await hand.getAttribute("data-card-count"));

        await page.getByRole("button", { name: "HIT" }).click();
        await expect(hand).toHaveAttribute(
            "data-card-count",
            String(before + 1),
            {
                timeout: 15_000,
            },
        );

        const snap = await room.snapshot();
        const other = snap.players.find(
            (player) => player.id !== currentId && player.isJoined,
        );
        expect(other).toBeTruthy();
        await room.switchPlayer(other!.id);
        await expect(
            page.getByTestId(`blackjack-hand-${currentId}-0`),
        ).toHaveAttribute("data-card-count", String(before + 1));
    });

    test("stand advances turn", async ({ page }) => {
        const { room } = await startBlackjackRound(page);
        const currentId = await waitForCurrentTurnPlayerId(page);

        await room.switchPlayer(currentId!);
        await page.getByRole("button", { name: "STAND" }).click();

        await page.waitForFunction(
            (previousId) => {
                const current = document.querySelector(
                    '[data-testid^="blackjack-player-"][data-current-turn="true"]',
                );
                const currentId = current
                    ?.getAttribute("data-testid")
                    ?.replace("blackjack-player-", "");
                return currentId !== previousId;
            },
            currentId,
            { timeout: 15_000 },
        );
    });

    test("round can settle", async ({ page }) => {
        const { room, aliceId, bobId } = await startBlackjackRound(page);

        for (let i = 0; i < 16; i++) {
            const before = await room.gameView<BlackjackPlayerView>();
            if (before.phase === "settled") break;
            expect(before.phase).toBe("playing");
            const current = before.players[before.currentPlayerIndex];
            expect(current).toBeTruthy();
            const currentId = current!.id;
            await room.switchPlayer(currentId);
            await page.getByRole("button", { name: "STAND", exact: true }).click();
            await expect
                .poll(async () => {
                    const after = await room.gameView<BlackjackPlayerView>();
                    return (
                        after.phase !== "playing" ||
                        after.players[after.currentPlayerIndex]?.id !== currentId ||
                        after.players[after.currentPlayerIndex]?.currentHandIndex !==
                            current!.currentHandIndex
                    );
                })
                .toBe(true);
        }

        await expect(page.getByText("NEXT ROUND STARTING SOON...")).toBeVisible(
            {
                timeout: 15_000,
            },
        );

        await room.switchPlayer(aliceId);
        await expect(
            page.getByText("NEXT ROUND STARTING SOON..."),
        ).toBeVisible();
        await room.switchPlayer(bobId);
        await expect(
            page.getByText("NEXT ROUND STARTING SOON..."),
        ).toBeVisible();
    });
});

definePartyModeTest("blackjack");
