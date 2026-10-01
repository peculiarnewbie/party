import { expect } from "@playwright/test";
import { MultiplayerRoomPage } from "./multiplayer-room-page";
import type { Browser, Page } from "@playwright/test";
import type { DisplayState } from "../../src/room/display-protocol";

export async function startPartyJourney(
    page: Page,
    browser: Browser,
    baseURL: string | undefined,
    gameType: "skull" | "spicy",
) {
    const errors: string[] = [];
    const roomId = `party-${gameType}-${crypto.randomUUID().slice(0, 8)}`;
    await page.setViewportSize({ width: 390, height: 844 });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${baseURL}/room/${roomId}?view=controller`, {
        waitUntil: "domcontentloaded",
    });
    const room = new MultiplayerRoomPage(page);
    await room.waitForDevtools();
    const hostId = await room.joinAsBrowser("Alice");
    const ids = [hostId];
    for (const name of ["Bob", "Carol", "Dana", "Eli", "Fran"])
        ids.push(await room.addPlayerAndJoin(name));
    await room.waitForJoined(6);
    const hideDevtools = () =>
        page.addStyleTag({
            content:
                '[data-testid="multiplayer-devtools"] { display: none !important; }',
        });
    await hideDevtools();
    const displayContext = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
    });
    const display = await displayContext.newPage();
    display.on("pageerror", (error) => errors.push(error.message));
    let state: DisplayState | null = null;
    const frames: string[] = [];
    display.on(
        "websocket",
        (socket) =>
            socket.url().includes("/api/room/") &&
            socket.on("framereceived", (frame) => {
                const payload = String(frame.payload);
                frames.push(payload);
                const message = JSON.parse(payload);
                if (message.type === "display:state") state = message.data;
            }),
    );
    await display.goto(`${baseURL}/room/${roomId}?view=display`, {
        waitUntil: "domcontentloaded",
    });
    await expect.poll(() => state?.players.length).toBe(6);
    await room.selectGame(gameType);
    await room.startGame();
    await expect(
        display.getByTestId(`${gameType}-table-display`),
    ).toBeVisible();
    return {
        room,
        display,
        displayContext,
        ids,
        state: () => state,
        frames,
        errors,
        hideDevtools,
    };
}

export async function checkPartyLayout(
    phone: Page,
    display: Page,
    gameType: "skull" | "spicy",
    errors: string[],
) {
    await expect(
        display.getByTestId(`${gameType}-table-display`).getByRole("button"),
    ).toHaveCount(0);
    expect(
        await phone.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    ).toBe(true);
    expect(
        await display.evaluate(
            () => document.documentElement.scrollHeight <= window.innerHeight,
        ),
    ).toBe(true);
    expect(errors).toEqual([]);
}

export async function waitForArt(page: Page) {
    await expect
        .poll(() =>
            page
                .locator('img[src^="/cards/spicy/"]')
                .evaluateAll((images) =>
                    images.every(
                        (image) =>
                            (image as HTMLImageElement).complete &&
                            (image as HTMLImageElement).naturalWidth > 0,
                    ),
                ),
        )
        .toBe(true);
}
