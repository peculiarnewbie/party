import { expect, test } from "@playwright/test";

import type {
    CockroachPokerClientMessage,
    CockroachPokerPlayerView,
} from "../src/game/cockroach-poker";
import { CREATURE_TYPES } from "../src/game/cockroach-poker";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import type { PlayerGameMessage } from "./helpers/multiplayer-room-page";
import { MultiplayerRoomPage } from "./helpers/multiplayer-room-page";
import type { DisplayState } from "../src/room/display-protocol";

defineLiveGameSmoke({
    gameType: "cockroach_poker",
    playerCount: 3,
    roomTestId: "cockroach-poker-room",
});

test("cockroach poker passes a bluff before the final player calls it", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "cockroach_poker",
        playerCount: 3,
    });
    const opening = await room.gameView<CockroachPokerPlayerView>();
    const offererId = opening.activePlayerId;
    const receiverId = playerIds.find((id) => id !== offererId)!;
    const finalReceiverId = playerIds.find(
        (id) => id !== offererId && id !== receiverId,
    )!;
    await room.switchPlayer(offererId);
    const offererView = await room.gameView<CockroachPokerPlayerView>();
    const actualCard = offererView.myHand[0]!;
    const falseClaim = CREATURE_TYPES.find(
        (creature) => creature !== actualCard,
    )!;

    await room.sendGameMessage({
        type: "cockroach_poker:offer_card",
        data: { targetId: receiverId, cardIndex: 0, claim: actualCard },
    } satisfies PlayerGameMessage<CockroachPokerClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<CockroachPokerPlayerView>(receiverId))
                    .offerChain?.currentReceiverId,
        )
        .toBe(receiverId);
    expect(
        (await room.gameView<CockroachPokerPlayerView>(receiverId)).offerChain
            ?.peekedCard,
    ).toBeNull();

    await room.switchPlayer(receiverId);
    await room.sendGameMessage({
        type: "cockroach_poker:peek_and_pass",
        data: { targetId: finalReceiverId, newClaim: falseClaim },
    } satisfies PlayerGameMessage<CockroachPokerClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<CockroachPokerPlayerView>(finalReceiverId))
                    .offerChain?.currentReceiverId,
        )
        .toBe(finalReceiverId);
    const passerView =
        await room.gameView<CockroachPokerPlayerView>(receiverId);
    const finalReceiverView =
        await room.gameView<CockroachPokerPlayerView>(finalReceiverId);
    expect(passerView.offerChain?.peekedCard).toBe(actualCard);
    expect(finalReceiverView.offerChain).toMatchObject({
        currentOffererId: receiverId,
        currentClaim: falseClaim,
        peekedCard: null,
        mustAccept: true,
    });

    await room.switchPlayer(finalReceiverId);
    await room.sendGameMessage({
        type: "cockroach_poker:call_false",
        data: {},
    } satisfies PlayerGameMessage<CockroachPokerClientMessage>);
    await expect
        .poll(
            async () =>
                (await room.gameView<CockroachPokerPlayerView>()).lastResult
                    ?.type,
        )
        .toBe("call_resolved");
    const resolved = await room.gameView<CockroachPokerPlayerView>();
    expect(resolved.lastResult).toMatchObject({
        type: "call_resolved",
        callerId: finalReceiverId,
        calledTrue: false,
        wasCorrect: true,
        actualCard,
        cardTakerId: receiverId,
    });
    expect(resolved.activePlayerId).toBe(receiverId);
    expect(
        resolved.players.find((player) => player.id === receiverId)!
            .faceUpCards,
    ).toContain(actualCard);
});

test("Cockroach Poker Party phones peek privately before passing while the six-player display stays public", async ({
    browser,
    baseURL,
}, testInfo) => {
    test.setTimeout(180_000);
    const contexts = await Promise.all(
        Array.from({ length: 4 }, () =>
            browser.newContext({ viewport: { width: 390, height: 844 } }),
        ),
    );
    const errors: string[] = [];
    try {
        const roomId = `party-cockroach-${crypto.randomUUID().slice(0, 8)}`;
        const players = [];
        for (const [index, name] of ["Host", "Alice", "Bob"].entries()) {
            const page = await contexts[index].newPage();
            page.on("pageerror", (error) => errors.push(error.message));
            await page.goto(`${baseURL}/room/${roomId}?view=controller`, {
                waitUntil: "domcontentloaded",
            });
            const room = new MultiplayerRoomPage(page);
            await expect(page.getByTestId("room-lobby")).toBeVisible({
                timeout: 30_000,
            });
            await room.waitForDevtools();
            const id = await room.joinAsBrowser(name);
            await page.addStyleTag({
                content:
                    '[data-testid="multiplayer-devtools"] { display: none !important; }',
            });
            players.push({ page, room, id });
        }
        const [host, receiver, finalReceiver] = players;
        const simulatedIds = [];
        for (const name of ["Carol", "Dana", "Eli"])
            simulatedIds.push(await host.room.addPlayerAndJoin(name));
        await host.room.waitForConnected(4);
        const display = await contexts[3].newPage();
        await display.setViewportSize({ width: 1920, height: 1080 });
        display.on("pageerror", (error) => errors.push(error.message));
        let publicState: DisplayState | null = null;
        const frames: string[] = [];
        display.on(
            "websocket",
            (socket) =>
                socket.url().includes("/api/room/") &&
                socket.on("framereceived", (frame) => {
                    const text = String(frame.payload);
                    frames.push(text);
                    const message = JSON.parse(text);
                    if (message.type === "display:state")
                        publicState = message.data;
                }),
        );
        const publicView = () =>
            publicState?.game?.type === "cockroach_poker"
                ? publicState.game.view
                : null;
        await display.goto(`${baseURL}/room/${roomId}?view=display`, {
            waitUntil: "domcontentloaded",
        });
        await expect.poll(() => publicState?.players.length).toBe(6);
        await host.room.selectGame("cockroach_poker");
        await host.room.startGame();
        const board = display.getByTestId("cockroach-poker-table-display");
        await expect(board).toBeVisible();
        const opening =
            await host.room.waitForGameView<CockroachPokerPlayerView>();
        const actualCard = opening.myHand[0]!;
        const falseClaim = CREATURE_TYPES.find(
            (creature) => creature !== actualCard,
        )!;
        const label = (creature: string) =>
            creature
                .split("_")
                .map((word) => word[0].toUpperCase() + word.slice(1))
                .join(" ");
        await host.page
            .getByTestId("cockroach-poker-hand")
            .getByRole("button", { name: label(actualCard), exact: true })
            .click();
        await host.page
            .getByRole("button", { name: "Alice", exact: true })
            .click();
        await host.page
            .getByTestId("cockroach-poker-claim")
            .getByRole("button", { name: label(actualCard), exact: true })
            .click();
        await expect
            .poll(async () =>
                host.page
                    .getByTestId("cockroach-poker-room")
                    .locator('img[src^="/cards/cockroach-poker/"]')
                    .evaluateAll(
                        (images) =>
                            images.length >= 8 &&
                            images.every(
                                (image) =>
                                    image instanceof HTMLImageElement &&
                                    image.complete &&
                                    image.naturalWidth > 0,
                            ),
                    ),
            )
            .toBe(true);
        await host.page.screenshot({
            path: testInfo.outputPath("phone-offer.png"),
            fullPage: true,
        });
        await host.page
            .getByRole("button", { name: "OFFER CARD", exact: true })
            .click();
        await expect(
            receiver.page.getByRole("button", { name: "TRUE", exact: true }),
        ).toBeVisible();
        await receiver.page.screenshot({
            path: testInfo.outputPath("phone-call.png"),
        });
        await display.screenshot({
            path: testInfo.outputPath("party-claim.png"),
        });
        await receiver.page
            .getByRole("button", { name: "PEEK & PASS", exact: true })
            .click();
        await expect(
            receiver.page.getByTestId("cockroach-poker-private-peek"),
        ).toHaveText(label(actualCard), { ignoreCase: true });
        await expect(
            receiver.page.getByRole("button", { name: "TRUE", exact: true }),
        ).toHaveCount(0);
        await expect
            .poll(() => publicView()?.offerChain?.receiverPeeked)
            .toBe(true);
        const receiverPeek = publicView();
        await receiver.page.reload({
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });
        await expect(
            receiver.page.getByTestId("cockroach-poker-private-peek"),
        ).toBeVisible({ timeout: 30_000 });
        await receiver.page.addStyleTag({
            content:
                '[data-testid="multiplayer-devtools"] { display: none !important; }',
        });
        await display.reload({
            waitUntil: "domcontentloaded",
            timeout: 30_000,
        });
        await expect(board).toBeVisible({ timeout: 30_000 });
        await expect.poll(() => publicView()).toEqual(receiverPeek);
        await receiver.page
            .getByRole("button", { name: "Carol", exact: true })
            .click();
        await receiver.page
            .getByTestId("cockroach-poker-claim")
            .getByRole("button", { name: label(falseClaim), exact: true })
            .click();
        await receiver.page.screenshot({
            path: testInfo.outputPath("phone-peek.png"),
            fullPage: true,
        });
        await receiver.page
            .getByRole("button", { name: "PASS CARD", exact: true })
            .click();
        for (const [index, id] of simulatedIds.entries()) {
            await expect
                .poll(() => publicView()?.offerChain?.currentReceiverId)
                .toBe(id);
            await host.room.switchPlayer(id);
            await host.room.sendGameMessage({
                type: "cockroach_poker:peek_card",
                data: {},
            });
            await expect
                .poll(
                    async () =>
                        (await host.room.gameView<CockroachPokerPlayerView>(id))
                            .offerChain?.peekedCard,
                )
                .toBe(actualCard);
            await host.room.sendGameMessage({
                type: "cockroach_poker:peek_and_pass",
                data: {
                    targetId: simulatedIds[index + 1] ?? finalReceiver.id,
                    newClaim: falseClaim,
                },
            });
        }
        await expect(
            finalReceiver.page.getByRole("button", {
                name: "FALSE",
                exact: true,
            }),
        ).toBeVisible();
        await expect(
            finalReceiver.page.getByRole("button", {
                name: "PEEK & PASS",
                exact: true,
            }),
        ).toHaveCount(0);
        for (const text of frames) {
            const message = JSON.parse(text);
            expect(message.type).toBe("display:state");
            for (const key of [
                "myHand",
                "cardValue",
                "peekedCard",
                "actualCard",
            ])
                expect(text).not.toContain(key);
        }
        await finalReceiver.page
            .getByRole("button", { name: "FALSE", exact: true })
            .click();
        await expect(
            board.getByRole("img", { name: "Correct call", exact: true }),
        ).toBeVisible();
        await expect
            .poll(() => publicView()?.lastResult?.type)
            .toBe("call_resolved");
        expect(publicView()?.lastResult).toMatchObject({
            actualCard,
            cardTakerId: simulatedIds.at(-1),
        });
        const collectionLabel = `${label(actualCard)} 1/4`;
        const collection = board.getByLabel(collectionLabel, { exact: true });
        await expect
            .poll(() =>
                collection
                    .locator("img")
                    .evaluate(
                        (image) =>
                            image instanceof HTMLImageElement &&
                            image.complete &&
                            image.naturalWidth > 0,
                    ),
            )
            .toBe(true);
        await display.screenshot({
            path: testInfo.outputPath("party-reveal.png"),
        });
        await board
            .locator("article")
            .filter({
                has: display.getByLabel(collectionLabel, { exact: true }),
            })
            .screenshot({
                path: testInfo.outputPath("party-collection.png"),
            });
        await finalReceiver.page
            .getByText("Show collections", { exact: true })
            .click();
        const phoneCollection = finalReceiver.page
            .getByTestId("cockroach-poker-board")
            .getByLabel(collectionLabel, { exact: true });
        await expect
            .poll(() =>
                phoneCollection
                    .locator("img")
                    .evaluate(
                        (image) =>
                            image instanceof HTMLImageElement &&
                            image.complete &&
                            image.naturalWidth > 0,
                    ),
            )
            .toBe(true);
        await finalReceiver.page
            .getByTestId("cockroach-poker-board")
            .locator("article")
            .filter({
                has: finalReceiver.page.getByLabel(collectionLabel, {
                    exact: true,
                }),
            })
            .screenshot({
                path: testInfo.outputPath("phone-collection.png"),
            });
        expect(publicView()?.players).toHaveLength(6);
        await expect(board.getByRole("button")).toHaveCount(0);
        expect(
            await display.evaluate(
                () =>
                    document.documentElement.scrollHeight <= window.innerHeight,
            ),
        ).toBe(true);
        for (const player of players)
            expect(
                await player.page.evaluate(
                    () =>
                        document.documentElement.scrollWidth <=
                        window.innerWidth,
                ),
            ).toBe(true);
        expect(errors).toEqual([]);
    } finally {
        await Promise.all(contexts.map((context) => context.close()));
    }
});
