import { YahtzeeFixtureHarness } from "~/components/yahtzee/yahtzee-fixture-harness";
import type { GameFixtureModule } from "~/game/fixture-module";
import { CATEGORY_LABELS } from "./types";
import { resolveWinners, makePlayer, makeState, TEST_PLAYERS } from "./test-helpers";
import type { ScoringCategory, YahtzeeState } from "./types";

export const YAHTZEE_FIXTURE_IDS = [
    "standard-my-turn-pre-roll",
    "standard-my-turn-after-roll",
    "standard-opponent-turn",
    "standard-game-over",
    "lying-my-turn-claiming",
    "lying-opponent-awaiting-response",
    "lying-reveal-caught-lying",
    "lying-reveal-truthful-challenge",
] as const;

export type YahtzeeFixtureId = (typeof YAHTZEE_FIXTURE_IDS)[number];

export interface YahtzeeFixture {
    id: YahtzeeFixtureId;
    roomId: string;
    title: string;
    hostPlayerId: string;
    primaryPlayerId: string;
    description: string;
    state: YahtzeeState;
}

function createStandardMyTurnPreRollFixture(): YahtzeeFixture {
    return {
        id: "standard-my-turn-pre-roll",
        roomId: "fixture-pre-roll",
        title: "Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Current player has not rolled yet in standard mode.",
        state: makeState({
            round: 3,
            currentPlayerIndex: 0,
            phase: "pre_roll",
            rollsLeft: 3,
            players: [
                makePlayer({
                    id: "p1",
                    name: "Alice",
                    scorecard: { ones: 3, twos: 4, threes: 9 },
                }),
                makePlayer({
                    id: "p2",
                    name: "Bob",
                    scorecard: { ones: 2, twos: 6, chance: 21 },
                }),
            ],
        }),
    };
}

function createStandardMyTurnAfterRollFixture(): YahtzeeFixture {
    return {
        id: "standard-my-turn-after-roll",
        roomId: "fixture-after-roll",
        title: "Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Current player has rolled and sees suggested score options.",
        state: makeState({
            round: 4,
            currentPlayerIndex: 0,
            phase: "mid_turn",
            rollsLeft: 1,
            dice: [5, 5, 5, 5, 6],
            held: [true, false, true, false, false],
            players: [
                makePlayer({
                    id: "p1",
                    name: "Alice",
                    scorecard: {
                        ones: 3,
                        twos: 6,
                        threes: 9,
                        fours: 12,
                    },
                }),
                makePlayer({
                    id: "p2",
                    name: "Bob",
                    scorecard: {
                        ones: 1,
                        twos: 2,
                        chance: 19,
                    },
                }),
            ],
        }),
    };
}

function createStandardOpponentTurnFixture(): YahtzeeFixture {
    return {
        id: "standard-opponent-turn",
        roomId: "fixture-opponent-turn",
        title: "Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Opponent is active in standard mode and current player should only observe.",
        state: makeState({
            round: 5,
            currentPlayerIndex: 1,
            phase: "mid_turn",
            rollsLeft: 2,
            dice: [2, 3, 4, 5, 6],
            held: [false, true, false, true, false],
            players: [
                makePlayer({
                    id: "p1",
                    name: "Alice",
                    scorecard: {
                        ones: 3,
                        twos: 6,
                        three_of_a_kind: 18,
                    },
                }),
                makePlayer({
                    id: "p2",
                    name: "Bob",
                    scorecard: {
                        ones: 1,
                        fours: 12,
                    },
                }),
            ],
        }),
    };
}

function createStandardGameOverFixture(): YahtzeeFixture {
    const state = makeState({
        round: 13,
        currentPlayerIndex: 0,
        phase: "game_over",
        rollsLeft: 0,
        players: [
            makePlayer({
                id: "p1",
                name: "Alice",
                scorecard: {
                    ones: 3,
                    twos: 6,
                    threes: 9,
                    fours: 16,
                    fives: 20,
                    sixes: 24,
                    three_of_a_kind: 18,
                    four_of_a_kind: 22,
                    full_house: 25,
                    small_straight: 30,
                    large_straight: 40,
                    yahtzee: 50,
                    chance: 23,
                },
                yahtzeeBonus: 1,
            }),
            makePlayer({
                id: "p2",
                name: "Bob",
                scorecard: {
                    ones: 2,
                    twos: 6,
                    threes: 9,
                    fours: 12,
                    fives: 15,
                    sixes: 24,
                    three_of_a_kind: 20,
                    four_of_a_kind: 0,
                    full_house: 25,
                    small_straight: 30,
                    large_straight: 0,
                    yahtzee: 0,
                    chance: 19,
                },
            }),
        ],
    });

    state.winners = resolveWinners(state);

    return {
        id: "standard-game-over",
        roomId: "fixture-game-over",
        title: "Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Standard mode final scoreboard with a single winner.",
        state,
    };
}

function createLyingMyTurnClaimingFixture(): YahtzeeFixture {
    return {
        id: "lying-my-turn-claiming",
        roomId: "fixture-lying-claim",
        title: "Lying Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Current player is building a claim in lying mode.",
        state: makeState({
            mode: "lying",
            round: 2,
            currentPlayerIndex: 0,
            phase: "mid_turn",
            rollsLeft: 1,
            dice: [6, 6, 6, 2, 1],
            held: [true, false, false, false, false],
            players: [
                makePlayer({
                    id: "p1",
                    name: "Alice",
                    scorecard: { ones: 2, chance: 18 },
                }),
                makePlayer({
                    id: "p2",
                    name: "Bob",
                    scorecard: { twos: 4 },
                }),
            ],
        }),
    };
}

function createLyingOpponentAwaitingResponseFixture(): YahtzeeFixture {
    return {
        id: "lying-opponent-awaiting-response",
        roomId: "fixture-lying-response",
        title: "Lying Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p2",
        description: "Opponent must accept or challenge a pending lying-mode claim.",
        state: makeState({
            mode: "lying",
            round: 2,
            currentPlayerIndex: 0,
            phase: "awaiting_response",
            rollsLeft: 1,
            dice: [2, 2, 2, 5, 5],
            held: [false, false, true, false, true],
            pendingClaim: {
                playerId: "p1",
                category: "full_house",
                claimedDice: [2, 2, 5, 5, 5],
                claimedPoints: 25,
            },
            players: [
                makePlayer({
                    id: "p1",
                    name: "Alice",
                    scorecard: { ones: 2 },
                }),
                makePlayer({
                    id: "p2",
                    name: "Bob",
                    scorecard: { twos: 4 },
                }),
            ],
        }),
    };
}

function createLyingRevealFixture(
    id: "lying-reveal-caught-lying" | "lying-reveal-truthful-challenge",
    outcome: "caught_lying" | "truthful_challenge",
): YahtzeeFixture {
    const claimedCategory: ScoringCategory = "full_house";
    const penaltyPoints = 25;
    const claimant = makePlayer({
        id: "p1",
        name: "Alice",
        scorecard: {
            ones: 2,
            [claimedCategory]: outcome === "caught_lying" ? -25 : 25,
        },
        penaltyPoints: 0,
    });
    const responder = makePlayer({
        id: "p2",
        name: "Bob",
        scorecard: { twos: 6 },
        penaltyPoints: outcome === "truthful_challenge" ? penaltyPoints : 0,
    });

    return {
        id,
        roomId: `fixture-${id}`,
        title: "Lying Yahtzee",
        hostPlayerId: "p1",
        primaryPlayerId: "p2",
        description: `${CATEGORY_LABELS[claimedCategory]} claim reveal after a ${outcome.replaceAll("_", " ")} outcome.`,
        state: makeState({
            mode: "lying",
            round: 2,
            currentPlayerIndex: 1,
            phase: "pre_roll",
            rollsLeft: 3,
            players: [claimant, responder],
            lastTurnReveal: {
                playerId: "p1",
                category: claimedCategory,
                actualDice: [2, 2, 2, 5, 5],
                claimedDice: [2, 2, 5, 5, 5],
                claimedPoints: 25,
                outcome,
                penaltyPlayerId: outcome === "caught_lying" ? "p1" : "p2",
                penaltyPoints,
            },
        }),
    };
}

const YAHTZEE_FIXTURES = {
    "standard-my-turn-pre-roll": createStandardMyTurnPreRollFixture(),
    "standard-my-turn-after-roll": createStandardMyTurnAfterRollFixture(),
    "standard-opponent-turn": createStandardOpponentTurnFixture(),
    "standard-game-over": createStandardGameOverFixture(),
    "lying-my-turn-claiming": createLyingMyTurnClaimingFixture(),
    "lying-opponent-awaiting-response": createLyingOpponentAwaitingResponseFixture(),
    "lying-reveal-caught-lying": createLyingRevealFixture(
        "lying-reveal-caught-lying",
        "caught_lying",
    ),
    "lying-reveal-truthful-challenge": createLyingRevealFixture(
        "lying-reveal-truthful-challenge",
        "truthful_challenge",
    ),
} satisfies Record<YahtzeeFixtureId, YahtzeeFixture>;

export function getYahtzeeFixture(fixtureId: YahtzeeFixtureId): YahtzeeFixture {
    return YAHTZEE_FIXTURES[fixtureId];
}

export function getDefaultFixturePlayerId(fixtureId: YahtzeeFixtureId): string {
    return YAHTZEE_FIXTURES[fixtureId].primaryPlayerId;
}

export function getFixturePlayerIds(): string[] {
    return [...TEST_PLAYERS.map((player) => player.id)];
}

export const gameFixtureModule: GameFixtureModule<YahtzeeFixtureId> = {
    game: "yahtzee",
    title: "Yahtzee",
    fixtures: YAHTZEE_FIXTURES,
    defaultFixtureId: "standard-my-turn-pre-roll",
    playerIds: TEST_PLAYERS.map((player) => player.id),
    Harness: YahtzeeFixtureHarness,
};
