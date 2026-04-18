import assert from "node:assert/strict";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { nanoid } from "nanoid";
import { startLocalApp } from "./helpers/browser-session";
import {
    STAGEHAND_BASE_URL,
    STAGEHAND_EXECUTABLE_PATH,
    STAGEHAND_VIEWPORT,
} from "./stagehand.config";

type PlayerSession = {
    context: BrowserContext;
    page: Page;
    name: string;
    playerId: string;
};

async function createBrowser() {
    return chromium.launch({
        executablePath: STAGEHAND_EXECUTABLE_PATH,
        headless: process.env.E2E_HEADLESS !== "0",
    });
}

function createRoomId(prefix: string) {
    return `${prefix}-${nanoid(6).toLowerCase()}`;
}

async function createPlayer(
    browser: Browser,
    roomId: string,
    name: string,
): Promise<PlayerSession> {
    const context = await browser.newContext({
        viewport: STAGEHAND_VIEWPORT,
    });
    const page = await context.newPage();
    await page.goto(new URL(`/room/${roomId}`, STAGEHAND_BASE_URL).toString(), {
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
    assert(playerId, `Missing playerId cookie for ${name}`);

    return {
        context,
        page,
        name,
        playerId,
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

async function runFoldPropagation(browser: Browser) {
    process.stdout.write("Running live-fold-propagation...\n");
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

        assert.equal(
            await alice.page.locator('[data-testid="poker-call-button"]').isDisabled(),
            true,
        );
        assert.equal(
            await bob.page.locator('[data-testid="poker-call-button"]').isDisabled(),
            true,
        );
    } finally {
        await closePlayers([alice, bob]);
    }
}

async function runSpectatorJoin(browser: Browser) {
    process.stdout.write("Running live-spectator-join...\n");
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

            assert.equal(
                await dana.page.locator('[data-testid="poker-fold-button"]').count(),
                0,
            );
            assert.match(
                await text(dana.page, "poker-hero-status"),
                /SPECTATING/,
            );
            assert.match(
                await text(alice.page, "poker-spectator-list"),
                /Dana/,
            );
            assert.equal(
                await getAttr(dana.page, "poker-hero-hand", "data-visible-card-count"),
                "0",
            );
        } finally {
            await closePlayers([dana]);
        }
    } finally {
        await closePlayers([alice, bob]);
    }
}

async function main() {
    const server = await startLocalApp();
    const browser = await createBrowser();

    try {
        await runFoldPropagation(browser);
        await runSpectatorJoin(browser);
        process.stdout.write("Passed 2 live browser poker room checks.\n");
    } finally {
        await browser.close();
        await server.stop();
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
