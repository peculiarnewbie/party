import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
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
        waitUntil: "domcontentloaded",
        timeout: 30000,
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

async function waitForMyTurn(page: Page) {
    await page.waitForFunction(() => {
        const banner = document.querySelector('[data-testid="poker-turn-banner"]');
        return banner?.textContent?.includes("YOUR TURN");
    });
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
            await waitForMyTurn(alice.page);

            await expect(alice.page.locator('[data-testid="poker-fold-button"]')).toBeEnabled();
            await alice.page.locator('[data-testid="poker-fold-button"]').click();

            await expect(
                bob.page.locator('[data-testid="poker-seat-' + alice.playerId + '"]'),
            ).toHaveAttribute("data-status", "folded", { timeout: 15000 });

            await expect(alice.page.getByTestId("poker-street")).toContainText(/HAND OVER/i, { timeout: 15000 });
            await expect(bob.page.getByTestId("poker-street")).toContainText(/HAND OVER/i, { timeout: 15000 });
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

                await expect(dana.page.getByTestId("poker-hero-hand")).toContainText(/Spectating/);

                await expect(
                    dana.page.locator('[data-testid="poker-fold-button"]'),
                ).toHaveCount(0);
                await expect(
                    dana.page.locator('[data-testid="poker-check-call-button"]'),
                ).toHaveCount(0);
                await expect(
                    dana.page.locator('[data-testid="poker-spectator-copy"]'),
                ).toBeVisible();

                await expect(
                    alice.page.getByTestId("poker-spectator-list"),
                ).toContainText(/Dana/);
            } finally {
                await closePlayers([dana]);
            }
        } finally {
            await closePlayers([alice, bob]);
        }
    });
});
