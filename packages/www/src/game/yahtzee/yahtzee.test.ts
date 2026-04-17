import { describe, it, expect } from "vitest";
import {
    endGameByHost,
    initGame,
    processAction,
    calculateScore,
    getTotalScore,
    getUpperSectionTotal,
    getUpperBonus,
    getFilledCount,
    rollDice,
    isYahtzee,
    removePlayer,
    sumOfValue,
    nOfAKind,
    fullHouse,
    smallStraight,
    largeStraight,
    yahtzeeCheck,
    chance,
    TOTAL_ROUNDS,
    UPPER_BONUS_THRESHOLD,
    UPPER_BONUS_POINTS,
    YAHTZEE_BONUS_POINTS,
    YAHTZEE_BASE_POINTS,
} from "./engine";
import { getPlayerView } from "./views";
import type { Dice, HeldDice, YahtzeeState } from "./types";

function fixedRollFn(values: number[]) {
    let i = 0;
    return () => values[i++ % values.length];
}

const PLAYERS = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
];

describe("scoring functions", () => {
    it("sumOfValue counts matching dice", () => {
        expect(sumOfValue([3, 3, 3, 4, 5], 3)).toBe(9);
        expect(sumOfValue([1, 2, 3, 4, 5], 6)).toBe(0);
        expect(sumOfValue([6, 6, 6, 6, 6], 6)).toBe(30);
    });

    it("nOfAKind detects 3 of a kind", () => {
        expect(nOfAKind([2, 2, 2, 4, 5], 3)).toBe(15);
        expect(nOfAKind([1, 2, 3, 4, 5], 3)).toBe(0);
    });

    it("nOfAKind detects 4 of a kind", () => {
        expect(nOfAKind([4, 4, 4, 4, 2], 4)).toBe(18);
        expect(nOfAKind([3, 3, 3, 4, 5], 4)).toBe(0);
    });

    it("fullHouse detects full house", () => {
        expect(fullHouse([2, 2, 3, 3, 3])).toBe(25);
        expect(fullHouse([1, 1, 1, 1, 1])).toBe(0);
        expect(fullHouse([1, 2, 3, 4, 5])).toBe(0);
    });

    it("smallStraight detects small straights", () => {
        expect(smallStraight([1, 2, 3, 4, 6])).toBe(30);
        expect(smallStraight([2, 3, 4, 5, 1])).toBe(30);
        expect(smallStraight([3, 4, 5, 6, 1])).toBe(30);
        expect(smallStraight([1, 2, 3, 5, 6])).toBe(0);
    });

    it("largeStraight detects large straights", () => {
        expect(largeStraight([1, 2, 3, 4, 5])).toBe(40);
        expect(largeStraight([2, 3, 4, 5, 6])).toBe(40);
        expect(largeStraight([1, 2, 3, 4, 6])).toBe(0);
    });

    it("yahtzeeCheck detects yahtzee", () => {
        expect(yahtzeeCheck([3, 3, 3, 3, 3])).toBe(YAHTZEE_BASE_POINTS);
        expect(yahtzeeCheck([3, 3, 3, 3, 4])).toBe(0);
    });

    it("chance sums all dice", () => {
        expect(chance([1, 2, 3, 4, 5])).toBe(15);
        expect(chance([6, 6, 6, 6, 6])).toBe(30);
    });

    it("isYahtzee returns boolean", () => {
        expect(isYahtzee([5, 5, 5, 5, 5])).toBe(true);
        expect(isYahtzee([5, 5, 5, 5, 4])).toBe(false);
    });
});

describe("calculateScore", () => {
    it("calculates all upper section categories", () => {
        const dice: Dice = [1, 2, 3, 4, 5];
        expect(calculateScore(dice, "ones")).toBe(1);
        expect(calculateScore(dice, "twos")).toBe(2);
        expect(calculateScore(dice, "threes")).toBe(3);
        expect(calculateScore(dice, "fours")).toBe(4);
        expect(calculateScore(dice, "fives")).toBe(5);
        expect(calculateScore(dice, "sixes")).toBe(0);
    });

    it("calculates lower section categories", () => {
        expect(calculateScore([3, 3, 3, 4, 5], "three_of_a_kind")).toBe(18);
        expect(calculateScore([3, 3, 3, 3, 5], "four_of_a_kind")).toBe(17);
        expect(calculateScore([2, 2, 5, 5, 5], "full_house")).toBe(25);
        expect(calculateScore([1, 2, 3, 4, 6], "small_straight")).toBe(30);
        expect(calculateScore([1, 2, 3, 4, 5], "large_straight")).toBe(40);
        expect(calculateScore([4, 4, 4, 4, 4], "yahtzee")).toBe(50);
        expect(calculateScore([1, 3, 4, 5, 6], "chance")).toBe(19);
    });
});

describe("score totals", () => {
    it("calculates upper section total", () => {
        expect(
            getUpperSectionTotal({
                ones: 3,
                twos: 6,
                threes: 9,
            }),
        ).toBe(18);
    });

    it("awards upper bonus at threshold", () => {
        expect(
            getUpperBonus({
                ones: 3,
                twos: 6,
                threes: 9,
                fours: 16,
                fives: 20,
                sixes: 12,
            }),
        ).toBe(UPPER_BONUS_POINTS);

        expect(
            getUpperBonus({
                ones: 1,
                twos: 2,
                threes: 3,
            }),
        ).toBe(0);
    });

    it("calculates total score with bonuses", () => {
        const player = {
            id: "p1",
            name: "Test",
            scorecard: {
                ones: 3,
                twos: 6,
                threes: 9,
                fours: 16,
                fives: 20,
                sixes: 18,
                yahtzee: 50,
                chance: 22,
            } as any,
            yahtzeeBonus: 1,
            penaltyPoints: 0,
        };
        const upper = 3 + 6 + 9 + 16 + 20 + 18;
        const lower = 50 + 22;
        const expected = upper + lower + UPPER_BONUS_POINTS + YAHTZEE_BONUS_POINTS;
        expect(getTotalScore(player)).toBe(expected);
    });
});

describe("rollDice", () => {
    it("only rerolls unheld dice", () => {
        const dice: Dice = [1, 2, 3, 4, 5];
        const held: HeldDice = [true, false, true, false, true];
        const roll = fixedRollFn([6, 6]);
        const result = rollDice(dice, held, roll);
        expect(result).toEqual([1, 6, 3, 6, 5]);
    });

    it("rerolls all dice when none held", () => {
        const dice: Dice = [1, 2, 3, 4, 5];
        const held: HeldDice = [false, false, false, false, false];
        const roll = fixedRollFn([6, 6, 6, 6, 6]);
        const result = rollDice(dice, held, roll);
        expect(result).toEqual([6, 6, 6, 6, 6]);
    });

    it("keeps all dice when all held", () => {
        const dice: Dice = [1, 2, 3, 4, 5];
        const held: HeldDice = [true, true, true, true, true];
        const result = rollDice(dice, held, fixedRollFn([6]));
        expect(result).toEqual([1, 2, 3, 4, 5]);
    });
});

describe("initGame", () => {
    it("creates initial state correctly", () => {
        const state = initGame(PLAYERS);
        expect(state.players).toHaveLength(2);
        expect(state.players[0].id).toBe("p1");
        expect(state.players[1].id).toBe("p2");
        expect(state.currentPlayerIndex).toBe(0);
        expect(state.dice).toEqual([0, 0, 0, 0, 0]);
        expect(state.held).toEqual([false, false, false, false, false]);
        expect(state.rollsLeft).toBe(3);
        expect(state.phase).toBe("pre_roll");
        expect(state.round).toBe(1);
        expect(state.winners).toBeNull();
        expect(state.mode).toBe("standard");
    });

    it("creates lying mode state when requested", () => {
        const state = initGame(PLAYERS, { mode: "lying" });
        expect(state.mode).toBe("lying");
        expect(state.pendingClaim).toBeNull();
        expect(state.lastTurnReveal).toBeNull();
    });
});

describe("processAction", () => {
    it("rejects actions from wrong player", () => {
        const state = initGame(PLAYERS);
        const result = processAction(state, { type: "roll", playerId: "p2" });
        expect(result.type).toBe("error");
    });

    it("handles a roll action", () => {
        const state = initGame(PLAYERS);
        const roll = fixedRollFn([3, 4, 5, 2, 1]);
        const result = processAction(state, { type: "roll", playerId: "p1" }, roll);
        expect(result.type).toBe("rolled");
        if (result.type === "rolled") {
            expect(result.dice).toEqual([3, 4, 5, 2, 1]);
        }
        expect(state.rollsLeft).toBe(2);
        expect(state.phase).toBe("mid_turn");
    });

    it("rejects roll with no rolls left", () => {
        const state = initGame(PLAYERS);
        const roll = fixedRollFn([1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
        processAction(state, { type: "roll", playerId: "p1" }, roll);
        processAction(state, { type: "roll", playerId: "p1" }, roll);
        processAction(state, { type: "roll", playerId: "p1" }, roll);
        const result = processAction(state, { type: "roll", playerId: "p1" }, roll);
        expect(result.type).toBe("error");
    });

    it("rejects toggle_hold before first roll", () => {
        const state = initGame(PLAYERS);
        const result = processAction(state, {
            type: "toggle_hold",
            playerId: "p1",
            diceIndex: 0,
        });
        expect(result.type).toBe("error");
    });

    it("handles toggle_hold after roll", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 2, 3, 4, 5]),
        );
        const result = processAction(state, {
            type: "toggle_hold",
            playerId: "p1",
            diceIndex: 2,
        });
        expect(result.type).toBe("held_toggled");
        expect(state.held[2]).toBe(true);

        processAction(state, {
            type: "toggle_hold",
            playerId: "p1",
            diceIndex: 2,
        });
        expect(state.held[2]).toBe(false);
    });

    it("rejects scoring before rolling", () => {
        const state = initGame(PLAYERS);
        const result = processAction(state, {
            type: "score",
            playerId: "p1",
            category: "ones",
        });
        expect(result.type).toBe("error");
    });

    it("handles scoring and advances turn", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([3, 3, 3, 4, 5]),
        );
        const result = processAction(state, {
            type: "score",
            playerId: "p1",
            category: "threes",
        });
        expect(result.type).toBe("scored");
        if (result.type === "scored") {
            expect(result.points).toBe(9);
            expect(result.category).toBe("threes");
        }
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.phase).toBe("pre_roll");
        expect(state.rollsLeft).toBe(3);
    });

    it("allows scoring zero into an open category", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([2, 3, 4, 5, 6]),
        );

        const result = processAction(state, {
            type: "score",
            playerId: "p1",
            category: "ones",
        });

        expect(result.type).toBe("scored");
        if (result.type === "scored") {
            expect(result.points).toBe(0);
        }
        expect(state.players[0].scorecard.ones).toBe(0);
        expect(state.currentPlayerIndex).toBe(1);
    });

    it("rejects scoring a filled category", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 1, 1, 1, 1]),
        );
        processAction(state, {
            type: "score",
            playerId: "p1",
            category: "ones",
        });

        // Now p2's turn
        processAction(
            state,
            { type: "roll", playerId: "p2" },
            fixedRollFn([2, 2, 2, 2, 2]),
        );
        processAction(state, {
            type: "score",
            playerId: "p2",
            category: "twos",
        });

        // Back to p1 round 2
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 1, 1, 1, 1]),
        );
        const result = processAction(state, {
            type: "score",
            playerId: "p1",
            category: "ones",
        });
        expect(result.type).toBe("error");
    });

    it("increments round when all players have gone", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 2, 3, 4, 5]),
        );
        processAction(state, { type: "score", playerId: "p1", category: "ones" });

        expect(state.round).toBe(1);
        expect(state.currentPlayerIndex).toBe(1);

        processAction(
            state,
            { type: "roll", playerId: "p2" },
            fixedRollFn([1, 2, 3, 4, 5]),
        );
        processAction(state, { type: "score", playerId: "p2", category: "ones" });

        expect(state.round).toBe(2);
        expect(state.currentPlayerIndex).toBe(0);
    });

    it("awards yahtzee bonus on subsequent yahtzees", () => {
        const state = initGame(PLAYERS);

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([5, 5, 5, 5, 5]),
        );
        processAction(state, {
            type: "score",
            playerId: "p1",
            category: "yahtzee",
        });
        expect(state.players[0].scorecard.yahtzee).toBe(50);
        expect(state.players[0].yahtzeeBonus).toBe(0);

        processAction(
            state,
            { type: "roll", playerId: "p2" },
            fixedRollFn([1, 2, 3, 4, 5]),
        );
        processAction(state, { type: "score", playerId: "p2", category: "chance" });

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([5, 5, 5, 5, 5]),
        );
        const result = processAction(state, {
            type: "score",
            playerId: "p1",
            category: "fives",
        });
        expect(result.type).toBe("scored");
        if (result.type === "scored") {
            expect(result.yahtzeeBonus).toBe(true);
        }
        expect(state.players[0].yahtzeeBonus).toBe(1);
    });

    it("does not award yahtzee bonus if yahtzee was scratched", () => {
        const state = initGame(PLAYERS);

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 2, 3, 4, 5]),
        );
        processAction(state, {
            type: "score",
            playerId: "p1",
            category: "yahtzee",
        });
        expect(state.players[0].scorecard.yahtzee).toBe(0);

        processAction(
            state,
            { type: "roll", playerId: "p2" },
            fixedRollFn([1, 2, 3, 4, 5]),
        );
        processAction(state, { type: "score", playerId: "p2", category: "chance" });

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([3, 3, 3, 3, 3]),
        );
        const result = processAction(state, {
            type: "score",
            playerId: "p1",
            category: "threes",
        });
        if (result.type === "scored") {
            expect(result.yahtzeeBonus).toBe(false);
        }
        expect(state.players[0].yahtzeeBonus).toBe(0);
    });

    it("ends game after 13 rounds", () => {
        const state = initGame([{ id: "p1", name: "Alice" }]);
        const categories = [
            "ones", "twos", "threes", "fours", "fives", "sixes",
            "three_of_a_kind", "four_of_a_kind", "full_house",
            "small_straight", "large_straight", "yahtzee", "chance",
        ] as const;

        let lastResult;
        for (const cat of categories) {
            processAction(
                state,
                { type: "roll", playerId: "p1" },
                fixedRollFn([1, 2, 3, 4, 5]),
            );
            lastResult = processAction(state, {
                type: "score",
                playerId: "p1",
                category: cat,
            });
        }

        expect(lastResult!.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
        expect(state.winners).not.toBeNull();
    });

    it("ends game immediately when the host stops the game", () => {
        const state = initGame(PLAYERS);
        state.players[0].scorecard.chance = 20;
        state.players[1].scorecard.chance = 25;

        const result = endGameByHost(state);

        expect(result.type).toBe("game_over");
        expect(state.phase).toBe("game_over");
        expect(state.winners).toEqual(["p2"]);
        if (result.type === "game_over") {
            expect(result.winners).toEqual(["p2"]);
            expect(result.finalScores).toEqual([
                { playerId: "p1", playerName: "Alice", total: 20 },
                { playerId: "p2", playerName: "Bob", total: 25 },
            ]);
        }
    });

    it("rejects actions after game over", () => {
        const state = initGame([{ id: "p1", name: "Alice" }]);
        const categories = [
            "ones", "twos", "threes", "fours", "fives", "sixes",
            "three_of_a_kind", "four_of_a_kind", "full_house",
            "small_straight", "large_straight", "yahtzee", "chance",
        ] as const;

        for (const cat of categories) {
            processAction(
                state,
                { type: "roll", playerId: "p1" },
                fixedRollFn([1, 2, 3, 4, 5]),
            );
            processAction(state, {
                type: "score",
                playerId: "p1",
                category: cat,
            });
        }

        const result = processAction(state, { type: "roll", playerId: "p1" });
        expect(result.type).toBe("error");
    });

    it("handles tie correctly", () => {
        const state = initGame(PLAYERS);
        const categories = [
            "ones", "twos", "threes", "fours", "fives", "sixes",
            "three_of_a_kind", "four_of_a_kind", "full_house",
            "small_straight", "large_straight", "yahtzee", "chance",
        ] as const;

        let lastResult;
        for (const cat of categories) {
            processAction(
                state,
                { type: "roll", playerId: "p1" },
                fixedRollFn([1, 2, 3, 4, 5]),
            );
            processAction(state, { type: "score", playerId: "p1", category: cat });

            processAction(
                state,
                { type: "roll", playerId: "p2" },
                fixedRollFn([1, 2, 3, 4, 5]),
            );
            lastResult = processAction(state, { type: "score", playerId: "p2", category: cat });
        }

        expect(lastResult!.type).toBe("game_over");
        if (lastResult!.type === "game_over") {
            expect(lastResult!.winners).toHaveLength(2);
        }
    });

    it("accepts a lying yahtzee claim and scores the claimed dice", () => {
        const state = initGame(PLAYERS, { mode: "lying" });

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 1, 1, 2, 3]),
        );
        const claim = processAction(state, {
            type: "claim",
            playerId: "p1",
            category: "full_house",
            claimedDice: [2, 2, 3, 3, 3],
        });

        expect(claim).toEqual({
            type: "claim_submitted",
            playerId: "p1",
            category: "full_house",
            claimedDice: [2, 2, 3, 3, 3],
            claimedPoints: 25,
        });

        const resolution = processAction(state, {
            type: "accept_claim",
            playerId: "p2",
        });

        expect(resolution.type).toBe("claim_resolved");
        expect(state.players[0].scorecard.full_house).toBe(25);
        expect(state.players[1].penaltyPoints).toBe(0);
        expect(state.lastTurnReveal?.actualDice).toEqual([1, 1, 1, 2, 3]);
        expect(state.lastTurnReveal?.claimedDice).toEqual([2, 2, 3, 3, 3]);
        expect(state.lastTurnReveal?.outcome).toBe("accepted");
    });

    it("fills the claimed category with a negative score when a lie is caught", () => {
        const state = initGame(PLAYERS, { mode: "lying" });

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([1, 1, 1, 2, 3]),
        );
        processAction(state, {
            type: "claim",
            playerId: "p1",
            category: "full_house",
            claimedDice: [2, 2, 3, 3, 3],
        });

        const resolution = processAction(state, {
            type: "challenge_claim",
            playerId: "p2",
        });

        expect(resolution.type).toBe("claim_resolved");
        if (resolution.type === "claim_resolved") {
            expect(resolution.points).toBe(-25);
            expect(resolution.outcome).toBe("caught_lying");
        }
        expect(state.players[0].scorecard.full_house).toBe(-25);
        expect(state.players[1].penaltyPoints).toBe(0);
        expect(getTotalScore(state.players[0])).toBe(-25);
    });

    it("penalizes the challenger without burning a slot when the claim is truthful", () => {
        const state = initGame(PLAYERS, { mode: "lying" });

        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([2, 2, 3, 3, 3]),
        );
        processAction(state, {
            type: "claim",
            playerId: "p1",
            category: "full_house",
            claimedDice: [3, 3, 2, 2, 3],
        });

        const resolution = processAction(state, {
            type: "challenge_claim",
            playerId: "p2",
        });

        expect(resolution.type).toBe("claim_resolved");
        if (resolution.type === "claim_resolved") {
            expect(resolution.points).toBe(25);
            expect(resolution.outcome).toBe("truthful_challenge");
        }
        expect(state.players[0].scorecard.full_house).toBe(25);
        expect(state.players[1].penaltyPoints).toBe(25);
        expect(state.players[1].scorecard.full_house).toBeUndefined();
        expect(getTotalScore(state.players[1])).toBe(-25);
    });

    it("finishes the game when player removal leaves one player", () => {
        const state = initGame(PLAYERS);

        const result = removePlayer(state, "p2");

        expect(result).toEqual({
            type: "game_over",
            winners: ["p1"],
            finalScores: [{ playerId: "p1", playerName: "Alice", total: 0 }],
        });
        expect(state.phase).toBe("game_over");
        expect(state.winners).toEqual(["p1"]);
    });

    it("finishes the game with no winners when all players are removed", () => {
        const state = initGame([{ id: "p1", name: "Alice" }]);

        const result = removePlayer(state, "p1");

        expect(result).toEqual({
            type: "game_over",
            winners: [],
            finalScores: [],
        });
        expect(state.phase).toBe("game_over");
        expect(state.winners).toEqual([]);
    });
});

describe("getPlayerView", () => {
    it("returns correct view for current player", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([3, 3, 4, 4, 5]),
        );

        const view = getPlayerView(state, "p1");
        expect(view.myId).toBe("p1");
        expect(view.isMyTurn).toBe(true);
        expect(view.canRoll).toBe(true);
        expect(view.canScore).toBe(true);
        expect(view.dice).toEqual([3, 3, 4, 4, 5]);
        expect(view.potentialScores).not.toBeNull();
        expect(view.potentialScores!.full_house).toBe(0);
        expect(view.potentialScores!.threes).toBe(6);
        expect(view.potentialScores!.chance).toBe(19);
        expect(view.suggestedCategories).toEqual(["chance"]);
    });

    it("returns correct view for non-current player", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([3, 3, 4, 4, 5]),
        );

        const view = getPlayerView(state, "p2");
        expect(view.myId).toBe("p2");
        expect(view.isMyTurn).toBe(false);
        expect(view.canRoll).toBe(false);
        expect(view.canScore).toBe(false);
        expect(view.potentialScores).toBeNull();
        expect(view.suggestedCategories).toEqual([]);
    });

    it("hides active dice from the opponent in lying mode", () => {
        const state = initGame(PLAYERS, { mode: "lying" });
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([3, 3, 4, 4, 5]),
        );

        const view = getPlayerView(state, "p2");
        expect(view.dice).toEqual([0, 0, 0, 0, 0]);
        expect(view.canAcceptClaim).toBe(false);
        expect(view.suggestedCategories).toEqual([]);
    });

    it("shows pending claim and response actions in lying mode", () => {
        const state = initGame(PLAYERS, { mode: "lying" });
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([3, 3, 4, 4, 5]),
        );
        processAction(state, {
            type: "claim",
            playerId: "p1",
            category: "chance",
            claimedDice: [6, 6, 6, 6, 6],
        });

        const view = getPlayerView(state, "p2");
        expect(view.phase).toBe("awaiting_response");
        expect(view.pendingClaim?.claimedPoints).toBe(30);
        expect(view.canAcceptClaim).toBe(true);
        expect(view.canChallengeClaim).toBe(true);
        expect(view.suggestedCategories).toEqual([]);
    });

    it("suggests all tied top-scoring categories for the current roll", () => {
        const state = initGame(PLAYERS);
        processAction(
            state,
            { type: "roll", playerId: "p1" },
            fixedRollFn([5, 5, 5, 5, 6]),
        );

        const view = getPlayerView(state, "p1");
        expect(view.potentialScores!.fives).toBe(20);
        expect(view.potentialScores!.three_of_a_kind).toBe(26);
        expect(view.potentialScores!.four_of_a_kind).toBe(26);
        expect(view.potentialScores!.chance).toBe(26);
        expect(view.suggestedCategories).toEqual([
            "three_of_a_kind",
            "four_of_a_kind",
            "chance",
        ]);
    });

    it("includes computed score totals", () => {
        const state = initGame(PLAYERS);
        state.players[0].scorecard.sixes = 18;
        state.players[0].scorecard.fives = 20;
        state.players[0].scorecard.fours = 16;
        state.players[0].scorecard.threes = 9;

        const view = getPlayerView(state, "p1");
        const myInfo = view.players.find((p) => p.id === "p1")!;
        expect(myInfo.upperTotal).toBe(63);
        expect(myInfo.upperBonus).toBe(35);
        expect(myInfo.totalScore).toBe(18 + 20 + 16 + 9 + 35);
    });
});

describe("getFilledCount", () => {
    it("counts filled categories", () => {
        const player = {
            id: "p1",
            name: "Test",
            scorecard: { ones: 3, twos: 6, chance: 22 },
            yahtzeeBonus: 0,
            penaltyPoints: 0,
        };
        expect(getFilledCount(player)).toBe(3);
    });
});
