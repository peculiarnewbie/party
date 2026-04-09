import assert from "node:assert/strict";
import {
    YahtzeeFixturePage,
    createStagehandSession,
    startLocalApp,
} from "./helpers/yahtzee-fixture-page";

type TestCase = {
    name: string;
    run: (fixturePage: YahtzeeFixturePage) => Promise<void>;
};

const testCases: TestCase[] = [
    {
        name: "standard-my-turn-pre-roll",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("standard-my-turn-pre-roll");

            assert.match(
                (await fixturePage.textContent("yahtzee-title")) ?? "",
                /YAHTZEE/,
            );
            assert.equal(
                await fixturePage.textContent("yahtzee-round"),
                "ROUND 3 / 13",
            );
            assert.equal(
                await fixturePage.isEnabled("yahtzee-roll-button"),
                true,
            );
            assert.equal(
                await fixturePage.textContent("scorecard-cell-p1-chance"),
                "",
            );

            for (const index of [0, 1, 2, 3, 4]) {
                assert.equal(
                    await fixturePage.getAttribute(
                        `yahtzee-die-${index}`,
                        "data-has-value",
                    ),
                    "false",
                );
            }

            await fixturePage.takeScreenshot("standard-my-turn-pre-roll-full");
            await fixturePage.takeScreenshot(
                "standard-my-turn-pre-roll-dice",
                "yahtzee-room",
            );
        },
    },
    {
        name: "standard-my-turn-after-roll",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("standard-my-turn-after-roll");

            assert.equal(
                await fixturePage.textContent("yahtzee-my-score"),
                "30 PTS",
            );
            assert.equal(
                await fixturePage.textContent("yahtzee-roll-button"),
                "ROLL (1 LEFT)",
            );
            assert.equal(
                await fixturePage.textContent("scorecard-cell-p1-three_of_a_kind"),
                "26",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "scorecard-cell-p1-three_of_a_kind",
                    "data-suggested",
                ),
                "true",
            );
            assert.equal(
                await fixturePage.getAttribute(
                    "scorecard-cell-p1-chance",
                    "data-suggested",
                ),
                "true",
            );
            assert.equal(
                await fixturePage.getAttribute("yahtzee-die-0", "data-held"),
                "true",
            );
            assert.equal(
                await fixturePage.getAttribute("yahtzee-die-2", "data-held"),
                "true",
            );

            await fixturePage.takeScreenshot("standard-my-turn-after-roll-full");
            await fixturePage.takeScreenshot(
                "standard-my-turn-after-roll-scorecard",
                "yahtzee-scorecard",
            );
        },
    },
    {
        name: "lying-opponent-awaiting-response",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("lying-opponent-awaiting-response", {
                playerId: "p2",
            });

            assert.equal(
                await fixturePage.isVisible("yahtzee-pending-claim"),
                true,
            );
            assert.equal(
                await fixturePage.isEnabled("yahtzee-believe-button"),
                true,
            );
            assert.equal(
                await fixturePage.isEnabled("yahtzee-liar-button"),
                true,
            );
            assert.equal(
                await fixturePage.count("yahtzee-claim-panel"),
                0,
            );
            assert.equal(
                await fixturePage.getAttribute("yahtzee-die-0", "data-has-value"),
                "false",
            );

            await fixturePage.takeScreenshot("lying-opponent-awaiting-response-full");
            await fixturePage.takeScreenshot(
                "lying-opponent-awaiting-response-panel",
                "yahtzee-pending-claim",
            );

            await fixturePage.click("yahtzee-believe-button");
            const sentMessages = await fixturePage.sentMessages();
            assert.deepEqual(sentMessages, [
                {
                    type: "yahtzee:accept_claim",
                    playerId: "p2",
                    playerName: "",
                    data: {},
                },
            ]);
        },
    },
    {
        name: "lying-reveal-caught-lying",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("lying-reveal-caught-lying", {
                playerId: "p2",
            });

            await fixturePage.waitForVisible("yahtzee-announcement");

            assert.match(
                (await fixturePage.textContent("yahtzee-announcement")) ?? "",
                /ALICE GOT CAUGHT LYING/,
            );
            assert.equal(
                await fixturePage.textContent("scorecard-cell-p1-full_house"),
                "-25",
            );
            assert.equal(
                await fixturePage.isEnabled("yahtzee-roll-button"),
                true,
            );
            assert.equal(
                await fixturePage.isVisible("yahtzee-last-turn-reveal"),
                true,
            );

            await fixturePage.takeScreenshot("lying-reveal-caught-lying-full");
            await fixturePage.takeScreenshot(
                "lying-reveal-caught-lying-reveal",
                "yahtzee-last-turn-reveal",
            );
        },
    },
    {
        name: "standard-game-over",
        run: async (fixturePage) => {
            await fixturePage.gotoFixture("standard-game-over");

            assert.equal(
                await fixturePage.isVisible("yahtzee-game-over"),
                true,
            );
            assert.equal(
                await fixturePage.isVisible("yahtzee-return-button"),
                true,
            );
            assert.equal(
                await fixturePage.count("yahtzee-roll-button"),
                0,
            );
            const gameOverText =
                ((await fixturePage.textContent("yahtzee-game-over")) ?? "").replace(
                    /\s+/g,
                    "",
                );
            assert.match(gameOverText, /GAMEOVERALICE421WINNERBOB197RETURNTOLOBBY/);

            await fixturePage.takeScreenshot("standard-game-over-full");
            await fixturePage.takeScreenshot(
                "standard-game-over-panel",
                "yahtzee-game-over",
            );

            await fixturePage.click("yahtzee-return-button");
            const hostActions = await fixturePage.hostActions();
            assert.deepEqual(hostActions, ["return_to_lobby"]);
        },
    },
];

async function main() {
    const failures: string[] = [];
    const server = await startLocalApp();

    try {
        const { stagehand, page } = await createStagehandSession();
        const fixturePage = new YahtzeeFixturePage(page);

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
        `Passed ${testCases.length} Stagehand seeded Yahtzee checks.\n`,
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
