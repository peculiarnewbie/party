import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "e2e",
    testMatch: "*.spec.ts",
    fullyParallel: false,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    timeout: 30_000,
    reporter: [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
    ],
    use: {
        baseURL: "http://localhost:3000",
        headless: true,
        trace: "on",
        screenshot: "on",
        video: "retain-on-failure",
        actionTimeout: 10_000,
        navigationTimeout: 15_000,
    },
    projects: [
        {
            name: "rps-seeded",
            testMatch: "rps-seeded.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "poker-seeded",
            testMatch: "poker-seeded.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "yahtzee-seeded",
            testMatch: "yahtzee-seeded.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "quiz-seeded",
            testMatch: "quiz-seeded.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "blackjack-seeded",
            testMatch: "blackjack-seeded.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "poker-live",
            testMatch: "poker-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "blackjack-live",
            testMatch: "blackjack-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
    ],
});
