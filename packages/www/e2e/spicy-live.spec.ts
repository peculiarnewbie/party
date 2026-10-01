import { expect, test } from "@playwright/test";

import type { SpicyClientMessage, SpicyPlayerView } from "../src/game/spicy";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";

defineLiveGameSmoke({
    gameType: "spicy",
    playerCount: 3,
    roomTestId: "spicy-room",
});

test("spicy catches a deliberate lie and applies the challenge penalty", async ({
    page,
}) => {
    const { room } = await startLiveGame(page, {
        gameType: "spicy",
        playerCount: 3,
    });
    const opening = await room.gameView<SpicyPlayerView>();
    const liarId = opening.currentPlayerId;
    await room.switchPlayer(liarId);
    const liarView = await room.gameView<SpicyPlayerView>();
    const card = liarView.myHand[0]!;
    let trait: "number" | "spice";
    let declaredNumber = liarView.allowedDeclarationNumbers[0]!;
    let declaredSpice = liarView.allowedDeclarationSpices[0]!;

    if (card.kind === "standard") {
        trait = "number";
        declaredNumber = liarView.allowedDeclarationNumbers.find(
            (number) => number !== card.number,
        )!;
    } else if (card.kind === "wild_spice") {
        trait = "number";
    } else {
        trait = "spice";
    }

    const liarHandCountBefore = liarView.players.find(
        (player) => player.id === liarId,
    )!.handCount;
    await room.sendGameMessage({
        type: "spicy:play_card",
        data: { cardId: card.id, declaredNumber, declaredSpice },
    } satisfies PlayerGameMessage<SpicyClientMessage>);

    await expect
        .poll(async () => (await room.gameView<SpicyPlayerView>()).stackTop)
        .toMatchObject({
            ownerId: liarId,
            declaredNumber,
            declaredSpice,
            stackSize: 1,
        });
    const challengeView = await room.gameView<SpicyPlayerView>();
    const challengerId = challengeView.currentPlayerId;
    const challengerWonCardsBefore = challengeView.players.find(
        (player) => player.id === challengerId,
    )!.wonCardCount;
    expect(challengeView.stackTop).not.toHaveProperty("actualCard");

    await room.switchPlayer(challengerId);
    await room.sendGameMessage({
        type: "spicy:challenge",
        data: { trait },
    } satisfies PlayerGameMessage<SpicyClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<SpicyPlayerView>()).lastPublicResult?.type,
        )
        .toBe("challenge_resolved");

    const resolved = await room.gameView<SpicyPlayerView>();
    const result = resolved.lastPublicResult;
    expect(result?.type).toBe("challenge_resolved");
    if (result?.type === "challenge_resolved") {
        expect(result).toMatchObject({
            challengerId,
            challengedPlayerId: liarId,
            challengedTrait: trait,
            challengerWon: true,
            winnerId: challengerId,
            loserId: liarId,
            collectedCardCount: 1,
            loserDrewCount: 2,
        });
        expect(result.actualCard.id).toBe(card.id);
    }
    expect(resolved.stackTop).toBeNull();
    expect(
        resolved.players.find((player) => player.id === challengerId)!
            .wonCardCount,
    ).toBe(challengerWonCardsBefore + 1);
    expect(
        resolved.players.find((player) => player.id === liarId)!.handCount,
    ).toBe(liarHandCountBefore + 1);
});

test("Spicy Party phones declare illustrated claims and challenge while six-player displays hide actual cards", async ({
    page,
    browser,
    baseURL,
}, testInfo) => {
    test.setTimeout(180_000);
    const { startPartyJourney, checkPartyLayout, waitForArt } =
        await import("./helpers/party-game-journey");
    const party = await startPartyJourney(page, browser, baseURL, "spicy");
    const publicView = () => {
        const game = party.state()?.game;
        return game?.type === "spicy" ? game.view : null;
    };
    try {
        const opening = await party.room.gameView<SpicyPlayerView>();
        const card = opening.myHand[0];
        const number = card.kind === "standard" && card.number === 1 ? 2 : 1;
        const trait = card.kind === "wild_number" ? "spice" : "number";
        await page
            .getByRole("button", {
                name: `Claim number ${number}`,
                exact: true,
            })
            .click();
        await page
            .getByRole("button", { name: "Claim Chili", exact: true })
            .click();
        await waitForArt(page);
        await page.screenshot({
            path: testInfo.outputPath("spicy-phone-hand.png"),
            fullPage: true,
        });
        await page
            .getByRole("button", { name: "PLAY FACE DOWN", exact: true })
            .click();
        await expect
            .poll(() => publicView()?.stackTop?.declaredNumber)
            .toBe(number);
        for (const payload of party.frames) {
            expect(JSON.parse(payload).type).toBe("display:state");
            for (const key of [
                '"myHand"',
                '"hand"',
                '"stack"',
                '"drawPile"',
                '"actualCard"',
                card.id,
            ])
                expect(payload).not.toContain(key);
        }
        await waitForArt(party.display);
        await party.display.screenshot({
            path: testInfo.outputPath("spicy-party-claim.png"),
        });
        const challenged = publicView();
        await party.display.reload({
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });
        await expect.poll(publicView).toEqual(challenged);
        await party.room.switchPlayer(party.ids[1]);
        await page
            .getByRole("button", { name: `Challenge ${trait}`, exact: true })
            .click();
        await expect
            .poll(() => publicView()?.lastPublicResult?.type)
            .toBe("challenge_resolved");
        expect(publicView()?.lastPublicResult).toMatchObject({
            actualCard: card,
        });
        await waitForArt(party.display);
        await waitForArt(page);
        await party.display.screenshot({
            path: testInfo.outputPath("spicy-party-reveal.png"),
        });
        await page.screenshot({
            path: testInfo.outputPath("spicy-phone-reveal.png"),
        });
        const revealed = publicView();
        await party.display.reload({
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });
        await expect.poll(publicView).toEqual(revealed);
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
                    (await party.room.gameView<SpicyPlayerView>())
                        .lastPublicResult,
            )
            .toEqual(revealed?.lastPublicResult);
        await checkPartyLayout(page, party.display, "spicy", party.errors);
    } finally {
        await party.displayContext.close();
    }
});
