import { describe, it, expect } from "vitest";
import {
    createShoe,
    getHandValue,
    isNaturalBlackjack,
    initGame,
    processAction,
    isHandDone,
    STARTING_CHIPS,
    MIN_BET,
    MAX_BET,
    DECK_COUNT,
} from "./engine";
import { getPlayerView } from "./views";
import type { BlackjackState, BlackjackHand } from "./types";
import type { Card } from "~/assets/card-deck/types";
import type { BlackjackPhase } from "./types";

function phaseOf(state: BlackjackState): BlackjackPhase {
    return state.phase;
}

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

describe("createShoe", () => {
    it("creates correct number of cards for 6 decks", () => {
        const shoe = createShoe(6, noShuffle);
        expect(shoe).toHaveLength(312);
    });

    it("creates correct number of cards for 1 deck", () => {
        const shoe = createShoe(1, noShuffle);
        expect(shoe).toHaveLength(52);
    });

    it("has correct distribution per rank", () => {
        const shoe = createShoe(6, noShuffle);
        for (let rank = 1; rank <= 13; rank++) {
            const count = shoe.filter((c) => c.rank === rank).length;
            expect(count).toBe(24);
        }
    });

    it("has correct distribution per suit", () => {
        const shoe = createShoe(6, noShuffle);
        const suits = ["spade", "heart", "diamond", "club"] as const;
        for (const suit of suits) {
            const count = shoe.filter((c) => c.suit === suit).length;
            expect(count).toBe(78);
        }
    });
});

describe("getHandValue", () => {
    it("calculates simple number cards", () => {
        const { value, soft } = getHandValue([
            { suit: "spade", rank: 5 },
            { suit: "heart", rank: 8 },
        ]);
        expect(value).toBe(13);
        expect(soft).toBe(false);
    });

    it("treats face cards as 10", () => {
        const { value } = getHandValue([
            { suit: "spade", rank: 11 },
            { suit: "heart", rank: 12 },
        ]);
        expect(value).toBe(20);
    });

    it("king is worth 10", () => {
        const { value } = getHandValue([
            { suit: "spade", rank: 13 },
            { suit: "heart", rank: 5 },
        ]);
        expect(value).toBe(15);
    });

    it("treats ace as 11 when possible", () => {
        const { value, soft } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 8 },
        ]);
        expect(value).toBe(19);
        expect(soft).toBe(true);
    });

    it("treats ace as 1 to avoid bust", () => {
        const { value, soft } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 8 },
            { suit: "diamond", rank: 7 },
        ]);
        expect(value).toBe(16);
        expect(soft).toBe(false);
    });

    it("handles blackjack (ace + ten)", () => {
        const { value } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 10 },
        ]);
        expect(value).toBe(21);
    });

    it("handles blackjack (ace + king)", () => {
        const { value } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 13 },
        ]);
        expect(value).toBe(21);
    });

    it("handles two aces", () => {
        const { value, soft } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 1 },
        ]);
        expect(value).toBe(12);
        expect(soft).toBe(true);
    });

    it("handles bust", () => {
        const { value } = getHandValue([
            { suit: "spade", rank: 10 },
            { suit: "heart", rank: 8 },
            { suit: "diamond", rank: 7 },
        ]);
        expect(value).toBe(25);
    });

    it("handles three aces", () => {
        const { value } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 1 },
            { suit: "diamond", rank: 1 },
        ]);
        expect(value).toBe(13);
    });

    it("handles soft 17", () => {
        const { value, soft } = getHandValue([
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 6 },
        ]);
        expect(value).toBe(17);
        expect(soft).toBe(true);
    });
});

describe("isNaturalBlackjack", () => {
    it("ace + king is blackjack", () => {
        expect(
            isNaturalBlackjack([
                { suit: "spade", rank: 1 },
                { suit: "heart", rank: 13 },
            ]),
        ).toBe(true);
    });

    it("ace + ten is blackjack", () => {
        expect(
            isNaturalBlackjack([
                { suit: "spade", rank: 1 },
                { suit: "heart", rank: 10 },
            ]),
        ).toBe(true);
    });

    it("ace + jack is blackjack", () => {
        expect(
            isNaturalBlackjack([
                { suit: "spade", rank: 1 },
                { suit: "heart", rank: 11 },
            ]),
        ).toBe(true);
    });

    it("three-card 21 is not blackjack", () => {
        expect(
            isNaturalBlackjack([
                { suit: "spade", rank: 7 },
                { suit: "heart", rank: 7 },
                { suit: "diamond", rank: 7 },
            ]),
        ).toBe(false);
    });

    it("non-21 two cards is not blackjack", () => {
        expect(
            isNaturalBlackjack([
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 9 },
            ]),
        ).toBe(false);
    });
});

describe("initGame", () => {
    it("creates game in betting phase", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            noShuffle,
        );
        expect(phaseOf(state)).toBe("betting");
        expect(state.players).toHaveLength(2);
        expect(state.roundNumber).toBe(1);
    });

    it("gives starting chips", () => {
        const state = initGame([{ id: "a", name: "Alice" }], noShuffle);
        expect(state.players[0].chips).toBe(STARTING_CHIPS);
    });

    it("creates correct shoe size", () => {
        const state = initGame([{ id: "a", name: "Alice" }], noShuffle);
        expect(state.shoe).toHaveLength(DECK_COUNT * 52);
    });

    it("starts with empty hands", () => {
        const state = initGame([{ id: "a", name: "Alice" }], noShuffle);
        expect(state.players[0].hands).toHaveLength(0);
        expect(state.dealerHand).toHaveLength(0);
    });

    it("is deterministic with same shuffle", () => {
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
        expect(s1.shoe).toEqual(s2.shoe);
    });
});

describe("place_bet", () => {
    it("records a bet and deducts chips", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        const result = processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        expect(result.type).toBe("bet_placed");
        expect(state.players[0].bet).toBe(50);
        expect(state.players[0].chips).toBe(STARTING_CHIPS - 50);
    });

    it("clamps bet to minimum", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 1,
        });
        expect(state.players[0].bet).toBe(MIN_BET);
    });

    it("clamps bet to maximum", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 9999,
        });
        expect(state.players[0].bet).toBe(MAX_BET);
    });

    it("clamps bet to available chips", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        state.players[0].chips = 30;
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 100,
        });
        expect(state.players[0].bet).toBe(30);
    });

    it("rejects duplicate bet", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        const result = processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        expect(result.type).toBe("error");
    });

    it("deals cards when all bets placed", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        const result = processAction(state, {
            type: "place_bet",
            playerId: "b",
            amount: 50,
        });
        expect(
            result.type === "dealt" ||
                result.type === "settled",
        ).toBe(true);
        expect(state.players[0].hands).toHaveLength(1);
        expect(state.players[0].hands[0].cards).toHaveLength(2);
        expect(state.players[1].hands).toHaveLength(1);
        expect(state.dealerHand).toHaveLength(2);
    });

    it("burns a card before dealing", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        const shoeCountBefore = state.shoe.length;
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        processAction(state, {
            type: "place_bet",
            playerId: "b",
            amount: 50,
        });
        const cardsDealt = 2 * 2 + 2 + 1;
        expect(state.shoe.length).toBe(shoeCountBefore - cardsDealt);
        expect(state.burnPile).toHaveLength(1);
    });

    it("rejects bet in wrong phase", () => {
        const state = initGame(
            [{ id: "a", name: "Alice" }],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        const result = processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        expect(result.type).toBe("error");
    });
});

describe("hit", () => {
    function makePlayingState(): BlackjackState {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        processAction(state, {
            type: "place_bet",
            playerId: "b",
            amount: 50,
        });

        if (phaseOf(state) === "insurance") {
            processAction(state, {
                type: "insurance",
                playerId: "a",
                accept: false,
            });
            processAction(state, {
                type: "insurance",
                playerId: "b",
                accept: false,
            });
        }

        return state;
    }

    it("draws a card to current hand", () => {
        const state = makePlayingState();
        if (phaseOf(state) !== "playing") return;

        const currentPlayer =
            state.players[state.currentPlayerIndex];
        const cardsBefore = currentPlayer.hands[0].cards.length;

        const result = processAction(state, {
            type: "hit",
            playerId: currentPlayer.id,
        });
        expect(
            result.type === "player_hit" ||
                result.type === "error",
        ).toBe(true);
        if (result.type === "player_hit") {
            expect(
                currentPlayer.hands[0].cards.length,
            ).toBe(cardsBefore + 1);
        }
    });

    it("rejects hit from wrong player", () => {
        const state = makePlayingState();
        if (phaseOf(state) !== "playing") return;

        const wrongPlayer =
            state.players.find(
                (_, i) => i !== state.currentPlayerIndex,
            );
        if (!wrongPlayer) return;

        const result = processAction(state, {
            type: "hit",
            playerId: wrongPlayer.id,
        });
        expect(result.type).toBe("error");
    });

    it("rejects hit in wrong phase", () => {
        const state = initGame(
            [{ id: "a", name: "Alice" }],
            seededShuffle,
        );
        const result = processAction(state, {
            type: "hit",
            playerId: "a",
        });
        expect(result.type).toBe("error");
    });
});

describe("stand", () => {
    function makePlayingState(): BlackjackState {
        const state = initGame(
            [{ id: "a", name: "Alice" }],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        if (phaseOf(state) === "insurance") {
            processAction(state, {
                type: "insurance",
                playerId: "a",
                accept: false,
            });
        }
        return state;
    }

    it("marks hand as stood and settles when last player", () => {
        const state = makePlayingState();
        if (phaseOf(state) !== "playing") return;

        const result = processAction(state, {
            type: "stand",
            playerId: "a",
        });

        expect(
            result.type === "player_stood" ||
                result.type === "error",
        ).toBe(true);

        if (result.type === "player_stood") {
            expect(phaseOf(state)).toBe("settled");
            expect(state.dealerRevealed).toBe(true);
        }
    });
});

describe("double_down", () => {
    it("doubles bet and draws exactly one card", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 5 },
                                { suit: "heart", rank: 6 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [
                { suit: "diamond", rank: 3 },
                { suit: "club", rank: 8 },
            ],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        const result = processAction(state, {
            type: "double_down",
            playerId: "a",
        });

        expect(result.type).toBe("player_doubled");
        expect(state.players[0].hands[0].cards).toHaveLength(3);
        expect(state.players[0].hands[0].bet).toBe(100);
        expect(state.players[0].hands[0].doubled).toBe(true);
        expect(state.players[0].hands[0].stood).toBe(true);
        expect(phaseOf(state)).toBe("settled");
        expect(state.results).not.toBeNull();
        expect(state.results![0].hands[0].bet).toBe(100);
    });

    it("rejects double with insufficient chips", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 10,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 5 },
                                { suit: "heart", rank: 6 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [{ suit: "diamond", rank: 3 }],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        const result = processAction(state, {
            type: "double_down",
            playerId: "a",
        });
        expect(result.type).toBe("error");
    });

    it("rejects double after hit (3+ cards)", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 3 },
                                { suit: "heart", rank: 4 },
                                { suit: "diamond", rank: 2 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [{ suit: "diamond", rank: 3 }],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        const result = processAction(state, {
            type: "double_down",
            playerId: "a",
        });
        expect(result.type).toBe("error");
    });
});

describe("split", () => {
    function makeSplittableState(): BlackjackState {
        return {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 8 },
                                { suit: "heart", rank: 8 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [
                { suit: "club", rank: 2 },
                { suit: "diamond", rank: 3 },
                { suit: "spade", rank: 4 },
                { suit: "heart", rank: 5 },
                { suit: "club", rank: 6 },
                { suit: "diamond", rank: 7 },
            ],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };
    }

    it("splits pair into two hands", () => {
        const state = makeSplittableState();
        const result = processAction(state, {
            type: "split",
            playerId: "a",
        });

        expect(result.type).toBe("player_split");
        expect(state.players[0].hands).toHaveLength(2);
        expect(state.players[0].hands[0].cards[0].rank).toBe(8);
        expect(state.players[0].hands[1].cards[0].rank).toBe(8);
        expect(state.players[0].hands[0].cards).toHaveLength(2);
        expect(state.players[0].hands[1].cards).toHaveLength(2);
        expect(state.players[0].chips).toBe(900);
    });

    it("rejects split on non-pair", () => {
        const state = makeSplittableState();
        state.players[0].hands[0].cards = [
            { suit: "spade", rank: 8 },
            { suit: "heart", rank: 9 },
        ];
        const result = processAction(state, {
            type: "split",
            playerId: "a",
        });
        expect(result.type).toBe("error");
    });

    it("allows splitting 10-value cards of different ranks", () => {
        const state = makeSplittableState();
        state.players[0].hands[0].cards = [
            { suit: "spade", rank: 11 },
            { suit: "heart", rank: 13 },
        ];
        const result = processAction(state, {
            type: "split",
            playerId: "a",
        });
        expect(result.type).toBe("player_split");
    });

    it("auto-stands split aces", () => {
        const state = makeSplittableState();
        state.players[0].hands[0].cards = [
            { suit: "spade", rank: 1 },
            { suit: "heart", rank: 1 },
        ];
        processAction(state, {
            type: "split",
            playerId: "a",
        });
        expect(state.players[0].hands[0].stood).toBe(true);
        expect(state.players[0].hands[1].stood).toBe(true);
    });

    it("rejects split with insufficient chips", () => {
        const state = makeSplittableState();
        state.players[0].chips = 10;
        const result = processAction(state, {
            type: "split",
            playerId: "a",
        });
        expect(result.type).toBe("error");
    });
});

describe("insurance", () => {
    function makeInsuranceState(): BlackjackState {
        return {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 10 },
                                { suit: "heart", rank: 9 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
                {
                    id: "b",
                    name: "Bob",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "diamond", rank: 10 },
                                { suit: "club", rank: 8 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [
                { suit: "club", rank: 2 },
                { suit: "diamond", rank: 3 },
                { suit: "spade", rank: 4 },
                { suit: "heart", rank: 5 },
            ],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 1 },
                { suit: "heart", rank: 13 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "insurance",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };
    }

    it("accepts insurance and deducts chips", () => {
        const state = makeInsuranceState();
        processAction(state, {
            type: "insurance",
            playerId: "a",
            accept: true,
        });
        expect(state.players[0].insuranceBet).toBe(25);
        expect(state.players[0].chips).toBe(925);
        expect(state.players[0].insuranceDecided).toBe(true);
    });

    it("declines insurance without deducting chips", () => {
        const state = makeInsuranceState();
        processAction(state, {
            type: "insurance",
            playerId: "a",
            accept: false,
        });
        expect(state.players[0].insuranceBet).toBe(0);
        expect(state.players[0].chips).toBe(950);
        expect(state.players[0].insuranceDecided).toBe(true);
    });

    it("settles immediately when dealer has blackjack", () => {
        const state = makeInsuranceState();
        processAction(state, {
            type: "insurance",
            playerId: "a",
            accept: true,
        });
        const result = processAction(state, {
            type: "insurance",
            playerId: "b",
            accept: false,
        });
        expect(result.type).toBe("insurance_resolved");
        if (result.type === "insurance_resolved") {
            expect(result.dealerBlackjack).toBe(true);
        }
        expect(phaseOf(state)).toBe("settled");
        expect(state.dealerRevealed).toBe(true);
    });

    it("pays insurance 2:1 when dealer has blackjack", () => {
        const state = makeInsuranceState();
        processAction(state, {
            type: "insurance",
            playerId: "a",
            accept: true,
        });
        processAction(state, {
            type: "insurance",
            playerId: "b",
            accept: false,
        });
        const result = state.results?.[0];
        expect(result).toBeDefined();
        expect(result!.insurancePayout).toBe(75);
    });

    it("continues to playing when dealer has no blackjack", () => {
        const state = makeInsuranceState();
        state.dealerHand[1] = { suit: "heart", rank: 7 };
        processAction(state, {
            type: "insurance",
            playerId: "a",
            accept: false,
        });
        const result = processAction(state, {
            type: "insurance",
            playerId: "b",
            accept: false,
        });
        expect(result.type).toBe("insurance_resolved");
        if (result.type === "insurance_resolved") {
            expect(result.dealerBlackjack).toBe(false);
        }
        expect(phaseOf(state)).toBe("playing");
    });
});

describe("settlement", () => {
    function settleWith(
        playerCards: Card[],
        dealerCards: Card[],
        bet: number,
    ): { outcome: string; payout: number; chips: number } {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: STARTING_CHIPS - bet,
                    hands: [
                        {
                            cards: playerCards,
                            bet,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: Array.from({ length: 20 }, () => ({
                suit: "club" as const,
                rank: 10 as Card["rank"],
            })),
            burnPile: [],
            dealerHand: dealerCards,
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing" as const,
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        processAction(state, { type: "stand", playerId: "a" });

        if (phaseOf(state) !== "settled" || !state.results) {
            return {
                outcome: "error",
                payout: 0,
                chips: state.players[0].chips,
            };
        }

        const hr = state.results[0].hands[0];
        return {
            outcome: hr.outcome,
            payout: hr.payout,
            chips: state.players[0].chips,
        };
    }

    it("pays 3:2 for blackjack", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: STARTING_CHIPS - 100,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 1 },
                                { suit: "heart", rank: 13 },
                            ],
                            bet: 100,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: true,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 100,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: true,
                },
                {
                    id: "b",
                    name: "Bob",
                    chips: STARTING_CHIPS - 100,
                    hands: [
                        {
                            cards: [
                                { suit: "diamond", rank: 10 },
                                { suit: "club", rank: 5 },
                            ],
                            bet: 100,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 100,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: Array.from({ length: 20 }, (_, i) => ({
                suit: "club" as const,
                rank: ((i % 8) + 2) as Card["rank"],
            })),
            burnPile: [],
            dealerHand: [
                { suit: "diamond", rank: 10 },
                { suit: "club", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 1,
            phase: "playing" as const,
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        processAction(state, { type: "stand", playerId: "b" });
        expect(phaseOf(state)).toBe("settled");
        expect(state.results![0].hands[0].outcome).toBe("blackjack");
        expect(state.results![0].hands[0].payout).toBe(250);
        expect(state.players[0].chips).toBe(STARTING_CHIPS - 100 + 250);
    });

    it("pays 1:1 for regular win", () => {
        const r = settleWith(
            [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 10 },
            ],
            [
                { suit: "diamond", rank: 10 },
                { suit: "club", rank: 7 },
            ],
            100,
        );
        expect(r.outcome).toBe("win");
        expect(r.payout).toBe(200);
        expect(r.chips).toBe(STARTING_CHIPS + 100);
    });

    it("returns bet on push", () => {
        const r = settleWith(
            [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 8 },
            ],
            [
                { suit: "diamond", rank: 10 },
                { suit: "club", rank: 8 },
            ],
            100,
        );
        expect(r.outcome).toBe("push");
        expect(r.payout).toBe(100);
        expect(r.chips).toBe(STARTING_CHIPS);
    });

    it("loses bet on loss", () => {
        const r = settleWith(
            [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            [
                { suit: "diamond", rank: 10 },
                { suit: "club", rank: 8 },
            ],
            100,
        );
        expect(r.outcome).toBe("lose");
        expect(r.payout).toBe(0);
        expect(r.chips).toBe(STARTING_CHIPS - 100);
    });

    it("player wins when dealer busts", () => {
        const r = settleWith(
            [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 5 },
            ],
            [
                { suit: "diamond", rank: 10 },
                { suit: "club", rank: 6 },
            ],
            100,
        );
        expect(r.outcome).toBe("win");
    });
});

describe("new_round", () => {
    it("rejects when not settled", () => {
        const state = initGame(
            [{ id: "a", name: "Alice" }],
            seededShuffle,
        );
        const result = processAction(state, { type: "new_round" });
        expect(result.type).toBe("error");
    });

    it("increments round number", () => {
        const state = initGame(
            [{ id: "a", name: "Alice" }],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        if (phaseOf(state) === "insurance") {
            processAction(state, {
                type: "insurance",
                playerId: "a",
                accept: false,
            });
        }
        if (phaseOf(state) === "playing") {
            processAction(state, {
                type: "stand",
                playerId: "a",
            });
        }
        if (phaseOf(state) !== "settled") return;

        const result = processAction(state, { type: "new_round" });
        expect(result.type).toBe("new_round");
        if (result.type === "new_round") {
            expect(result.roundNumber).toBe(2);
        }
        expect(phaseOf(state)).toBe("betting");
    });

    it("sits out players with no chips", () => {
        const state = initGame(
            [
                { id: "a", name: "Alice" },
                { id: "b", name: "Bob" },
            ],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });
        processAction(state, {
            type: "place_bet",
            playerId: "b",
            amount: 50,
        });
        if (phaseOf(state) === "insurance") {
            processAction(state, {
                type: "insurance",
                playerId: "a",
                accept: false,
            });
            processAction(state, {
                type: "insurance",
                playerId: "b",
                accept: false,
            });
        }
        while (phaseOf(state) === "playing") {
            const cp = state.players[state.currentPlayerIndex];
            processAction(state, {
                type: "stand",
                playerId: cp.id,
            });
        }
        if (phaseOf(state) !== "settled") return;

        state.players[1].chips = 0;
        processAction(state, { type: "new_round" });
        expect(state.players[1].done).toBe(true);
    });
});

describe("dealer behavior", () => {
    it("dealer hits on soft 17", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 10 },
                                { suit: "heart", rank: 10 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [
                { suit: "club", rank: 2 },
                { suit: "diamond", rank: 3 },
            ],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 1 },
                { suit: "heart", rank: 6 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        processAction(state, {
            type: "stand",
            playerId: "a",
        });

        expect(state.dealerHand.length).toBeGreaterThan(2);
    });

    it("dealer stands on hard 17", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 10 },
                                { suit: "heart", rank: 10 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [{ suit: "club", rank: 10 }],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        processAction(state, {
            type: "stand",
            playerId: "a",
        });

        expect(state.dealerHand).toHaveLength(2);
    });

    it("dealer does not draw when all players busted", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 10 },
                                { suit: "heart", rank: 6 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [
                { suit: "club", rank: 10 },
                { suit: "diamond", rank: 10 },
            ],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 6 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        processAction(state, {
            type: "hit",
            playerId: "a",
        });

        expect(state.players[0].hands[0].busted).toBe(true);
        expect(state.dealerHand).toHaveLength(2);
    });
});

describe("shoe management", () => {
    it("reshuffles when shoe is below cut card position", () => {
        const state = initGame(
            [{ id: "a", name: "Alice" }],
            seededShuffle,
        );
        processAction(state, {
            type: "place_bet",
            playerId: "a",
            amount: 50,
        });

        if (phaseOf(state) === "insurance") {
            processAction(state, {
                type: "insurance",
                playerId: "a",
                accept: false,
            });
        }
        if (phaseOf(state) === "playing") {
            processAction(state, {
                type: "stand",
                playerId: "a",
            });
        }
        if (phaseOf(state) !== "settled") return;

        state.shoe = state.shoe.slice(0, 10);
        processAction(state, { type: "new_round" });
        expect(state.shoe.length).toBe(DECK_COUNT * 52);
    });
});

describe("getPlayerView", () => {
    it("hides dealer hole card before reveal", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 10 },
                                { suit: "heart", rank: 9 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 1 },
                { suit: "heart", rank: 13 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        const view = getPlayerView(state, "a");
        expect(view.dealer.cards[0]).toEqual({
            suit: "spade",
            rank: 1,
        });
        expect(view.dealer.cards[1]).toBe("hidden");
        expect(view.dealer.value).toBeNull();
    });

    it("shows all dealer cards after reveal", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 1050,
                    hands: [],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: true,
                },
            ],
            shoe: [],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: true,
            currentPlayerIndex: 0,
            phase: "settled",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: [],
        };

        const view = getPlayerView(state, "a");
        expect(view.dealer.cards[0]).toEqual({
            suit: "spade",
            rank: 10,
        });
        expect(view.dealer.cards[1]).toEqual({
            suit: "heart",
            rank: 7,
        });
        expect(view.dealer.value).toBe(17);
    });

    it("shows correct action availability", () => {
        const state: BlackjackState = {
            players: [
                {
                    id: "a",
                    name: "Alice",
                    chips: 950,
                    hands: [
                        {
                            cards: [
                                { suit: "spade", rank: 8 },
                                { suit: "heart", rank: 8 },
                            ],
                            bet: 50,
                            doubled: false,
                            stood: false,
                            busted: false,
                            isBlackjack: false,
                            fromSplit: false,
                        },
                    ],
                    currentHandIndex: 0,
                    bet: 50,
                    insuranceBet: 0,
                    insuranceDecided: false,
                    done: false,
                },
            ],
            shoe: [],
            burnPile: [],
            dealerHand: [
                { suit: "spade", rank: 10 },
                { suit: "heart", rank: 7 },
            ],
            dealerRevealed: false,
            currentPlayerIndex: 0,
            phase: "playing",
            roundNumber: 1,
            deckCount: 6,
            cutCardPosition: 78,
            results: null,
        };

        const view = getPlayerView(state, "a");
        expect(view.isMyTurn).toBe(true);
        expect(view.canHit).toBe(true);
        expect(view.canStand).toBe(true);
        expect(view.canDouble).toBe(true);
        expect(view.canSplit).toBe(true);
    });
});
