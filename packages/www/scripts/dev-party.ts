import assert from "node:assert/strict";
import { chromium, type Browser, type Page } from "playwright";
import { customAlphabet } from "nanoid";
import {
    startLocalApp,
    type LocalServerHandle,
} from "../e2e/helpers/browser-session";
import { STAGEHAND_EXECUTABLE_PATH } from "../e2e/stagehand.config";

type CliArgs = {
    players: number;
    game: string | null;
    start: boolean;
    room: string | null;
    url: string;
    headless: boolean;
    screenWidth: number;
    screenHeight: number;
};

const HELP = `
Launch N browser windows joined to the same room, for fast local multiplayer testing.

Usage:
  pnpm --filter www dev:party -- [options]

Options:
  -p, --players <n>     How many browser windows (default: 2, max: 10)
  -g, --game <id>       Pre-select a game (yahtzee, poker, backwards_poker, go_fish,
                        blackjack, perudo, rps, herd, fun_facts, cheese_thief,
                        cockroach_poker, flip_7, skull, spicy, quiz)
  -s, --start           Auto-start the game once everyone has joined
  -r, --room <code>     Use a specific room code (default: random 6-char)
      --url <url>       Point at a running server (default: http://localhost:3000).
                        If localhost and the server is not up, the dev server is started.
      --headless        Run headless (no visible windows)
      --screen-width    Desktop width for window tiling (default: 1920)
      --screen-height   Desktop height for window tiling (default: 1080)
  -h, --help            Show this help

Examples:
  pnpm --filter www dev:party
  pnpm --filter www dev:party -- -p 4 -g yahtzee -s
  pnpm --filter www dev:party -- --players 3 --game rps --room test01
`;

function parseArgs(): CliArgs {
    const argv = process.argv.slice(2).filter((a) => a !== "--");
    const out: CliArgs = {
        players: 2,
        game: null,
        start: false,
        room: null,
        url: process.env.PARTY_URL ?? "http://localhost:3000",
        headless: false,
        screenWidth: 1920,
        screenHeight: 1080,
    };

    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const takeNext = () => {
            const next = argv[++i];
            if (next === undefined) {
                console.error(`Missing value for ${a}`);
                process.exit(1);
            }
            return next;
        };

        switch (a) {
            case "-p":
            case "--players":
                out.players = Number(takeNext());
                break;
            case "-g":
            case "--game":
                out.game = takeNext().replace(/-/g, "_");
                break;
            case "-s":
            case "--start":
                out.start = true;
                break;
            case "-r":
            case "--room":
                out.room = takeNext().toLowerCase();
                break;
            case "--url":
                out.url = takeNext();
                break;
            case "--headless":
                out.headless = true;
                break;
            case "--screen-width":
                out.screenWidth = Number(takeNext());
                break;
            case "--screen-height":
                out.screenHeight = Number(takeNext());
                break;
            case "-h":
            case "--help":
                console.log(HELP.trim());
                process.exit(0);
                break;
            default:
                if (/^\d+$/.test(a) && argv.indexOf("-p") === -1 && argv.indexOf("--players") === -1) {
                    out.players = Number(a);
                    break;
                }
                console.error(`Unknown argument: ${a}`);
                console.log(HELP.trim());
                process.exit(1);
        }
    }

    assert(
        Number.isInteger(out.players) && out.players >= 1 && out.players <= 10,
        "players must be an integer between 1 and 10",
    );
    return out;
}

const generateRoomId = customAlphabet(
    "0123456789abcdefghijklmnopqrstuvwxyz",
    6,
);

const DEFAULT_NAMES = [
    "Alice",
    "Bob",
    "Carol",
    "Dave",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
    "Isla",
    "Jack",
];

interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

function gridLayout(n: number, screenW: number, screenH: number): Rect[] {
    const cols = n <= 2 ? n : Math.ceil(Math.sqrt(n));
    const rows = Math.ceil(n / cols);
    const w = Math.floor(screenW / cols);
    const h = Math.floor(screenH / rows);
    return Array.from({ length: n }, (_, i) => ({
        x: (i % cols) * w,
        y: Math.floor(i / cols) * h,
        w,
        h,
    }));
}

async function isServerUp(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, {
            signal: AbortSignal.timeout(1500),
        });
        return response.ok;
    } catch {
        return false;
    }
}

interface PlayerSession {
    browser: Browser;
    page: Page;
    name: string;
    index: number;
}

async function launchPlayer({
    index,
    rect,
    url,
    roomId,
    name,
    headless,
}: {
    index: number;
    rect: Rect;
    url: string;
    roomId: string;
    name: string;
    headless: boolean;
}): Promise<PlayerSession> {
    const browser = await chromium.launch({
        executablePath: STAGEHAND_EXECUTABLE_PATH,
        headless,
        args: [
            `--window-position=${rect.x},${rect.y}`,
            `--window-size=${rect.w},${rect.h}`,
            "--no-first-run",
            "--no-default-browser-check",
        ],
    });

    const context = await browser.newContext({
        viewport: headless ? { width: rect.w, height: rect.h } : null,
    });
    const page = await context.newPage();

    const roomUrl = new URL(`/room/${roomId}`, url).toString();
    await page.goto(roomUrl, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="room-lobby"]', { timeout: 15_000 });
    await page.locator('[data-testid="room-name-input"]').fill(name);
    await page.locator('[data-testid="room-join-button"]').click();
    await page.waitForSelector('[data-testid="room-leave-button"]', {
        timeout: 15_000,
    });

    process.stdout.write(`  joined: ${name} (window ${index + 1})\n`);
    return { browser, page, name, index };
}

async function main() {
    const args = parseArgs();
    const roomId = args.room ?? generateRoomId();
    const parsedUrl = new URL(args.url);
    const isLocal =
        parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

    let server: LocalServerHandle | null = null;
    if (isLocal && !(await isServerUp(args.url))) {
        process.stdout.write("Starting dev server...\n");
        server = await startLocalApp();
    } else if (isLocal) {
        process.stdout.write(`Reusing dev server at ${args.url}\n`);
    } else {
        process.stdout.write(`Targeting ${args.url}\n`);
    }

    const roomUrl = new URL(`/room/${roomId}`, args.url).toString();
    process.stdout.write(`\nRoom code: ${roomId.toUpperCase()}\n`);
    process.stdout.write(`Room URL:  ${roomUrl}\n\n`);

    const positions = gridLayout(
        args.players,
        args.screenWidth,
        args.screenHeight,
    );
    const names = Array.from(
        { length: args.players },
        (_, i) => DEFAULT_NAMES[i] ?? `Player${i + 1}`,
    );

    process.stdout.write(`Launching ${args.players} browser window(s)...\n`);

    let sessions: PlayerSession[] = [];
    try {
        sessions = await Promise.all(
            positions.map((rect, i) =>
                launchPlayer({
                    index: i,
                    rect,
                    url: args.url,
                    roomId,
                    name: names[i],
                    headless: args.headless,
                }),
            ),
        );
    } catch (error) {
        console.error("Failed to launch players:", error);
        await Promise.all(sessions.map((s) => s.browser.close().catch(() => {})));
        await server?.stop();
        process.exit(1);
    }

    const host = sessions[0];

    if (args.game) {
        const testId = `room-game-option-${args.game}`;
        const locator = host.page.locator(`[data-testid="${testId}"]`);
        const count = await locator.count();
        if (count === 0) {
            console.error(
                `Unknown game: "${args.game}". No [data-testid="${testId}"] found in lobby.`,
            );
        } else {
            process.stdout.write(`Host selecting game: ${args.game}\n`);
            await locator.click();
        }
    }

    if (args.start) {
        process.stdout.write("Waiting for start button to enable...\n");
        await host.page.waitForFunction(
            () => {
                const btn = document.querySelector(
                    '[data-testid="room-start-button"]',
                ) as HTMLButtonElement | null;
                return !!btn && !btn.disabled;
            },
            null,
            { timeout: 15_000 },
        );
        await host.page.locator('[data-testid="room-start-button"]').click();
        process.stdout.write("Game started.\n");
    }

    process.stdout.write("\nBrowsers are live. Press Ctrl+C to close everything.\n");

    let shuttingDown = false;
    const shutdown = async (signal: NodeJS.Signals) => {
        if (shuttingDown) return;
        shuttingDown = true;
        process.stdout.write(`\nReceived ${signal}, shutting down...\n`);
        await Promise.all(sessions.map((s) => s.browser.close().catch(() => {})));
        await server?.stop();
        process.exit(0);
    };

    process.on("SIGINT", () => void shutdown("SIGINT"));
    process.on("SIGTERM", () => void shutdown("SIGTERM"));

    await new Promise<void>(() => {});
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
