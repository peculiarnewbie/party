import { test, expect, chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { nanoid } from "nanoid";
import { E2E_BASE_URL, E2E_VIEWPORT } from "./helpers/e2e.config";

type PlayerSession = {
    context: BrowserContext;
    page: Page;
    name: string;
    playerId: string;
};

function createRoomId(prefix: string) {
    return `${prefix}-${nanoid(6).toLowerCase()}`;
}

async function createPlayer(
    browser: Browser,
    roomId: string,
    name: string,
): Promise<PlayerSession> {
    const context = await browser.newContext({
        viewport: E2E_VIEWPORT,
    });
    const page = await context.newPage();
    await page.goto(new URL(`/room/${roomId}`, E2E_BASE_URL).toString(), {
        waitUntil: "networkidle",
    });
    await page.waitForSelector('[data-testid="room-lobby"]');
    await page.locator('[data-testid="room-name-input"]').fill(name);
    await page.locator('[data-testid="room-join-button"]').click();
    await page.waitForFunction(() => {
        return (
            document.querySelector('[data-testid="room-leave-button"]') !== null ||
            document.querySelector('[data-testid="poker-room"]') !== null
        );
    });

    const cookies = await context.cookies();
    const playerId = cookies.find((cookie) => cookie.name === "playerId")?.value;
    expect(playerId).toBeTruthy();

    return {
        context,
        page,
        name,
        playerId: playerId!,
    };
}

async function startPoker(host: PlayerSession) {
    await host.page.locator('[data-testid="room-game-option-poker"]').click();
    await host.page.locator('[data-testid="room-start-button"]').click();
    await host.page.waitForSelector('[data-testid="poker-room"]');
}

async function waitForPokerRoom(player: PlayerSession) {
    await player.page.waitForSelector('[data-testid="poker-room"]');
}

async function waitForSeatStatus(
    page: Page,
    playerId: string,
    status: string,
) {
    await page.waitForFunction(
        ({ playerId, status }) => {
            const element = document.querySelector(
                `[data-testid="poker-seat-${playerId}"]`,
            );
            return element?.getAttribute("data-status") === status;
        },
        { playerId, status },
    );
}

async function waitForStreet(page: Page, streetLabel: string) {
    await page.waitForFunction((streetLabel: string) => {
        const element = document.querySelector('[data-testid="poker-street"]');
        return element?.textContent?.trim() === streetLabel;
    }, streetLabel);
}

async function text(page: Page, testId: string) {
    return (await page.locator(`[data-testid="${testId}"]`).textContent()) ?? "";
}

async function getAttr(page: Page, testId: string, attr: string) {
    return page.locator(`[data-testid="${testId}"]`).getAttribute(attr);
}

async function closePlayers(players: PlayerSession[]) {
    await Promise.all(players.map((player) => player.context.close()));
}

test.describe("poker-live", () => {
    test("fold propagation", async ({ browser }) => {
        const roomId = createRoomId("poker-live-fold");
        const alice = await createPlayer(browser, roomId, "Alice");
        const bob = await createPlayer(browser, roomId, "Bob");

        try {
            await startPoker(alice);
            await waitForPokerRoom(bob);

            await alice.page.waitForFunction(() => {
                const banner = document.querySelector('[data-testid="poker-turn-banner"]');
                return banner?.textContent?.includes("YOUR TURN");
            });

            await alice.page.locator('[data-testid="poker-fold-button"]').click();

            await Promise.all([
                waitForSeatStatus(alice.page, alice.playerId, "folded"),
                waitForSeatStatus(bob.page, alice.playerId, "folded"),
                waitForStreet(alice.page, "HAND OVER"),
                waitForStreet(bob.page, "HAND OVER"),
            ]);

            await expect(
                alice.page.locator('[data-testid="poker-call-button"]'),
            ).toBeDisabled();
            await expect(
                bob.page.locator('[data-testid="poker-call-button"]'),
            ).toBeDisabled();
        } finally {
            await closePlayers([alice, bob]);
        }
    });

    test("spectator join", async ({ browser }) => {
        const roomId = createRoomId("poker-live-spectator");
        const alice = await createPlayer(browser, roomId, "Alice");
        const bob = await createPlayer(browser, roomId, "Bob");

        try {
            await startPoker(alice);
            await waitForPokerRoom(bob);

            const dana = await createPlayer(browser, roomId, "Dana");
            try {
                await waitForPokerRoom(dana);

                await dana.page.waitForFunction(() => {
                    const hand = document.querySelector('[data-testid="poker-hero-hand"]');
                    return hand?.getAttribute("data-spectator") === "true";
                });

                await expect(
                    dana.page.locator('[data-testid="poker-fold-button"]'),
                ).toHaveCount(0);
                expect(await text(dana.page, "poker-hero-status")).toMatch(
                    /SPECTATING/,
                );
                expect(await text(alice.page, "poker-spectator-list")).toMatch(
                    /Dana/,
                );
                expect(
                    await getAttr(dana.page, "poker-hero-hand", "data-visible-card-count"),
                ).toBe("0");
            } finally {
                await closePlayers([dana]);
            }
        } finally {
            await closePlayers([alice, bob]);
        }
    });
});
