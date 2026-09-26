import { test, expect } from "@playwright/test";
import { nanoid } from "nanoid";
import { MultiplayerRoomPage } from "./helpers/multiplayer-room-page";
import { defineLiveGameSmoke } from "./helpers/live-game-smoke";

function createRoomId(prefix: string) {
    return `${prefix}-${nanoid(6).toLowerCase()}`;
}

test.describe("poker-live", () => {
    for (const gameType of ["poker", "backwards_poker"] as const) {
        test(`${gameType} Party mode display and phone controls stay in sync without exposing private cards`, async ({
            page,
            browser,
        }, testInfo) => {
            const roomId = createRoomId("poker-party");
            await page.setViewportSize({ width: 390, height: 844 });
            await page.goto(`/room/${roomId}?view=controller`);
            const host = new MultiplayerRoomPage(page);
            await host.waitForDevtools();
            await expect(page.getByTestId("room-join-button")).toBeVisible();
            const aliceId = await host.joinAsBrowser("Alice");

            await expect(
                page.getByRole("heading", { name: "Party mode", exact: true }),
            ).toBeVisible();
            await expect(
                page.getByRole("link", { name: "Open Party screen" }),
            ).toHaveAttribute("href", `/room/${roomId}?view=display`);

            const display = await page.context().newPage();
            await display.setViewportSize({ width: 1440, height: 1000 });
            const received: string[] = [];
            const sent: string[] = [];
            display.on("websocket", (socket) => {
                if (!socket.url().includes(`/api/room/${roomId}`)) return;
                socket.on("framereceived", (frame) =>
                    received.push(String(frame.payload)),
                );
                socket.on("framesent", (frame) =>
                    sent.push(String(frame.payload)),
                );
            });
            await display.goto(`/room/${roomId}?view=display`);
            await expect(display.getByTestId("party-display")).toContainText(
                "Party mode",
            );
            await expect(display.getByTestId("join-qr")).toBeVisible();
            await expect(display.getByText("Players · 1")).toBeVisible();
            const joinLink = await display
                .locator('a[href*="view=controller"]')
                .getAttribute("href");
            if (!joinLink) throw new Error("Missing phone join link");

            const guestContext = await browser.newContext({
                viewport: { width: 390, height: 844 },
            });
            const guest = await guestContext.newPage();
            try {
                await guest.goto(joinLink);
                const bob = new MultiplayerRoomPage(guest);
                await bob.waitForDevtools();
                const bobId = await bob.joinAsBrowser("Bob");
                await expect(display.getByText("Players · 2")).toBeVisible();
                await host.selectGame(gameType);
                await host.startGame();
                await expect(
                    display.getByTestId("poker-table-display"),
                ).toBeVisible();
                await expect(page.getByTestId("poker-room")).toHaveAttribute(
                    "data-layout",
                    "controller",
                );
                await expect(guest.getByTestId("poker-room")).toHaveAttribute(
                    "data-layout",
                    "controller",
                );
                await expect(
                    display.getByRole("heading", {
                        name:
                            gameType === "backwards_poker"
                                ? "Backwards Poker"
                                : "Texas Hold’em",
                        exact: true,
                    }),
                ).toBeVisible();
                if (gameType === "backwards_poker") {
                    await expect(
                        page.getByTestId(`poker-opponent-hand-${bobId}`),
                    ).toHaveAttribute("data-visible-card-count", "2");
                    await expect(
                        guest.getByTestId(`poker-opponent-hand-${aliceId}`),
                    ).toHaveAttribute("data-visible-card-count", "2");
                    await expect(
                        page.getByTestId(`poker-opponent-hand-${aliceId}`),
                    ).toHaveCount(0);
                    await expect(
                        guest.getByTestId(`poker-opponent-hand-${bobId}`),
                    ).toHaveCount(0);
                    await expect(
                        page.getByTestId("poker-hero-hand"),
                    ).toHaveCount(0);
                } else {
                    await expect(
                        page.getByTestId("poker-opponent-hands"),
                    ).toHaveCount(0);
                    await expect(
                        page.getByTestId("poker-hero-hand"),
                    ).toBeVisible();
                }
                await expect(
                    display.getByTestId(`display-seat-${aliceId}`),
                ).toHaveAttribute("data-visible-card-count", "0");
                await expect(
                    display.getByTestId(`display-seat-${bobId}`),
                ).toHaveAttribute("data-visible-card-count", "0");
                await expect(
                    display.getByTestId("poker-hero-hand"),
                ).toHaveCount(0);
                await expect(
                    display.getByTestId("poker-action-controls"),
                ).toHaveCount(0);
                await expect(
                    page.getByTestId(`poker-seat-${bobId}`),
                ).toHaveCount(0);
                await page
                    .getByRole("button", { name: "View table", exact: true })
                    .click();
                await expect(
                    page.getByTestId(`poker-seat-${bobId}`),
                ).toBeVisible();
                await page
                    .getByRole("button", {
                        name: "Party mode",
                        exact: true,
                    })
                    .click();

                await display.reload();
                await expect(
                    display.getByTestId("poker-table-display"),
                ).toBeVisible();
                const aliceActing = await display
                    .getByTestId(`display-seat-${aliceId}`)
                    .getAttribute("data-acting");
                const actor = aliceActing === "true" ? page : guest;
                const other = aliceActing === "true" ? guest : page;
                await actor.getByTestId("poker-check-call-button").click();
                await other.getByTestId("poker-check-call-button").click();
                await expect(display.getByText(/Hand 1 · flop/)).toBeVisible();
                expect(
                    await page
                        .getByTestId("poker-controller-context")
                        .locator("svg")
                        .evaluateAll((cards) =>
                            cards.every(
                                (card) =>
                                    card.getBoundingClientRect().width <= 32,
                            ),
                        ),
                ).toBe(true);
                await display.screenshot({
                    path: testInfo.outputPath("party-display.png"),
                });
                await page.screenshot({
                    path: testInfo.outputPath("phone-controller.png"),
                });
                const aliceOnFlop = await display
                    .getByTestId(`display-seat-${aliceId}`)
                    .getAttribute("data-acting");
                await (aliceOnFlop === "true" ? page : guest)
                    .getByTestId("poker-fold-button")
                    .click();
                await expect(
                    display.getByText(/won \d+ chips uncontested/),
                ).toBeVisible();
                expect(sent).toEqual([]);
                expect(received.length).toBeGreaterThan(0);
                for (const raw of received) {
                    const message = JSON.parse(raw);
                    expect(message.type).toBe("display:state");
                    if (message.data.poker) {
                        expect(message.data.poker).not.toHaveProperty(
                            "myHoleCards",
                        );
                        expect(message.data.poker).not.toHaveProperty("deck");
                    }
                }
                await page.getByTestId("poker-end-button").click();
                await page.getByTestId("poker-return-button").click();
                await expect(display.getByTestId("join-qr")).toBeVisible();
                const nextGame =
                    gameType === "poker" ? "backwards_poker" : "poker";
                await host.selectGame(nextGame);
                await host.startGame();
                await expect(
                    display.getByRole("heading", {
                        name:
                            nextGame === "backwards_poker"
                                ? "Backwards Poker"
                                : "Texas Hold’em",
                        exact: true,
                    }),
                ).toBeVisible();
                if (nextGame === "backwards_poker") {
                    await expect(
                        page.getByTestId(`poker-opponent-hand-${bobId}`),
                    ).toHaveAttribute("data-visible-card-count", "2");
                    await expect(
                        page.getByTestId("poker-hero-hand"),
                    ).toHaveCount(0);
                } else {
                    await expect(
                        page.getByTestId("poker-opponent-hands"),
                    ).toHaveCount(0);
                    await expect(
                        page.getByTestId("poker-hero-hand"),
                    ).toBeVisible();
                }
                await expect(
                    display.getByTestId(`display-seat-${aliceId}`),
                ).toHaveAttribute("data-visible-card-count", "0");
                await expect(
                    display.getByTestId(`display-seat-${bobId}`),
                ).toHaveAttribute("data-visible-card-count", "0");
            } finally {
                await guestContext.close();
                await display.close();
            }
        });
    }

    test("Party mode display fits a full eight-player table at 1080p", async ({
        page,
    }, testInfo) => {
        const room = new MultiplayerRoomPage(page);
        const roomId = createRoomId("poker-shared-full");
        await room.gotoRoom(roomId);
        await room.joinAsBrowser("Alice");
        await room.addPlayersAndJoin(7);
        await room.waitForJoined(8);
        await room.selectGame("poker");
        await room.startGame();
        const display = await page.context().newPage();
        try {
            await display.setViewportSize({ width: 1920, height: 1080 });
            await display.goto(`/room/${roomId}?view=display`);
            const seats = display.locator('[data-testid^="display-seat-"]');
            await expect(seats).toHaveCount(8);
            expect(
                await seats.evaluateAll((elements) =>
                    Math.max(
                        ...elements.map(
                            (element) => element.getBoundingClientRect().bottom,
                        ),
                    ),
                ),
            ).toBeLessThanOrEqual(1080);
            await display.screenshot({
                path: testInfo.outputPath("full-table.png"),
            });
        } finally {
            await display.close();
        }
    });

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
        await expect(page.getByTestId("poker-street")).toContainText(
            /HAND OVER/i,
            {
                timeout: 15_000,
            },
        );

        await room.switchPlayer(aliceId);
        await expect(page.getByTestId("poker-street")).toContainText(
            /HAND OVER/i,
            {
                timeout: 15_000,
            },
        );
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

        await expect(page.getByTestId("poker-hero-hand")).toContainText(
            /Spectating/,
        );
        await expect(
            page.locator('[data-testid="poker-fold-button"]'),
        ).toHaveCount(0);
        await expect(
            page.locator('[data-testid="poker-check-call-button"]'),
        ).toHaveCount(0);
        await expect(page.getByTestId("poker-spectator-copy")).toBeVisible();

        await room.switchPlayer(aliceId);
        await expect(page.getByTestId("poker-spectator-list")).toContainText(
            /Dana/,
        );
    });
});

defineLiveGameSmoke({
    gameType: "backwards_poker",
    playerCount: 2,
    roomTestId: "poker-room",
});
