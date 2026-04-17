import { describe, it, expect } from "vitest";
import {
    initGame,
    processAction,
    isValidBid,
    countDiceWithValue,
    startNewRound,
    removePlayer,
    endGameByHost,
    finishReveal,
    rollDice,
    STARTING_DICE,
} from "./engine";
import { getPlayerView } from "./views";
import type { FaceValue, PerudoState } from "./types";

function fixedRollFn(values: number[]) {
    let i = 0;
    return () => values[i++ % values.length];
}

const PLAYERS = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
];

describe("rollDice", () => {
    it("rolls the correct number of dice", () => {
        const dice = rollDice(5, fixedRollFn([1, 2, 3, 4, 5]));
        expect(dice).toEqual([1, 2, 3, 4, 5]);
    });

    it("uses default roll when no function provided", () => {
        const dice = rollDice(3);
        expect(dice).toHaveLength(3);
        dice.forEach((d) => {
            expect(d).toBeGreaterThanOrEqual(1);
            expect(d).toBeLessThanOrEqual(6);
        });
    });
});

describe("initGame", () => {
    it("creates initial state with all players having 5 dice", () => {
        const state = initGame(PLAYERS);
        expect(state.players).toHaveLength(2);
        expect(state.players[0].dice).toHaveLength(STARTING_DICE);
        expect(state.players[1].dice).toHaveLength(STARTING_DICE);
        expect(state.players[0].eliminated).toBe(false);
        expect(state.players[1].eliminated).toBe(false);
    });

    it("sets initial phase to round_start", () => {
        const state = initGame(PLAYERS);
        expect(state.phase).toBe("round_start");
        expect(state.currentBid).toBeNull();
        expect(state.roundNumber).toBe(1);
        expect(state.palificoRound).toBe(false);
    });

    it("calculates totalDiceInPlay correctly", () => {
        const state = initGame(PLAYERS);
        expect(state.totalDiceInPlay).toBe(10);
    });

    it("sets starting player index to 0", () => {
        const state = initGame(PLAYERS);
        expect(state.startingPlayerIndex).toBe(0);
        expect(state.currentPlayerIndex).toBe(0);
    });

    it("creates state with fixed dice values when rollFn provided", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([6, 6, 6, 6, 6, 1, 1, 1, 1, 1]),
        );
        expect(state.players[0].dice).toEqual([6, 6, 6, 6, 6]);
        expect(state.players[1].dice).toEqual([1, 1, 1, 1, 1]);
    });
});

describe("isValidBid", () => {
    it("accepts any bid when no current bid exists", () => {
        const result = isValidBid({ quantity: 1, faceValue: 1 }, null, 10);
        expect(result.valid).toBe(true);
    });

    it("rejects bid quantity less than 1", () => {
        const result = isValidBid({ quantity: 0, faceValue: 1 }, null, 10);
        expect(result.valid).toBe(false);
    });

    it("rejects bid quantity greater than total dice in play", () => {
        const result = isValidBid({ quantity: 11, faceValue: 1 }, null, 10);
        expect(result.valid).toBe(false);
    });

    it("accepts higher quantity than current bid", () => {
        const currentBid = {
            playerId: "p1",
            quantity: 3,
            faceValue: 4 as FaceValue,
        };
        const result = isValidBid(
            { quantity: 4, faceValue: 4 },
            currentBid,
            10,
        );
        expect(result.valid).toBe(true);
    });

    it("accepts same quantity with higher face value", () => {
        const currentBid = {
            playerId: "p1",
            quantity: 3,
            faceValue: 4 as FaceValue,
        };
        const result = isValidBid(
            { quantity: 3, faceValue: 5 },
            currentBid,
            10,
        );
        expect(result.valid).toBe(true);
    });

    it("rejects same quantity with lower face value", () => {
        const currentBid = {
            playerId: "p1",
            quantity: 3,
            faceValue: 4 as FaceValue,
        };
        const result = isValidBid(
            { quantity: 3, faceValue: 3 },
            currentBid,
            10,
        );
        expect(result.valid).toBe(false);
    });

    it("rejects lower quantity than current bid", () => {
        const currentBid = {
            playerId: "p1",
            quantity: 4,
            faceValue: 4 as FaceValue,
        };
        const result = isValidBid(
            { quantity: 3, faceValue: 5 },
            currentBid,
            10,
        );
        expect(result.valid).toBe(false);
    });

    it("accepts quantity 1 over any bid", () => {
        const currentBid = {
            playerId: "p1",
            quantity: 6,
            faceValue: 6 as FaceValue,
        };
        const result = isValidBid(
            { quantity: 7, faceValue: 1 },
            currentBid,
            10,
        );
        expect(result.valid).toBe(true);
    });
});

describe("countDiceWithValue", () => {
    it("counts exact matches", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );
        expect(countDiceWithValue(state, 6)).toBe(5);
        expect(countDiceWithValue(state, 3)).toBe(3);
        expect(countDiceWithValue(state, 1)).toBe(0);
    });

    it("counts 1s as wilds when not palifico", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([1, 1, 1, 4, 5, 6, 6, 6, 6, 6]),
        );
        expect(countDiceWithValue(state, 6)).toBe(8);
    });

    it("does not count 1s as wilds in palifico round", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([1, 1, 1, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.palificoRound = true;
        expect(countDiceWithValue(state, 6)).toBe(5);
    });
});

describe("processAction", () => {
    it("rejects actions from non-current player", () => {
        const state = initGame(PLAYERS);
        const result = processAction(state, {
            type: "bid",
            playerId: "p2",
            quantity: 1,
            faceValue: 1,
        });
        expect(result.type).toBe("error");
    });

    it("rejects challenge when no bid exists", () => {
        const state = initGame(PLAYERS);
        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });
        expect(result.type).toBe("error");
    });

    it("processes a valid bid", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.phase = "bidding";
        const result = processAction(state, {
            type: "bid",
            playerId: "p1",
            quantity: 3,
            faceValue: 3,
        });
        expect(result.type).toBe("bid_placed");
        if (result.type === "bid_placed") {
            expect(result.bid.quantity).toBe(3);
            expect(result.bid.faceValue).toBe(3);
        }
        expect(state.currentBid?.quantity).toBe(3);
    });

    it("auto-transitions from round_start to bidding on first bid", () => {
        const state = initGame(PLAYERS);
        expect(state.phase).toBe("round_start");
        processAction(state, {
            type: "bid",
            playerId: "p1",
            quantity: 1,
            faceValue: 1,
        });
        expect(state.phase).toBe("bidding");
    });

    it("advances to next player after bid", () => {
        const state = initGame(PLAYERS);
        state.phase = "bidding";
        processAction(state, {
            type: "bid",
            playerId: "p1",
            quantity: 1,
            faceValue: 1,
        });
        expect(state.currentPlayerIndex).toBe(1);
    });

    it("allows challenge from correct next player", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 3, faceValue: 3 };
        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });
        expect(result.type).toBe("player_eliminated");
    });

    it("challenger loses die when bid is correct", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 3, faceValue: 3 };
        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });
        if (result.type === "player_eliminated") {
            expect(result.loserId).toBe("p2");
            expect(result.loserNewCount).toBe(4);
        }
        expect(state.players[1].dice).toHaveLength(4);
    });

    it("bidder loses die when bid is incorrect", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 5, faceValue: 3 };
        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });
        if (result.type === "player_eliminated") {
            expect(result.loserId).toBe("p1");
            expect(result.loserNewCount).toBe(4);
        }
    });

    it("sets palificoRound when player drops to 1 die", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([1, 1, 1, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 3, faceValue: 3 };
        state.players[0].dice = [1, 1, 3];
        state.players[1].dice = [6, 6];
        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });
        expect(state.palificoRound).toBe(true);
    });

    it("declares game over when only one player remains", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 5, faceValue: 3 };
        state.players[1].dice.pop();
        state.players[1].dice.pop();
        state.players[1].dice.pop();
        state.players[1].dice.pop();
        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });
        expect(result.type).toBe("player_eliminated");
    });

    it("rejects actions after game over", () => {
        const state = initGame(PLAYERS);
        state.phase = "game_over";
        state.winners = ["p1"];
        const result = processAction(state, {
            type: "bid",
            playerId: "p1",
            quantity: 1,
            faceValue: 1,
        });
        expect(result.type).toBe("error");
    });
});

describe("startNewRound", () => {
    it("re-rolls all dice", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([6, 6, 6, 6, 6, 1, 1, 1, 1, 1]),
        );
        state.phase = "bidding";
        const result = startNewRound(
            state,
            fixedRollFn([1, 2, 3, 4, 5, 6, 5, 4, 3, 2]),
        );
        expect(result.type).toBe("round_started");
        expect(state.players[0].dice).toEqual([1, 2, 3, 4, 5]);
        expect(state.players[1].dice).toEqual([6, 5, 4, 3, 2]);
    });

    it("resets current bid and bid history", () => {
        const state = initGame(PLAYERS);
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 3, faceValue: 4 };
        state.bidHistory.push({ playerId: "p1", quantity: 3, faceValue: 4 });
        startNewRound(state);
        expect(state.currentBid).toBeNull();
        expect(state.bidHistory).toHaveLength(0);
    });

    it("increments round number", () => {
        const state = initGame(PLAYERS);
        expect(state.roundNumber).toBe(1);
        startNewRound(state);
        expect(state.roundNumber).toBe(2);
    });
});

describe("removePlayer", () => {
    it("marks player as eliminated", () => {
        const state = initGame(PLAYERS);
        removePlayer(state, "p1");
        expect(state.players[0].eliminated).toBe(true);
        expect(state.players[0].dice).toHaveLength(0);
    });

    it("declares game over when only one player remains", () => {
        const state = initGame(PLAYERS);
        removePlayer(state, "p2");
        expect(state.phase).toBe("game_over");
        expect(state.winners).toEqual(["p1"]);
    });

    it("returns error when player not found", () => {
        const state = initGame(PLAYERS);
        const result = removePlayer(state, "nonexistent");
        expect(result).toBeNull();
    });
});

describe("endGameByHost", () => {
    it("declares game over with player who has most dice as winner", () => {
        const state = initGame(PLAYERS);
        state.players[0].dice = [1, 2, 3, 4, 5, 6];
        state.players[1].dice = [1, 2, 3];
        const result = endGameByHost(state);
        expect(result.type).toBe("game_over");
        if (result.type === "game_over") {
            expect(result.winners).toEqual(["p1"]);
        }
    });

    it("declares tie when players have equal dice", () => {
        const state = initGame(PLAYERS);
        state.players[0].dice = [1, 2, 3, 4, 5];
        state.players[1].dice = [1, 2, 3, 4, 5];
        const result = endGameByHost(state);
        expect(result.type).toBe("game_over");
        if (result.type === "game_over") {
            expect(result.winners).toEqual(["p1", "p2"]);
        }
    });
});

describe("getPlayerView", () => {
    it("shows own dice to self", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([6, 6, 6, 6, 6, 1, 1, 1, 1, 1]),
        );
        const view = getPlayerView(state, "p1");
        const myInfo = view.players.find((p) => p.id === "p1");
        expect(myInfo?.dice).toEqual([6, 6, 6, 6, 6]);
    });

    it("hides other players dice", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([6, 6, 6, 6, 6, 1, 1, 1, 1, 1]),
        );
        const view = getPlayerView(state, "p1");
        const bobInfo = view.players.find((p) => p.id === "p2");
        expect(bobInfo?.dice).toBeNull();
        expect(bobInfo?.diceCount).toBe(5);
    });

    it("indicates my turn correctly", () => {
        const state = initGame(PLAYERS);
        const view = getPlayerView(state, "p1");
        expect(view.isMyTurn).toBe(true);
        expect(view.canBid).toBe(true);

        const view2 = getPlayerView(state, "p2");
        expect(view2.isMyTurn).toBe(false);
        expect(view2.canBid).toBe(false);
    });

    it("shows correct next higher bid suggestion", () => {
        const state = initGame(PLAYERS);
        state.phase = "bidding";
        state.currentBid = { playerId: "p1", quantity: 3, faceValue: 4 };
        const view = getPlayerView(state, "p2");
        expect(view.nextHigherBid).toEqual({ quantity: 4, faceValue: 4 });
    });

    it("hides dice of eliminated players", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([6, 6, 6, 6, 6, 1, 1, 1, 1, 1]),
        );
        state.players[1].eliminated = true;
        state.players[1].dice = [];
        const view = getPlayerView(state, "p1");
        const bobInfo = view.players.find((p) => p.id === "p2");
        expect(bobInfo?.dice).toBeNull();
        expect(bobInfo?.eliminated).toBe(true);
    });
});

describe("finishReveal", () => {
    it("transitions from revealing to round_start", () => {
        const state = initGame(PLAYERS);
        state.phase = "revealing";
        state.revealTimerActive = true;
        state.lastChallengeResult = {
            challengerId: "p2",
            bidderId: "p1",
            bid: { playerId: "p1", quantity: 5, faceValue: 3 },
            wasCorrect: true,
            actualCount: 6,
            loserId: "p2",
            loserNewCount: 4,
        };
        const result = finishReveal(state);
        expect(state.revealTimerActive).toBe(false);
    });

    it("returns error when not in revealing phase", () => {
        const state = initGame(PLAYERS);
        state.phase = "bidding";
        const result = finishReveal(state);
        expect(result.type).toBe("error");
    });
});

describe("full game flow", () => {
    it("completes a round where player 2 challenges correctly", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([1, 1, 1, 1, 5, 6, 6, 6, 6, 6]),
        );

        processAction(state, {
            type: "bid",
            playerId: "p1",
            quantity: 4,
            faceValue: 3,
        });

        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });

        expect(result.type).toBe("player_eliminated");
        if (result.type === "player_eliminated") {
            expect(result.loserId).toBe("p2");
            expect(result.wasCorrect).toBe(true);
        }
    });

    it("completes a round where player 2 challenges incorrectly", () => {
        const state = initGame(
            PLAYERS,
            fixedRollFn([3, 3, 3, 4, 5, 6, 6, 6, 6, 6]),
        );

        processAction(state, {
            type: "bid",
            playerId: "p1",
            quantity: 5,
            faceValue: 3,
        });

        const result = processAction(state, {
            type: "challenge",
            playerId: "p2",
        });

        expect(result.type).toBe("player_eliminated");
        if (result.type === "player_eliminated") {
            expect(result.loserId).toBe("p1");
            expect(result.wasCorrect).toBe(false);
        }
    });
});
