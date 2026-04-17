import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stagehand } from "@browserbasehq/stagehand";
import type { YahtzeeFixtureId } from "../../src/game/yahtzee/fixtures";
import {
    STAGEHAND_ARTIFACT_DIR,
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
    const child = spawn(
        "bun",
        ["run", "dev", "--", "--host", "127.0.0.1", "--port", "3000"],
        {
            cwd: path.resolve(__dirname, "../.."),
            stdio: ["ignore", "pipe", "pipe"],
            env: processEnvWithColorDisabled(),
        },
    );

    child.stdout?.on("data", (chunk) => {
        logState.stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
        logState.stderr += chunk.toString();
    });

    await waitForServerReady(STAGEHAND_BASE_URL, logState);

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

function processEnvWithColorDisabled() {
    return {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
    };
}

async function waitForServerReady(
    baseUrl: string,
    logState: { stdout: string; stderr: string },
) {
    const timeoutAt = Date.now() + 30_000;

    while (Date.now() < timeoutAt) {
        try {
            const response = await fetch(baseUrl);
            if (response.ok) return;
        } catch {}

        await new Promise((resolve) => setTimeout(resolve, 250));
    }

    throw new Error(
        `Timed out waiting for dev server at ${baseUrl}\nstdout:\n${logState.stdout}\nstderr:\n${logState.stderr}`,
    );
}

export async function createStagehandSession() {
    const headless = process.env.YAHTZEE_HEADLESS !== "0";
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

export class YahtzeeFixturePage {
    constructor(private readonly page: any) {}

    async gotoFixture(
        fixtureId: YahtzeeFixtureId,
        options: {
            playerId?: string;
            step?: number;
        } = {},
    ) {
        const url = new URL("/dev/yahtzee-fixture", STAGEHAND_BASE_URL);
        url.searchParams.set("fixture", fixtureId);
        if (options.playerId) {
            url.searchParams.set("playerId", options.playerId);
        }
        if (options.step) {
            url.searchParams.set("step", String(options.step));
        }

        await this.page.goto(url.toString(), {
            waitUntil: "networkidle",
        });
        await this.page.waitForSelector('[data-testid="yahtzee-room"]');
        await this.waitForWindowState();
    }

    async waitForVisible(testId: string) {
        await this.page.waitForSelector(`[data-testid="${testId}"]`);
    }

    async textContent(testId: string) {
        return this.page.locator(`[data-testid="${testId}"]`).textContent();
    }

    async count(testId: string) {
        return this.page.locator(`[data-testid="${testId}"]`).count();
    }

    async isVisible(testId: string) {
        return this.page.locator(`[data-testid="${testId}"]`).isVisible();
    }

    async click(testId: string) {
        await this.page.locator(`[data-testid="${testId}"]`).click();
    }

    async getAttribute(testId: string, attributeName: string) {
        return this.page.evaluate(
            (
                {
                    selector,
                    attributeName,
                }: { selector: string; attributeName: string },
            ) => {
                const element = document.querySelector(selector);
                return element?.getAttribute(attributeName) ?? null;
            },
            {
                selector: `[data-testid="${testId}"]`,
                attributeName,
            },
        );
    }

    async isEnabled(testId: string) {
        return this.page.evaluate((selector: string) => {
            const element = document.querySelector(selector);
            if (!(element instanceof HTMLButtonElement)) return false;
            return !element.disabled;
        }, `[data-testid="${testId}"]`);
    }

    async sentMessages() {
        return this.page.evaluate(() => window.__YAHTZEE_FIXTURE__?.sentMessages ?? []);
    }

    async hostActions() {
        return this.page.evaluate(() => window.__YAHTZEE_FIXTURE__?.hostActions ?? []);
    }

    async takeScreenshot(name: string, testId?: string) {
        const mode = process.env.YAHTZEE_UPDATE_SCREENSHOTS === "1"
            ? "baseline"
            : "current";
        const outputDir = path.join(STAGEHAND_ARTIFACT_DIR, mode);
        await fs.mkdir(outputDir, { recursive: true });
        const outputPath = path.join(outputDir, `${name}.png`);

        if (testId) {
            const clip = await this.page.evaluate((selector: string) => {
                const element = document.querySelector(selector);
                if (!element) return null;
                const rect = element.getBoundingClientRect();
                return {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                };
            }, `[data-testid="${testId}"]`);
            assert(clip, `Could not find ${testId} for screenshot`);
            await this.page.screenshot({ path: outputPath, clip });
            return outputPath;
        }

        await this.page.screenshot({ path: outputPath, fullPage: true });
        return outputPath;
    }

    private async waitForWindowState() {
        const timeoutAt = Date.now() + 10_000;

        while (Date.now() < timeoutAt) {
            const hasState = await this.page.evaluate(
                () => Boolean(window.__YAHTZEE_FIXTURE__),
            );
            if (hasState) return;
            await this.page.waitForTimeout(100);
        }

        throw new Error("Timed out waiting for fixture state to initialize");
    }
}
