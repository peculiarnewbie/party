import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stagehand } from "@browserbasehq/stagehand";
import {
    STAGEHAND_BASE_URL,
    STAGEHAND_EXECUTABLE_PATH,
    STAGEHAND_VIEWPORT,
} from "../stagehand.config";

export interface LocalServerHandle {
    process: ChildProcess;
    stop: () => Promise<void>;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function startLocalApp(): Promise<LocalServerHandle> {
    const logState = { stdout: "", stderr: "" };
    const baseUrl = new URL(STAGEHAND_BASE_URL);
    const host = baseUrl.hostname;
    const port = baseUrl.port || "3000";
    const child = spawn(
        "pnpm",
        ["run", "dev", "--", "--host", host, "--port", port],
        {
            cwd: path.resolve(__dirname, "../.."),
            stdio: ["ignore", "pipe", "pipe"],
            env: {
                ...process.env,
                FORCE_COLOR: "0",
                NO_COLOR: "1",
            },
        },
    );

    child.stdout?.on("data", (chunk) => {
        logState.stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
        logState.stderr += chunk.toString();
    });

    await waitForServerReady(baseUrl, logState);

    return {
        process: child,
        stop: async () => {
            if (child.exitCode !== null) return;
            child.kill("SIGTERM");
            await new Promise<void>((resolve) => {
                child.once("exit", () => resolve());
                setTimeout(() => {
                    if (child.exitCode === null) {
                        child.kill("SIGKILL");
                    }
                }, 5_000);
            });
        },
    };
}

async function waitForServerReady(
    baseUrl: URL,
    logState: { stdout: string; stderr: string },
) {
    const timeoutAt = Date.now() + 30_000;

    while (Date.now() < timeoutAt) {
        try {
            const response = await fetch(new URL("/", baseUrl));
            if (response.ok) return;
        } catch {}

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
        `Timed out waiting for dev server at ${baseUrl.toString()}\nstdout:\n${logState.stdout}\nstderr:\n${logState.stderr}`,
    );
}

export async function createStagehandSession() {
    const headless = process.env.E2E_HEADLESS !== "0";
    const stagehand = new Stagehand({
        env: "LOCAL",
        disableAPI: true,
        disablePino: true,
        verbose: 0,
        localBrowserLaunchOptions: {
            executablePath: STAGEHAND_EXECUTABLE_PATH,
            headless,
            viewport: STAGEHAND_VIEWPORT,
        },
    });

    await stagehand.init();
    const page = stagehand.context.pages()[0];
    assert(page, "Stagehand did not expose an initial page");
    return { stagehand, page };
}
