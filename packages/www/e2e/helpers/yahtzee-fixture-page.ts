import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import type { YahtzeeFixtureId } from "../../src/game/yahtzee/fixtures";
import {
    createStagehandSession,
    startLocalApp,
    type LocalServerHandle,
} from "./browser-session";
import {
    STAGEHAND_BASE_URL,
    getStagehandArtifactDir,
} from "../stagehand.config";

export { createStagehandSession, startLocalApp };
export type { LocalServerHandle };

export class YahtzeeFixturePage {
    constructor(private readonly page: any) {}

    async gotoFixture(
        fixtureId: YahtzeeFixtureId,
        options: {
            playerId?: string;
            step?: number;
        } = {},
    ) {
        const url = new URL("/dev/yahtzee", STAGEHAND_BASE_URL);
        url.searchParams.set("fixture", fixtureId);
        url.searchParams.set("island", "hidden");
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
        const mode = process.env.E2E_UPDATE_SCREENSHOTS === "1"
            ? "baseline"
            : "current";
        const outputDir = path.join(getStagehandArtifactDir("yahtzee"), mode);
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
