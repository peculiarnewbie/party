import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import http from "node:http";

type E2eSuite = {
    description: string;
    workerFiles: string[];
    browserProjects?: string[];
};

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const pnpmCliPath = process.env.npm_execpath;
const pnpmExecutable = pnpmCliPath ? process.execPath : pnpmCommand;
const pnpmArgs = (args: string[]) =>
    pnpmCliPath ? [pnpmCliPath, ...args] : args;
const pnpmNeedsShell = !pnpmCliPath && process.platform === "win32";

const E2E_SUITES: Record<string, E2eSuite> = {
    poker: {
        description:
            "Real workerd room-sequence coverage for poker start, spectators, reconnect, host controls, and hibernation",
        workerFiles: ["src/worker/poker-room.test.ts"],
        browserProjects: ["poker-seeded", "poker-live"],
    },
    yahtzee: {
        description:
            "Real workerd room-sequence coverage for standard, lying, reconnect, and hibernation flows",
        workerFiles: ["src/worker/yahtzee-room.test.ts"],
        browserProjects: ["yahtzee-seeded", "yahtzee-live"],
    },
    rps: {
        description:
            "Real workerd room-sequence coverage for 8-player RPS tournament, disconnect, and reconnection",
        workerFiles: [
            "src/worker/rps-room.test.ts",
            "src/worker/rps-rpc-room.test.ts",
        ],
        browserProjects: ["rps-seeded", "rps-live"],
    },
    quiz: {
        description:
            "Browser fixture coverage for quiz answer flow, host view, and answer locking",
        workerFiles: ["src/worker/quiz-room.test.ts"],
        browserProjects: ["quiz-seeded", "quiz-live"],
    },
    blackjack: {
        description:
            "Browser coverage for blackjack seeded states and live multiplayer devtools flow",
        workerFiles: ["src/worker/blackjack-room.test.ts"],
        browserProjects: ["blackjack-seeded", "blackjack-live"],
    },
    "six-nimmt": {
        description:
            "6 nimmt simultaneous choices, public display, reconnects, and complete hands",
        workerFiles: ["src/worker/six-nimmt-room.test.ts"],
        browserProjects: ["six-nimmt-live"],
    },
    "go-fish": {
        description: "Live browser and workerd room-start coverage for Go Fish",
        workerFiles: ["src/worker/go-fish-room.test.ts"],
        browserProjects: ["go-fish-live"],
    },
    perudo: {
        description: "Live browser and workerd room-start coverage for Perudo",
        workerFiles: ["src/worker/perudo-room.test.ts"],
        browserProjects: ["perudo-live"],
    },
    herd: {
        description:
            "Live browser and workerd room-start coverage for Herd Mentality",
        workerFiles: ["src/worker/herd-room.test.ts"],
        browserProjects: ["herd-live"],
    },
    "fun-facts": {
        description:
            "Live browser and workerd room-start coverage for Fun Facts",
        workerFiles: ["src/worker/fun-facts-room.test.ts"],
        browserProjects: ["fun-facts-live"],
    },
    "cheese-thief": {
        description:
            "Live browser and workerd room-start coverage for Cheese Thief",
        workerFiles: ["src/worker/cheese-thief-room.test.ts"],
        browserProjects: ["cheese-thief-live"],
    },
    "cockroach-poker": {
        description:
            "Live browser and workerd room-start coverage for Cockroach Poker",
        workerFiles: ["src/worker/cockroach-poker-room.test.ts"],
        browserProjects: ["cockroach-poker-live"],
    },
    "flip-7": {
        description: "Live browser and workerd room-start coverage for Flip 7",
        workerFiles: ["src/worker/flip-7-room.test.ts"],
        browserProjects: ["flip-7-live"],
    },
    skull: {
        description: "Live browser and workerd room-start coverage for Skull",
        workerFiles: ["src/worker/skull-room.test.ts"],
        browserProjects: ["skull-live"],
    },
    spicy: {
        description: "Live browser and workerd room-start coverage for Spicy",
        workerFiles: ["src/worker/spicy-room.test.ts"],
        browserProjects: ["spicy-live"],
    },
};

function printUsage() {
    console.log(
        "Usage: pnpm test:e2e [--browser] [--headed] [--ui] [--update-screenshots] <game|all> [more games]",
    );
    console.log("");
    console.log("Available suites:");
    for (const [name, suite] of Object.entries(E2E_SUITES)) {
        console.log(`- ${name}: ${suite.description}`);
    }
    console.log("");
    console.log("Modes:");
    console.log("- default: runs real workerd E2E suites");
    console.log("- --browser: runs browser fixture suites via Playwright Test");
    console.log(
        "- --headed: browser mode only; shows the actual Chromium window",
    );
    console.log("- --ui: browser mode only; opens Playwright UI mode");
    console.log(
        "- --update-screenshots: browser mode only; refreshes baseline screenshots",
    );
}

function unique<T>(values: T[]) {
    return [...new Set(values)];
}

function httpGet(url: string): Promise<number> {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            resolve(res.statusCode ?? 0);
        });
        req.on("error", reject);
        req.setTimeout(5000, () => {
            req.destroy();
            reject(new Error("timeout"));
        });
    });
}

async function waitForServer(url: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        try {
            const status = await httpGet(url);
            if (status >= 200 && status < 500) return true;
        } catch {}
        await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
}

async function startDevServer(): Promise<ChildProcess> {
    const child = spawn(
        pnpmExecutable,
        pnpmArgs([
            "exec",
            "alchemy",
            "dev",
            "alchemy.run.ts",
            "--stage",
            "test_browser",
        ]),
        {
            stdio: ["ignore", "pipe", "pipe"],
            shell: pnpmNeedsShell,
            env: {
                ...process.env,
                CI: "true",
                CLOUDFLARE_ACCOUNT_ID: "00000000000000000000000000000001",
                CLOUDFLARE_API_TOKEN: "local-development-only",
                FORCE_COLOR: "0",
                NO_COLOR: "1",
            },
        },
    );

    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));

    const ready = await waitForServer("http://127.0.0.1:3000/", 90_000);
    if (!ready) {
        await stopDevServer(child);
        throw new Error("Dev server did not become ready within 90s");
    }

    return child;
}

async function stopDevServer(child: ChildProcess): Promise<void> {
    if (child.exitCode !== null || child.signalCode !== null) return;

    const exited = new Promise<void>((resolve) => {
        child.once("exit", () => resolve());
    });

    if (process.platform === "win32" && child.pid !== undefined) {
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
            stdio: "ignore",
            windowsHide: true,
        });
        await Promise.race([
            exited,
            new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
        ]);
        return;
    }

    child.kill("SIGTERM");

    await Promise.race([
        exited,
        new Promise<void>((resolve) => setTimeout(resolve, 5_000)),
    ]);

    if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
        await Promise.race([
            exited,
            new Promise<void>((resolve) => setTimeout(resolve, 2_000)),
        ]);
    }
}

const args = process.argv.slice(2);
const browserMode = args.includes("--browser");
const headedMode = args.includes("--headed");
const uiMode = args.includes("--ui");
const updateScreenshots = args.includes("--update-screenshots");

if (args.length === 0 || args.includes("--list")) {
    printUsage();
    process.exit(0);
}

const requestedGames = args.filter((arg) => !arg.startsWith("-"));
const selectedGames = requestedGames.includes("all")
    ? Object.keys(E2E_SUITES)
    : requestedGames;

const unknownGames = selectedGames.filter((game) => !(game in E2E_SUITES));
if (unknownGames.length > 0) {
    console.error(`Unknown E2E suite(s): ${unknownGames.join(", ")}`);
    console.error("");
    printUsage();
    process.exit(1);
}

console.log(
    `Running E2E suites: ${selectedGames.join(", ")} (${browserMode ? "browser" : "workerd"})`,
);

if (browserMode) {
    const browserProjects = unique(
        selectedGames.flatMap((game) => {
            return E2E_SUITES[game].browserProjects ?? [];
        }),
    );

    const unsupportedGames = selectedGames.filter(
        (game) => !E2E_SUITES[game].browserProjects?.length,
    );
    if (unsupportedGames.length > 0) {
        console.error(
            `Browser mode is not available for: ${unsupportedGames.join(", ")}`,
        );
        process.exit(1);
    }

    console.log(`Projects: ${browserProjects.join(", ")}`);

    let serverAlreadyRunning = false;
    try {
        const resp = await fetch("http://127.0.0.1:3000/", {
            signal: AbortSignal.timeout(2000),
        });
        serverAlreadyRunning = resp.ok;
    } catch {}

    let server: ChildProcess | null = null;
    if (!serverAlreadyRunning) {
        console.log("Starting dev server...");
        server = await startDevServer();
        console.log("Dev server ready.");
    } else {
        console.log("Reusing existing dev server at http://127.0.0.1:3000");
    }

    const playwrightArgs = [
        "exec",
        "playwright",
        "test",
        "--config=playwright.config.ts",
        ...browserProjects.flatMap((project) => ["--project", project]),
    ];

    if (headedMode) {
        playwrightArgs.push("--headed");
    }

    if (uiMode) {
        playwrightArgs.push("--ui");
    }

    if (updateScreenshots) {
        playwrightArgs.push("--update-snapshots");
    }

    const result = spawnSync(pnpmExecutable, pnpmArgs(playwrightArgs), {
        stdio: "inherit",
        shell: pnpmNeedsShell,
    });

    if (server) {
        await stopDevServer(server);
    }

    process.exitCode = result.status ?? 1;
} else {
    const workerFiles = unique(
        selectedGames.flatMap((game) => E2E_SUITES[game].workerFiles),
    );

    console.log(`Files: ${workerFiles.join(", ")}`);

    const result = spawnSync(
        pnpmExecutable,
        pnpmArgs([
            "exec",
            "vitest",
            "run",
            "--config",
            "vitest.worker.config.ts",
            ...workerFiles,
        ]),
        {
            stdio: "inherit",
            shell: pnpmNeedsShell,
        },
    );

    process.exitCode = result.status ?? 1;
}
