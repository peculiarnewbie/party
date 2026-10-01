import { expect, test } from "@playwright/test";

import type { SkullClientMessage, SkullPlayerView } from "../src/game/skull";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "skull",
    playerCount: 3,
    roomTestId: "skull-room",
});

test("skull completes a flower challenge and starts the next round", async ({
    page,
}) => {
    const { room } = await startLiveGame(page, {
        gameType: "skull",
        playerCount: 3,
    });

    for (let placed = 1; placed <= 3; placed++) {
        const view = await room.waitForGameView<SkullPlayerView>();
        await room.switchPlayer(view.currentPlayerId);
        const current = await room.gameView<SkullPlayerView>();
        expect(current.myHand).toContain("flower");
        await room.sendGameMessage({
            type: "skull:play_disc",
            data: { disc: "flower" },
        } satisfies PlayerGameMessage<SkullClientMessage>);
        await expect
            .poll(async () => {
                const next = await room.gameView<SkullPlayerView>();
                return next.players.reduce(
                    (total, player) => total + player.matCount,
                    0,
                );
            })
            .toBe(placed);
    }

    const building = await room.gameView<SkullPlayerView>();
    expect(building.phase).toBe("building");
    const challengerId = building.currentPlayerId;
    await room.switchPlayer(challengerId);
    await room.sendGameMessage({
        type: "skull:start_challenge",
        data: { bid: 1 },
    } satisfies PlayerGameMessage<SkullClientMessage>);

    for (let passes = 0; passes < 2; passes++) {
        await expect
            .poll(async () => (await room.gameView<SkullPlayerView>()).phase)
            .toBe("auction");
        const auction = await room.gameView<SkullPlayerView>();
        expect(auction.currentPlayerId).not.toBe(challengerId);
        const passingPlayerId = auction.currentPlayerId;
        await room.switchPlayer(passingPlayerId);
        await room.sendGameMessage({
            type: "skull:pass_bid",
            data: {},
        } satisfies PlayerGameMessage<SkullClientMessage>);
        if (passes === 0) {
            await expect
                .poll(
                    async () =>
                        (await room.gameView<SkullPlayerView>())
                            .currentPlayerId,
                )
                .not.toBe(passingPlayerId);
        }
    }

    await expect
        .poll(async () => (await room.gameView<SkullPlayerView>()).roundNumber)
        .toBe(2);
    const nextRound = await room.gameView<SkullPlayerView>();
    expect(nextRound.phase).toBe("turn_prep");
    expect(nextRound.lastPublicResult?.type).toBe("attempt_succeeded");
    expect(
        nextRound.players.find((player) => player.id === challengerId)!
            .successfulChallenges,
    ).toBe(1);
    expect(nextRound.players.every((player) => player.matCount === 0)).toBe(
        true,
    );
});

test("Skull Party phones place, bid, and flip while the six-player display keeps discs hidden", async ({
    page,
    browser,
    baseURL,
}, testInfo) => {
    test.setTimeout(180_000);
    const { startPartyJourney, checkPartyLayout } =
        await import("./helpers/party-game-journey");
    const party = await startPartyJourney(page, browser, baseURL, "skull");
    const publicView = () =>
        party.state()?.game?.type === "skull"
            ? (
                  party.state()!.game as {
                      type: "skull";
                      view: import("../src/game/skull/table-view").SkullTableView;
                  }
              ).view
            : null;
    try {
        for (let count = 1; count <= 6; count++) {
            const view = await party.room.gameView<SkullPlayerView>();
            await party.room.switchPlayer(view.currentPlayerId);
            await expect(
                page.getByRole("button", { name: "Play flower" }).first(),
            ).toBeEnabled();
            await page
                .getByRole("button", { name: "Play flower" })
                .first()
                .click();
            await expect
                .poll(() =>
                    publicView()?.players.reduce(
                        (sum, player) => sum + player.matCount,
                        0,
                    ),
                )
                .toBe(count);
        }
        let view = await party.room.gameView<SkullPlayerView>();
        const challengerId = view.currentPlayerId;
        await party.room.switchPlayer(challengerId);
        await page.getByRole("button", { name: "Increase bid" }).click();
        await page.getByRole("button", { name: "Increase bid" }).click();
        await page
            .getByRole("button", { name: "START CHALLENGE", exact: true })
            .click();
        await expect.poll(() => publicView()?.highestBid).toBe(3);
        await party.display.screenshot({
            path: testInfo.outputPath("skull-party-bidding.png"),
        });
        await page.screenshot({
            path: testInfo.outputPath("skull-phone-bidding.png"),
        });
        for (let pass = 0; pass < 5; pass++) {
            view = await party.room.gameView<SkullPlayerView>();
            await party.room.switchPlayer(view.currentPlayerId);
            await page
                .getByRole("button", { name: "PASS", exact: true })
                .click();
            await expect
                .poll(() => publicView()?.currentPlayerId)
                .not.toBe(view.currentPlayerId);
        }
        await expect.poll(() => publicView()?.phase).toBe("attempt");
        await party.room.switchPlayer(challengerId);
        await expect(
            page.getByRole("button", { name: /Flip top disc:/ }),
        ).toHaveCount(5);
        await page
            .getByRole("button", { name: /Flip top disc:/ })
            .first()
            .click();
        await expect.poll(() => publicView()?.attempt?.revealedCount).toBe(2);
        for (const payload of party.frames) {
            const message = JSON.parse(payload);
            expect(message.type).toBe("display:state");
            for (const key of [
                '"myHand"',
                '"myMat"',
                '"hand"',
                '"mat"',
                '"discardableDiscIndices"',
            ])
                expect(payload).not.toContain(key);
        }
        await party.display.screenshot({
            path: testInfo.outputPath("skull-party-reveal.png"),
        });
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
            path: testInfo.outputPath("skull-phone-flip.png"),
        });
        await page
            .getByRole("button", { name: /Flip top disc:/ })
            .first()
            .click();
        await expect.poll(() => publicView()?.roundNumber).toBe(2);
        expect(publicView()?.lastPublicResult?.type).toBe("attempt_succeeded");
        const resolved = publicView();
        await party.display.reload({
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });
        await expect.poll(publicView).toEqual(resolved);
        await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
        await party.room.waitForDevtools();
        await party.hideDevtools();
        await expect
            .poll(async () => (await party.room.snapshot()).room.phase)
            .toBe("hibernated");
        await page
            .getByRole("button", { name: "RESUME GAME", exact: true })
            .click();
        await party.room.waitForGameView();
        await expect
            .poll(
                async () =>
                    (await party.room.gameView<SkullPlayerView>())
                        .lastPublicResult,
            )
            .toEqual(resolved?.lastPublicResult);
        await checkPartyLayout(page, party.display, "skull", party.errors);
    } finally {
        await party.displayContext.close();
    }
});
