import { describe, expect, it } from "bun:test";
import {
    POKER_BIG_BLIND,
    POKER_SMALL_BLIND,
    endGameByHost,
    evaluateBestHand,
    evaluateFiveCardHand,
    getLegalActions,
    initGame,
    processAction,
    startNextHand,
} from "./engine";
import { getPlayerView } from "./views";
import type { PokerPlayer, PokerState } from "./types";

const noShuffle = <T,>(arr: T[]): T[] => [...arr];

function makePlayer(
    id: string,
    name: string,
    overrides?: Partial<PokerPlayer>,
): PokerPlayer {
    return {
        id,
        name,
        stack: 1000,
        holeCards: [],
        status: "active",
        connected: true,
        committedThisStreet: 0,
        committedThisHand: 0,
        hasActedThisStreet: false,
        raiseLocked: false,
        ...overrides,
    };
}

function makeState(overrides?: Partial<PokerState>): PokerState {
    return {
        players: [
            makePlayer("a", "Alice"),
            makePlayer("b", "Bob"),
            makePlayer("c", "Cara"),
        ],
        spectators: [],
        deck: [],
        board: [],
        dealerIndex: 0,
        smallBlindIndex: 1,
        bigBlindIndex: 2,
        actingPlayerIndex: 0,
        street: "preflop",
        pots: [],
        currentBet: 20,
        minRaise: 20,
        handNumber: 1,
        lastAggressorIndex: 2,
        endedByHost: false,
        winnerIds: null,
        eventLog: [],
        eventSeq: 0,
        ...overrides,
    };
}

describe("poker initGame", () => {
    it("deals two cards and posts blinds for three players", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
                { id: "c", name: "Cara" },
            ],
            noShuffle,
        );

        expect(state.street).toBe("preflop");
        expect(state.handNumber).toBe(1);
        expect(state.players.every((player) => player.holeCards.length === 2)).toBe(
            true,
        );
        expect(state.players[1].committedThisStreet).toBe(POKER_SMALL_BLIND);
        expect(state.players[2].committedThisStreet).toBe(POKER_BIG_BLIND);
        expect(state.actingPlayerIndex).toBe(0);
    });

    it("uses heads-up blind order with dealer posting the small blind", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            noShuffle,
        );

        expect(state.dealerIndex).toBe(0);
        expect(state.smallBlindIndex).toBe(0);
        expect(state.bigBlindIndex).toBe(1);
        expect(state.actingPlayerIndex).toBe(0);
    });
});

describe("poker actions", () => {
    it("advances to the flop after preflop calls and check", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
                { id: "c", name: "Cara" },
            ],
            noShuffle,
        );

        expect(processAction(state, "a", { type: "call" })).toEqual({
            type: "ok",
            stateChanged: true,
        });
        expect(processAction(state, "b", { type: "call" })).toEqual({
            type: "ok",
            stateChanged: true,
        });
        expect(processAction(state, "c", { type: "check" })).toEqual({
            type: "ok",
            stateChanged: true,
        });

        expect(state.street).toBe("flop");
        expect(state.board).toHaveLength(3);
        expect(state.currentBet).toBe(0);
    });

    it("awards the pot immediately when everyone else folds", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            noShuffle,
        );

        const result = processAction(state, "a", { type: "fold" });

        expect(result).toEqual({ type: "ok", stateChanged: true });
        expect(state.street).toBe("hand_over");
        expect(state.players[1].stack).toBe(1010);
    });

    it("does not reopen betting after a short all-in raise", () => {
        const state = makeState({
            street: "turn",
            currentBet: 100,
            minRaise: 100,
            actingPlayerIndex: 2,
            players: [
                makePlayer("a", "Alice", {
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    hasActedThisStreet: true,
                    stack: 500,
                }),
                makePlayer("b", "Bob", {
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    hasActedThisStreet: false,
                    stack: 500,
                }),
                makePlayer("c", "Cara", {
                    committedThisStreet: 90,
                    committedThisHand: 90,
                    hasActedThisStreet: false,
                    stack: 40,
                }),
            ],
        });

        const result = processAction(state, "c", { type: "all_in" });

        expect(result).toEqual({ type: "ok", stateChanged: true });
        expect(state.currentBet).toBe(130);
        expect(state.actingPlayerIndex).toBe(0);
        expect(getLegalActions(state, "a").legalActions).not.toContain("raise");
        expect(state.players[1].raiseLocked).toBe(false);
    });

    it("rejects a raise below the minimum total", () => {
        const state = makeState({
            street: "turn",
            currentBet: 100,
            minRaise: 100,
            actingPlayerIndex: 0,
            players: [
                makePlayer("a", "Alice", {
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    stack: 500,
                }),
                makePlayer("b", "Bob", {
                    committedThisStreet: 0,
                    committedThisHand: 0,
                    stack: 500,
                }),
                makePlayer("c", "Cara", {
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    status: "all_in",
                    stack: 0,
                }),
            ],
        });

        const result = processAction(state, "a", {
            type: "raise",
            amount: 150,
        });

        expect(result).toEqual({
            type: "error",
            message: "Minimum raise total is 200",
        });
    });
});

describe("poker hand evaluation", () => {
    it("identifies a straight flush", () => {
        const hand = evaluateFiveCardHand([
            { suit: "heart", rank: 10 },
            { suit: "heart", rank: 11 },
            { suit: "heart", rank: 12 },
            { suit: "heart", rank: 13 },
            { suit: "heart", rank: 1 },
        ]);

        expect(hand.label).toBe("Straight Flush");
        expect(hand.category).toBe(8);
    });

    it("selects the best hand out of seven cards", () => {
        const hand = evaluateBestHand([
            { suit: "heart", rank: 10 },
            { suit: "club", rank: 10 },
            { suit: "spade", rank: 10 },
            { suit: "diamond", rank: 10 },
            { suit: "heart", rank: 1 },
            { suit: "club", rank: 1 },
            { suit: "spade", rank: 2 },
        ]);

        expect(hand.label).toBe("Four of a Kind");
    });
});

describe("poker showdown, views, and end game", () => {
    it("splits the pot evenly on a tie", () => {
        const state = makeState({
            street: "river",
            currentBet: 100,
            minRaise: 20,
            actingPlayerIndex: 0,
            board: [
                { suit: "heart", rank: 2 },
                { suit: "club", rank: 5 },
                { suit: "spade", rank: 8 },
                { suit: "diamond", rank: 11 },
                { suit: "heart", rank: 13 },
            ],
            players: [
                makePlayer("a", "Alice", {
                    stack: 0,
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    status: "active",
                    holeCards: [
                        { suit: "spade", rank: 1 },
                        { suit: "club", rank: 1 },
                    ],
                }),
                makePlayer("b", "Bob", {
                    stack: 0,
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    status: "all_in",
                    holeCards: [
                        { suit: "diamond", rank: 1 },
                        { suit: "heart", rank: 1 },
                    ],
                }),
                makePlayer("c", "Cara", {
                    stack: 0,
                    committedThisStreet: 0,
                    committedThisHand: 0,
                    status: "busted",
                    holeCards: [],
                }),
            ],
        });

        const result = processAction(state, "a", { type: "check" });

        expect(result).toEqual({ type: "ok", stateChanged: true });
        expect(state.players[0].stack).toBe(100);
        expect(state.players[1].stack).toBe(100);
        expect(state.street).toBe("hand_over");
    });

    it("handles side pots with three all-in stacks", () => {
        const state = makeState({
            street: "river",
            currentBet: 100,
            minRaise: 20,
            actingPlayerIndex: 2,
            board: [
                { suit: "club", rank: 1 },
                { suit: "club", rank: 13 },
                { suit: "spade", rank: 2 },
                { suit: "heart", rank: 2 },
                { suit: "diamond", rank: 7 },
            ],
            players: [
                makePlayer("a", "Alice", {
                    stack: 0,
                    committedThisStreet: 50,
                    committedThisHand: 50,
                    status: "all_in",
                    holeCards: [
                        { suit: "heart", rank: 1 },
                        { suit: "diamond", rank: 1 },
                    ],
                }),
                makePlayer("b", "Bob", {
                    stack: 0,
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    status: "all_in",
                    holeCards: [
                        { suit: "heart", rank: 12 },
                        { suit: "diamond", rank: 11 },
                    ],
                }),
                makePlayer("c", "Cara", {
                    stack: 100,
                    committedThisStreet: 100,
                    committedThisHand: 100,
                    status: "active",
                    holeCards: [
                        { suit: "heart", rank: 13 },
                        { suit: "diamond", rank: 13 },
                    ],
                }),
            ],
        });

        const result = processAction(state, "c", { type: "check" });

        expect(result).toEqual({ type: "ok", stateChanged: true });
        expect(state.players[0].stack).toBe(150);
        expect(state.players[1].stack).toBe(0);
        expect(state.players[2].stack).toBe(200);
    });

    it("hides opponents hole cards in the personalized view", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            noShuffle,
        );

        const view = getPlayerView(state, "a");

        expect(view.myHoleCards).toHaveLength(2);
        expect(view.players.find((player) => player.id === "b")?.holeCardCount).toBe(2);
    });

    it("shows opponents cards and hides your own cards in backwards poker", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            noShuffle,
        );

        const view = getPlayerView(state, "a", "backwards");

        expect(view.myHoleCards).toHaveLength(0);
        expect(view.myHoleCardCount).toBe(2);
        expect(
            view.players.find((player) => player.id === "a")?.visibleHoleCards,
        ).toEqual([]);
        expect(
            view.players.find((player) => player.id === "b")?.visibleHoleCards,
        ).toHaveLength(2);
    });

    it("refunds the live pot and freezes the table when the host ends the game", () => {
        const state = makeState({
            street: "turn",
            currentBet: 60,
            actingPlayerIndex: 0,
            players: [
                makePlayer("a", "Alice", {
                    stack: 940,
                    committedThisStreet: 60,
                    committedThisHand: 60,
                }),
                makePlayer("b", "Bob", {
                    stack: 940,
                    committedThisStreet: 60,
                    committedThisHand: 60,
                }),
                makePlayer("c", "Cara", {
                    stack: 1000,
                    committedThisStreet: 0,
                    committedThisHand: 0,
                }),
            ],
        });

        endGameByHost(state);

        expect(state.street).toBe("tournament_over");
        expect(state.players[0].stack).toBe(1000);
        expect(state.players[1].stack).toBe(1000);
        expect(state.endedByHost).toBe(true);
    });

    it("skips busted players when a new hand starts", () => {
        const state = makeState({
            street: "hand_over",
            players: [
                makePlayer("a", "Alice", { stack: 0, status: "busted" }),
                makePlayer("b", "Bob", { stack: 300 }),
                makePlayer("c", "Cara", { stack: 700 }),
            ],
        });

        const started = startNextHand(state, noShuffle);

        expect(started).toBe(true);
        expect(state.players[0].status).toBe("busted");
        expect(state.players[1].holeCards).toHaveLength(2);
        expect(state.players[2].holeCards).toHaveLength(2);
    });
});
