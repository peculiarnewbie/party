import assert from "node:assert/strict";
import {
    PokerFixturePage,
    createStagehandSession,
    startLocalApp,
} from "./helpers/poker-fixture-page";

type TestCase = {
    name: string;
    run: (fixturePage: PokerFixturePage) => Promise<void>;
};

const testCases: TestCase[] = [
    {
        name: "standard-my-turn",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("standard-my-turn");

            assert.equal(
                await fixturePage.textContent("poker-title"),
                "TEXAS HOLD'EM",
            );
            assert.equal(
                await fixturePage.textContent("poker-hand-number"),
                "HAND 7",
            );
            assert.equal(
                await fixturePage.textContent("poker-street"),
                "TURN",
            );
            assert.equal(
                await fixturePage.textContent("poker-turn-banner"),
                "YOUR TURN",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "poker-hero-hand",
                    "data-visible-card-count",
                ),
                "2",
            );
            assert.equal(
                await fixturePage.isEnabled("poker-call-button"),
                true,
            );
            assert.equal(
                await fixturePage.isEnabled("poker-raise-button"),
                true,
            );

            await fixturePage.click("poker-call-button");
            assert.deepEqual(await fixturePage.sentMessages(), [
                {
                    type: "poker:act",
                    playerId: "p1",
                    playerName: "",
                    data: { type: "call" },
                },
            ]);

            await fixturePage.takeScreenshot("standard-my-turn-full");
            await fixturePage.takeScreenshot("standard-my-turn-table", "poker-room");
        },
    },
    {
        name: "spectator-active-hand",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("spectator-active-hand");

            assert.equal(
                await fixturePage.getAttribute("poker-hero-hand", "data-spectator"),
                "true",
            );
            assert.match(
                (await fixturePage.textContent("poker-hero-status")) ?? "",
                /SPECTATING/,
            );
            assert.equal(
                await fixturePage.isVisible("poker-spectator-copy"),
                true,
            );
            assert.equal(
                await fixturePage.count("poker-fold-button"),
                0,
            );
            assert.match(
                (await fixturePage.textContent("poker-spectator-list")) ?? "",
                /Dana/,
            );

            await fixturePage.takeScreenshot("spectator-active-hand-full");
            await fixturePage.takeScreenshot(
                "spectator-active-hand-panel",
                "poker-action-controls",
            );
        },
    },
    {
        name: "backwards-visible-opponents",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("backwards-visible-opponents");

            assert.equal(
                await fixturePage.textContent("poker-title"),
                "BACKWARDS POKER",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "poker-hero-hand",
                    "data-visible-card-count",
                ),
                "0",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "poker-hero-hand",
                    "data-card-count",
                ),
                "2",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "poker-seat-p2",
                    "data-visible-card-count",
                ),
                "2",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "poker-seat-p3",
                    "data-visible-card-count",
                ),
                "2",
            );

            await fixturePage.takeScreenshot("backwards-visible-opponents-full");
            await fixturePage.takeScreenshot(
                "backwards-visible-opponents-seat",
                "poker-seat-p2",
            );
        },
    },
    {
        name: "tournament-over-host",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("tournament-over-host");

            await fixturePage.waitForVisible("poker-results-overlay");
            assert.equal(
                await fixturePage.isVisible("poker-return-button"),
                true,
            );
            assert.match(
                (await fixturePage.textContent("poker-results-title")) ?? "",
                /ALICE LEADS/,
            );

            await fixturePage.takeScreenshot("tournament-over-host-full");
            await fixturePage.takeScreenshot(
                "tournament-over-host-overlay",
                "poker-results-overlay",
            );

            await fixturePage.click("poker-return-button");
            assert.deepEqual(await fixturePage.hostActions(), ["return_to_lobby"]);
        },
    },
];

async function main() {
    const failures: string[] = [];
    const server = await startLocalApp();

    try {
        const { stagehand, page } = await createStagehandSession();
        const fixturePage = new PokerFixturePage(page);

        try {
            for (const testCase of testCases) {
                process.stdout.write(`Running ${testCase.name}...\n`);
                try {
                    await testCase.run(fixturePage);
                } catch (error) {
                    failures.push(
                        `${testCase.name}: ${
                            error instanceof Error ? error.stack ?? error.message : String(error)
                        }`,
                    );
                }
            }
        } finally {
            await stagehand.close();
        }
    } finally {
        await server.stop();
    }

    if (failures.length > 0) {
        throw new Error(failures.join("\n\n"));
    }

    process.stdout.write(
        `Passed ${testCases.length} Stagehand seeded poker checks.\n`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
