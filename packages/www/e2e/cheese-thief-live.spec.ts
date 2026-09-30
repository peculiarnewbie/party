import { expect, test } from "@playwright/test";

import type {
    CheeseThiefClientMessage,
    CheeseThiefPlayerView,
} from "../src/game/cheese-thief";
import { defineLiveGameSmoke, startLiveGame } from "./helpers/live-game-smoke";
import {
    MultiplayerRoomPage,
    type PlayerGameMessage,
} from "./helpers/multiplayer-room-page";
import type { DisplayState } from "../src/room/display-protocol";

defineLiveGameSmoke({
    gameType: "cheese_thief",
    playerCount: 4,
    roomTestId: "cheese-thief-room",
});

test("cheese thief Party play keeps eight players private until the shared reveal", async ({
    browser,
    baseURL,
}, testInfo) => {
    test.setTimeout(180_000);
    const contexts = await Promise.all(
        Array.from({ length: 5 }, () =>
            browser.newContext({ viewport: { width: 390, height: 844 } }),
        ),
    );
    const errors: string[] = [];
    try {
        const roomId = `party-cheese-${crypto.randomUUID().slice(0, 8)}`;
        const players = [];
        for (const [index, name] of [
            "Host",
            "Alice",
            "Bob",
            "Charlie",
        ].entries()) {
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
        const host = players[0];
        const simulatedIds = [];
        for (const name of ["Dana", "Eli", "Freya", "Gabe"])
            simulatedIds.push(await host.room.addPlayerAndJoin(name));
        await host.room.waitForConnected(5);
        const display = await contexts[4].newPage();
        await display.setViewportSize({ width: 1920, height: 1080 });
        display.on("pageerror", (error) => errors.push(error.message));
        let publicState: DisplayState | null = null;
        const frames: string[] = [];
        display.on("websocket", (socket) =>
            socket.on("framereceived", (frame) => {
                const text = String(frame.payload);
                frames.push(text);
                const message = JSON.parse(text);
                if (message.type === "display:state")
                    publicState = message.data;
            }),
        );
        const publicView = () =>
            publicState?.game?.type === "cheese_thief"
                ? publicState.game.view
                : null;
        await display.goto(`${baseURL}/room/${roomId}?view=display`, {
            waitUntil: "domcontentloaded",
        });
        await expect.poll(() => publicState?.players.length).toBe(8);
        await host.room.selectGame("cheese_thief");
        await host.room.startGame();
        const board = display.getByTestId("cheese-thief-table-display");
        await expect(board.getByText("Check your secret role")).toBeVisible();
        const ids = [...players.map((player) => player.id), ...simulatedIds];
        const views = await Promise.all([
            ...players.map((player) =>
                player.room.waitForGameView<CheeseThiefPlayerView>(),
            ),
            ...simulatedIds.map((id) =>
                host.room.waitForGameView<CheeseThiefPlayerView>(id),
            ),
        ]);
        const thief = views.find((view) => view.myRole === "thief")!;
        for (const player of players) {
            await expect(
                player.page.getByTestId("cheese-thief-private-clue"),
            ).toHaveCount(0);
            await player.page
                .getByRole("button", { name: /SHOW MY ROLE/ })
                .click();
            const view = views.find((view) => view.myId === player.id)!;
            await expect(
                player.page.getByRole("img", {
                    name: `Wake time ${view.myDieValue}`,
                }),
            ).toBeVisible();
        }
        await host.page.screenshot({
            path: testInfo.outputPath("phone-clue.png"),
        });
        await display.screenshot({
            path: testInfo.outputPath("party-night.png"),
        });
        await host.page
            .getByRole("button", { name: "BEGIN DISCUSSION", exact: true })
            .click();
        await expect(board.getByText("Who stole the cheese?")).toBeVisible();
        for (const player of players)
            await expect(
                player.page.getByTestId("cheese-thief-private-clue"),
            ).toHaveCount(0);
        await host.page
            .getByRole("button", { name: "START VOTING", exact: true })
            .click();
        await expect(board.getByText("Vote on your phone")).toBeVisible();
        await expect(
            host.page.getByRole("button", {
                name: "REVEAL VOTES",
                exact: true,
            }),
        ).toBeDisabled();
        await host.page.screenshot({
            path: testInfo.outputPath("phone-voting.png"),
        });
        for (const player of players) {
            const targetId =
                player.id === thief.myId
                    ? ids.find((id) => id !== thief.myId)!
                    : thief.myId;
            const name = views[0].players.find((p) => p.id === targetId)!.name;
            await player.page
                .getByRole("button", { name, exact: true })
                .click();
            await player.page
                .getByRole("button", { name: "CAST VOTE", exact: true })
                .click();
            await expect(
                player.page.getByRole("button", {
                    name: "CHANGE VOTE",
                    exact: true,
                }),
            ).toBeDisabled();
        }
        for (const id of simulatedIds) {
            await host.room.switchPlayer(id);
            await host.room.sendGameMessage({
                type: "cheese_thief:cast_vote",
                data: {
                    targetId:
                        id === thief.myId
                            ? ids.find((id) => id !== thief.myId)!
                            : thief.myId,
                },
            });
        }
        await host.room.switchPlayer(host.id);
        await expect(board.getByTestId("display-vote-count")).toHaveText(
            "8 / 8 voted",
        );
        for (const key of [
            "myRole",
            "myDieValue",
            "observedPlayer",
            "thiefId",
            "followerIds",
            '"votes"',
        ])
            expect(frames.join("\n")).not.toContain(key);
        await display.reload({ waitUntil: "domcontentloaded" });
        await expect(board.getByTestId("display-vote-count")).toHaveText(
            "8 / 8 voted",
        );
        await host.page
            .getByRole("button", { name: "REVEAL VOTES", exact: true })
            .click();
        await expect(
            board.getByRole("heading", { name: "Sleepyheads win" }),
        ).toBeVisible();
        await expect(
            board.getByTestId("cheese-thief-result-player"),
        ).toHaveCount(8);
        await expect
            .poll(() => publicView()?.result?.voteCounts[thief.myId])
            .toBe(7);
        await expect(
            players[1].page.getByText("Votes and roles are on the big screen."),
        ).toBeVisible();
        await expect(host.page.getByRole("combobox")).toHaveCount(0);
        await expect(board.getByRole("button")).toHaveCount(0);
        await display.reload({ waitUntil: "domcontentloaded" });
        await expect(
            board.getByRole("heading", { name: "Sleepyheads win" }),
        ).toBeVisible();
        for (const player of players)
            expect(
                await player.page.evaluate(
                    () => document.documentElement.scrollWidth,
                ),
            ).toBeLessThanOrEqual(390);
        expect(
            await display.evaluate(() => document.documentElement.scrollHeight),
        ).toBeLessThanOrEqual(1080);
        await display.screenshot({
            path: testInfo.outputPath("party-reveal.png"),
        });
        await host.page.screenshot({
            path: testInfo.outputPath("phone-result.png"),
        });
        await host.page
            .getByRole("button", { name: "PLAY AGAIN", exact: true })
            .click();
        await expect(board.getByText("Check your secret role")).toBeVisible();
        await expect.poll(() => publicView()?.round).toBe(2);
        expect(publicView()?.result).toBeNull();
        expect(publicView()?.votedCount).toBe(0);
        await expect(
            board.getByTestId("cheese-thief-result-player"),
        ).toHaveCount(0);
        for (const player of players)
            await expect(
                player.page.getByTestId("cheese-thief-private-clue"),
            ).toHaveCount(0);
        expect(errors).toEqual([]);
    } finally {
        await Promise.all(contexts.map((context) => context.close()));
    }
});

test("cheese thief preserves secret roles through a full caught-thief round", async ({
    page,
}) => {
    const { room, playerIds } = await startLiveGame(page, {
        gameType: "cheese_thief",
        playerCount: 4,
    });
    const privateViews = await Promise.all(
        playerIds.map((id) => room.waitForGameView<CheeseThiefPlayerView>(id)),
    );
    const thiefView = privateViews.find((view) => view.myRole === "thief")!;
    const thiefId = thiefView.myId;
    const thiefName = thiefView.players.find(
        (player) => player.id === thiefId,
    )!.name;
    expect(privateViews.filter((view) => view.myRole === "thief")).toHaveLength(
        1,
    );
    for (const view of privateViews) {
        expect(view.phase).toBe("night");
        expect(view.thiefName).toBeNull();
        expect(view.voteResult).toBeNull();
    }

    const hostId = privateViews.find((view) => view.isHost)!.myId;
    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "cheese_thief:start_day",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => (await room.gameView<CheeseThiefPlayerView>()).phase)
        .toBe("day");
    await room.sendGameMessage({
        type: "cheese_thief:start_voting",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => (await room.gameView<CheeseThiefPlayerView>()).phase)
        .toBe("voting");

    for (const playerId of playerIds) {
        const targetId =
            playerId === thiefId
                ? playerIds.find((id) => id !== thiefId)!
                : thiefId;
        await room.switchPlayer(playerId);
        await room.sendGameMessage({
            type: "cheese_thief:cast_vote",
            data: { targetId },
        } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
        await expect
            .poll(
                async () =>
                    (await room.gameView<CheeseThiefPlayerView>(playerId))
                        .hasVoted,
            )
            .toBe(true);
    }

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "cheese_thief:reveal_votes",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => (await room.gameView<CheeseThiefPlayerView>()).phase)
        .toBe("reveal");
    const revealedViews = await Promise.all(
        playerIds.map((id) => room.gameView<CheeseThiefPlayerView>(id)),
    );
    for (const view of revealedViews) {
        expect(view.thiefName).toBe(thiefName);
        expect(view.voteResult).toMatchObject({
            thiefCaught: true,
            winningTeam: "sleepyheads",
            thiefId,
        });
        expect(view.voteResult?.voteCounts[thiefId]).toBe(3);
    }

    await room.switchPlayer(hostId);
    await room.sendGameMessage({
        type: "cheese_thief:next_round",
        data: {},
    } satisfies PlayerGameMessage<CheeseThiefClientMessage>);
    await expect
        .poll(async () => {
            const view = await room.gameView<CheeseThiefPlayerView>();
            return `${view.phase}:${view.round}`;
        })
        .toBe("night:2");
    const nextRound = await room.gameView<CheeseThiefPlayerView>();
    expect(nextRound.thiefName).toBeNull();
    expect(nextRound.voteResult).toBeNull();
    expect(nextRound.votedCount).toBe(0);
});
