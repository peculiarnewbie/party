import { spawnSync } from "node:child_process";

type E2eSuite = {
    description: string;
    workerFiles: string[];
    browserScript?: string;
};

const E2E_SUITES: Record<string, E2eSuite> = {
    poker: {
        description:
            "Real workerd room-sequence coverage for poker start, spectators, reconnect, host controls, and hibernation",
        workerFiles: ["src/worker/poker-room.test.ts"],
        browserScript: "e2e/poker-seeded.spec.ts",
    },
    yahtzee: {
        description:
            "Real workerd room-sequence coverage for standard, lying, reconnect, and hibernation flows",
        workerFiles: ["src/worker/yahtzee-room.test.ts"],
        browserScript: "e2e/yahtzee-seeded.spec.ts",
    },
};

function printUsage() {
    console.log(
        "Usage: pnpm test:e2e -- [--browser] [--headed] [--update-screenshots] <game|all> [more games]",
    );
    console.log("");
    console.log("Available suites:");
    for (const [name, suite] of Object.entries(E2E_SUITES)) {
        console.log(`- ${name}: ${suite.description}`);
    }
    console.log("");
    console.log("Modes:");
    console.log("- default: runs real workerd E2E suites");
    console.log("- --browser: runs browser fixture suites when available");
    console.log("- --headed: browser mode only; shows the actual Chromium window");
    console.log(
        "- --update-screenshots: browser mode only; refreshes baseline screenshots",
    );
}

function unique<T>(values: T[]) {
    return [...new Set(values)];
}

const args = process.argv.slice(2);
const browserMode = args.includes("--browser");
const headedMode = args.includes("--headed");
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
    const browserScripts = unique(
        selectedGames.flatMap((game) => {
            const script = E2E_SUITES[game].browserScript;
            return script ? [script] : [];
        }),
    );

    const unsupportedGames = selectedGames.filter(
        (game) => !E2E_SUITES[game].browserScript,
    );
    if (unsupportedGames.length > 0) {
        console.error(
            `Browser mode is not available for: ${unsupportedGames.join(", ")}`,
        );
        process.exit(1);
    }

    console.log(`Scripts: ${browserScripts.join(", ")}`);

    const env = {
        ...process.env,
        ...(headedMode ? { E2E_HEADLESS: "0" } : {}),
        ...(updateScreenshots ? { E2E_UPDATE_SCREENSHOTS: "1" } : {}),
    };

    for (const script of browserScripts) {
        const result = spawnSync("node", ["--import", "tsx", script], {
            stdio: "inherit",
            env,
        });

        if ((result.status ?? 1) !== 0) {
            process.exit(result.status ?? 1);
        }
    }

    process.exit(0);
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
