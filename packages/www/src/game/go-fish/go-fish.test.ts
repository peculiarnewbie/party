import { describe, it, expect } from "bun:test";
import {
    createDeck,
    initGame,
    processAction,
    checkForBooks,
    checkGameOver,
} from "./engine";
import { getPlayerView } from "./views";
import type { GoFishState, GoFishPlayer } from "./types";
import type { Card, Rank } from "~/assets/card-deck/types";

const noShuffle = <T,>(arr: T[]): T[] => [...arr];

function seededShuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    let seed = 42;
    for (let i = a.length - 1; i > 0; i--) {
        seed = (seed * 16807) % 2147483647;
        const j = seed % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

describe("createDeck", () => {
    it("creates 52 cards", () => {
        const deck = createDeck();
        expect(deck).toHaveLength(52);
    });

    it("has 13 cards per suit", () => {
        const deck = createDeck();
        const suits = ["spade", "heart", "diamond", "club"] as const;
        for (const suit of suits) {
            const count = deck.filter((c) => c.suit === suit).length;
            expect(count).toBe(13);
        }
    });

    it("has 4 cards per rank", () => {
        const deck = createDeck();
        for (let rank = 1; rank <= 13; rank++) {
            const count = deck.filter((c) => c.rank === rank).length;
            expect(count).toBe(4);
        }
    });
});

describe("initGame", () => {
    it("deals 7 cards each for 2 players", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            noShuffle,
        );
        expect(state.players[0].hand.length).toBe(7);
        expect(state.players[1].hand.length).toBe(7);
        expect(state.drawPile.length).toBe(52 - 14);
    });

    it("deals 7 cards each for 3 players", () => {
        const state = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
                { id: "c", name: "C" },
            ],
            noShuffle,
        );
        expect(state.players[0].hand.length).toBe(7);
        expect(state.drawPile.length).toBe(52 - 21);
    });

    it("deals 5 cards each for 4 players", () => {
        const state = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
                { id: "c", name: "C" },
                { id: "d", name: "D" },
            ],
            noShuffle,
        );
        expect(state.players[0].hand.length).toBe(5);
        expect(state.drawPile.length).toBe(52 - 20);
    });

    it("deals 5 cards each for 6 players", () => {
        const players = Array.from({ length: 6 }, (_, i) => ({
            id: `p${i}`,
            name: `P${i}`,
        }));
        const state = initGame(players, noShuffle);
        for (const p of state.players) {
            expect(p.hand.length).toBe(5);
        }
        expect(state.drawPile.length).toBe(52 - 30);
    });

    it("starts with player 0 in awaiting_ask phase", () => {
        const state = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
            ],
            noShuffle,
        );
        expect(state.currentPlayerIndex).toBe(0);
        expect(state.turnPhase).toBe("awaiting_ask");
        expect(state.gameOver).toBe(false);
    });

    it("is deterministic with the same shuffle function", () => {
        const s1 = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
            ],
            seededShuffle,
        );
        const s2 = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
            ],
            seededShuffle,
        );
        expect(s1.players[0].hand).toEqual(s2.players[0].hand);
        expect(s1.drawPile).toEqual(s2.drawPile);
    });
});

describe("processAction - ask", () => {
    function makeState(overrides?: Partial<GoFishState>): GoFishState {
        return {
            players: [
                {
                    id: "alice",
                    name: "Alice",
                    hand: [
                        { suit: "spade", rank: 7 },
                        { suit: "heart", rank: 7 },
                        { suit: "diamond", rank: 3 },
                    ],
                    books: [],
                },
                {
                    id: "bob",
                    name: "Bob",
                    hand: [
                        { suit: "club", rank: 7 },
                        { suit: "diamond", rank: 7 },
                        { suit: "spade", rank: 5 },
                    ],
                    books: [],
                },
            ],
            drawPile: [
                { suit: "heart", rank: 10 },
                { suit: "club", rank: 2 },
            ],
            currentPlayerIndex: 0,
            turnPhase: "awaiting_ask",
            lastAction: null,
            lastResult: null,
            lastAskedRank: null,
            gameOver: false,
            winner: null,
            ...overrides,
        };
    }

    it("transfers cards on successful ask", () => {
        const state = makeState();
        const result = processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "bob",
            rank: 7,
        });

        expect(result.type).toBe("cards_given");
        if (result.type === "cards_given") {
            expect(result.count).toBe(2);
            expect(result.rank).toBe(7);
            expect(result.fromId).toBe("bob");
            expect(result.toId).toBe("alice");
        }

        expect(state.players[1].hand.filter((c) => c.rank === 7).length).toBe(
            0,
        );
        expect(state.players[0].books).toContain(7);
        expect(state.players[0].hand.filter((c) => c.rank === 7).length).toBe(0);
    });

    it("grants extra turn after successful ask", () => {
        const state = makeState();
        processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "bob",
            rank: 7,
        });
        expect(state.currentPlayerIndex).toBe(0);
        expect(state.turnPhase).toBe("awaiting_ask");
    });

    it("triggers go_fish when target has no matching cards", () => {
        const state = makeState();
        const result = processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "bob",
            rank: 3,
        });

        expect(result.type).toBe("go_fish");
        expect(state.turnPhase).toBe("go_fish");
        expect(state.currentPlayerIndex).toBe(0);
    });

    it("rejects ask when not your turn", () => {
        const state = makeState();
        const result = processAction(state, {
            type: "ask",
            askerId: "bob",
            targetId: "alice",
            rank: 7,
        });
        expect(result.type).toBe("error");
    });

    it("rejects asking yourself", () => {
        const state = makeState();
        const result = processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "alice",
            rank: 7,
        });
        expect(result.type).toBe("error");
    });

    it("rejects asking for a rank not in hand", () => {
        const state = makeState();
        const result = processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "bob",
            rank: 5,
        });
        expect(result.type).toBe("error");
    });

    it("rejects ask during go_fish phase", () => {
        const state = makeState({ turnPhase: "go_fish" });
        const result = processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "bob",
            rank: 7,
        });
        expect(result.type).toBe("error");
    });
});

describe("processAction - draw", () => {
    function makeGoFishState(): GoFishState {
        return {
            players: [
                {
                    id: "alice",
                    name: "Alice",
                    hand: [{ suit: "spade", rank: 3 }],
                    books: [],
                },
                {
                    id: "bob",
                    name: "Bob",
                    hand: [{ suit: "club", rank: 5 }],
                    books: [],
                },
            ],
            drawPile: [
                { suit: "heart", rank: 10 },
                { suit: "diamond", rank: 3 },
            ],
            currentPlayerIndex: 0,
            turnPhase: "go_fish",
            lastAction: { type: "ask", askerId: "alice", targetId: "bob", rank: 3 },
            lastResult: null,
            lastAskedRank: 3,
            gameOver: false,
            winner: null,
        };
    }

    it("draws a card and advances turn when rank does not match", () => {
        const state = makeGoFishState();
        state.drawPile = [{ suit: "heart", rank: 10 }];

        const result = processAction(state, {
            type: "draw",
            playerId: "alice",
        });

        expect(result.type).toBe("go_fish");
        if (result.type === "go_fish") {
            expect(result.drewAskedRank).toBe(false);
        }
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.turnPhase).toBe("awaiting_ask");
        expect(state.players[0].hand.length).toBe(2);
    });

    it("grants extra turn when drawing the asked rank", () => {
        const state = makeGoFishState();
        state.drawPile = [{ suit: "diamond", rank: 3 }];

        const result = processAction(state, {
            type: "draw",
            playerId: "alice",
        });

        expect(result.type).toBe("go_fish");
        if (result.type === "go_fish") {
            expect(result.drewAskedRank).toBe(true);
        }
        expect(state.currentPlayerIndex).toBe(0);
        expect(state.turnPhase).toBe("awaiting_ask");
    });

    it("rejects draw when not in go_fish phase", () => {
        const state = makeGoFishState();
        state.turnPhase = "awaiting_ask";
        const result = processAction(state, {
            type: "draw",
            playerId: "alice",
        });
        expect(result.type).toBe("error");
    });

    it("rejects draw by wrong player", () => {
        const state = makeGoFishState();
        const result = processAction(state, {
            type: "draw",
            playerId: "bob",
        });
        expect(result.type).toBe("error");
    });

    it("handles empty draw pile gracefully", () => {
        const state = makeGoFishState();
        state.drawPile = [];

        const result = processAction(state, {
            type: "draw",
            playerId: "alice",
        });

        expect(state.currentPlayerIndex).toBe(1);
    });
});

describe("checkForBooks", () => {
    it("detects a completed book", () => {
        const player: GoFishPlayer = {
            id: "a",
            name: "A",
            hand: [
                { suit: "spade", rank: 7 },
                { suit: "heart", rank: 7 },
                { suit: "diamond", rank: 7 },
                { suit: "club", rank: 7 },
                { suit: "spade", rank: 3 },
            ],
            books: [],
        };
        const books = checkForBooks(player);
        expect(books).toEqual([7]);
        expect(player.books).toContain(7);
        expect(player.hand.length).toBe(1);
        expect(player.hand[0].rank).toBe(3);
    });

    it("detects multiple books at once", () => {
        const player: GoFishPlayer = {
            id: "a",
            name: "A",
            hand: [
                { suit: "spade", rank: 7 },
                { suit: "heart", rank: 7 },
                { suit: "diamond", rank: 7 },
                { suit: "club", rank: 7 },
                { suit: "spade", rank: 3 },
                { suit: "heart", rank: 3 },
                { suit: "diamond", rank: 3 },
                { suit: "club", rank: 3 },
            ],
            books: [],
        };
        const books = checkForBooks(player);
        expect(books.length).toBe(2);
        expect(player.hand.length).toBe(0);
    });

    it("does nothing when no book is complete", () => {
        const player: GoFishPlayer = {
            id: "a",
            name: "A",
            hand: [
                { suit: "spade", rank: 7 },
                { suit: "heart", rank: 7 },
                { suit: "diamond", rank: 3 },
            ],
            books: [],
        };
        const books = checkForBooks(player);
        expect(books.length).toBe(0);
        expect(player.hand.length).toBe(3);
    });
});

describe("checkGameOver", () => {
    it("returns true when all 13 books are made", () => {
        const state: GoFishState = {
            players: [
                { id: "a", name: "A", hand: [], books: [1, 2, 3, 4, 5, 6, 7] },
                { id: "b", name: "B", hand: [], books: [8, 9, 10, 11, 12, 13] },
            ],
            drawPile: [],
            currentPlayerIndex: 0,
            turnPhase: "awaiting_ask",
            lastAction: null,
            lastResult: null,
            lastAskedRank: null,
            gameOver: false,
            winner: null,
        };
        expect(checkGameOver(state)).toBe(true);
    });

    it("returns true when draw pile and all hands empty", () => {
        const state: GoFishState = {
            players: [
                { id: "a", name: "A", hand: [], books: [1, 2] },
                { id: "b", name: "B", hand: [], books: [3, 4] },
            ],
            drawPile: [],
            currentPlayerIndex: 0,
            turnPhase: "awaiting_ask",
            lastAction: null,
            lastResult: null,
            lastAskedRank: null,
            gameOver: false,
            winner: null,
        };
        expect(checkGameOver(state)).toBe(true);
    });

    it("returns false when game is still in progress", () => {
        const state: GoFishState = {
            players: [
                {
                    id: "a",
                    name: "A",
                    hand: [{ suit: "spade", rank: 1 }],
                    books: [],
                },
                {
                    id: "b",
                    name: "B",
                    hand: [{ suit: "heart", rank: 2 }],
                    books: [],
                },
            ],
            drawPile: [{ suit: "club", rank: 3 }],
            currentPlayerIndex: 0,
            turnPhase: "awaiting_ask",
            lastAction: null,
            lastResult: null,
            lastAskedRank: null,
            gameOver: false,
            winner: null,
        };
        expect(checkGameOver(state)).toBe(false);
    });
});

describe("getPlayerView", () => {
    it("shows own hand but hides others", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        const view = getPlayerView(state, "a");

        expect(view.myHand.length).toBeGreaterThan(0);
        expect(view.players.length).toBe(2);

        const me = view.players.find((p) => p.id === "a")!;
        const other = view.players.find((p) => p.id === "b")!;
        expect(me.cardCount).toBe(view.myHand.length);
        expect(other.cardCount).toBeGreaterThan(0);
        expect((other as any).hand).toBeUndefined();
    });

    it("includes draw pile count", () => {
        const state = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
            ],
            noShuffle,
        );
        const view = getPlayerView(state, "a");
        expect(view.drawPileCount).toBe(52 - 14);
    });

    it("includes current player and turn phase", () => {
        const state = initGame(
            [
                { id: "a", name: "A" },
                { id: "b", name: "B" },
            ],
            noShuffle,
        );
        const view = getPlayerView(state, "a");
        expect(view.currentPlayerId).toBe("a");
        expect(view.turnPhase).toBe("awaiting_ask");
    });
});

describe("full game flow", () => {
    it("book is created when 4 of same rank collected via ask", () => {
        const state: GoFishState = {
            players: [
                {
                    id: "alice",
                    name: "Alice",
                    hand: [
                        { suit: "spade", rank: 7 },
                        { suit: "heart", rank: 7 },
                    ],
                    books: [],
                },
                {
                    id: "bob",
                    name: "Bob",
                    hand: [
                        { suit: "diamond", rank: 7 },
                        { suit: "club", rank: 7 },
                        { suit: "spade", rank: 3 },
                    ],
                    books: [],
                },
            ],
            drawPile: [{ suit: "heart", rank: 10 }],
            currentPlayerIndex: 0,
            turnPhase: "awaiting_ask",
            lastAction: null,
            lastResult: null,
            lastAskedRank: null,
            gameOver: false,
            winner: null,
        };

        const result = processAction(state, {
            type: "ask",
            askerId: "alice",
            targetId: "bob",
            rank: 7,
        });

        expect(result.type).toBe("cards_given");
        if (result.type === "cards_given") {
            expect(result.bookMade).toBe(true);
        }
        expect(state.players[0].books).toContain(7);
        expect(state.players[0].hand.filter((c) => c.rank === 7).length).toBe(0);
    });

    it("rejects actions after game is over", () => {
        const state: GoFishState = {
            players: [
                { id: "a", name: "A", hand: [], books: [] },
                { id: "b", name: "B", hand: [], books: [] },
            ],
            drawPile: [],
            currentPlayerIndex: 0,
            turnPhase: "awaiting_ask",
            lastAction: null,
            lastResult: null,
            lastAskedRank: null,
            gameOver: true,
            winner: ["a"],
        };
        const result = processAction(state, {
            type: "ask",
            askerId: "a",
            targetId: "b",
            rank: 1,
        });
        expect(result.type).toBe("error");
    });
});
