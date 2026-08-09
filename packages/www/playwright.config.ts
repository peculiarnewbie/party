import { defineConfig, devices } from "@playwright/test";

const isCI = !!process.env.CI;

export default defineConfig({
    testDir: "e2e",
    testMatch: "*.spec.ts",
    fullyParallel: false,
    workers: 4,
    forbidOnly: isCI,
    retries: isCI ? 1 : 0,
    timeout: 30_000,
    reporter: [
        ["list"],
        ["html", { open: "never", outputFolder: "playwright-report" }],
    ],
    use: {
        baseURL: "http://127.0.0.1:3000",
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
        {
            name: "go-fish-live",
            testMatch: "go-fish-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "yahtzee-live",
            testMatch: "yahtzee-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "rps-live",
            testMatch: "rps-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "quiz-live",
            testMatch: "quiz-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "perudo-live",
            testMatch: "perudo-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "herd-live",
            testMatch: "herd-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "fun-facts-live",
            testMatch: "fun-facts-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "cheese-thief-live",
            testMatch: "cheese-thief-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "cockroach-poker-live",
            testMatch: "cockroach-poker-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "flip-7-live",
            testMatch: "flip-7-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "skull-live",
            testMatch: "skull-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
        {
            name: "spicy-live",
            testMatch: "spicy-live.spec.ts",
            use: { viewport: { width: 1440, height: 1200 } },
        },
    ],
});
