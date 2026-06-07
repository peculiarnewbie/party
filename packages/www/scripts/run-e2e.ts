import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import http from "node:http";

type E2eSuite = {
    description: string;
    workerFiles: string[];
    browserProjects?: string[];
};

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
        browserProjects: ["yahtzee-seeded"],
    },
    rps: {
        description:
            "Real workerd room-sequence coverage for 8-player RPS tournament, disconnect, and reconnection",
        workerFiles: ["src/worker/rps-room.test.ts"],
        browserProjects: ["rps-seeded"],
    },
    quiz: {
        description:
            "Browser fixture coverage for quiz answer flow, host view, and answer locking",
        workerFiles: [],
        browserProjects: ["quiz-seeded"],
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
    console.log("- --headed: browser mode only; shows the actual Chromium window");
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
    const child = spawn("npx", ["vite", "dev", "--host", "127.0.0.1", "--port", "3000"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" },
    });

    child.stdout?.on("data", (d) => process.stdout.write(d));
    child.stderr?.on("data", (d) => process.stderr.write(d));

    const ready = await waitForServer("http://127.0.0.1:3000/", 60_000);
    if (!ready) {
        child.kill("SIGTERM");
        throw new Error("Dev server did not become ready within 60s");
    }

    return child;
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
        (game) => !(E2E_SUITES[game].browserProjects?.length),
    );
    if (unsupportedGames.length > 0) {
        console.error(
            `Browser mode is not available for: ${unsupportedGames.join(", ")}`,
        );
        process.exit(1);
    }

    console.log(`Projects: ${browserProjects.join(", ")}`);

    // Check if server is already running
    let serverAlreadyRunning = false;
    try {
        const resp = await fetch("http://127.0.0.1:3000/", { signal: AbortSignal.timeout(2000) });
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

    const result = spawnSync("pnpm", playwrightArgs, {
        stdio: "inherit",
    });

    if (server) {
        server.kill("SIGTERM");
    }

    process.exit(result.status ?? 1);
}

const workerFiles = unique(
    selectedGames.flatMap((game) => E2E_SUITES[game].workerFiles),
);

console.log(`Files: ${workerFiles.join(", ")}`);

const result = spawnSync(
    "pnpm",
    [
        "exec",
        "vitest",
        "run",
        "--config",
        "vitest.worker.config.ts",
        ...workerFiles,
    ],
    {
        stdio: "inherit",
    },
);

process.exit(result.status ?? 1);
