import { describe, it, expect } from "vitest";
import { initGame, processAction, removePlayer, endGameByHost } from "./engine";
import type {
    CockroachPokerState,
    CockroachPokerAction,
    CreatureType,
} from "./types";
import { CREATURE_TYPES } from "./types";

const noShuffle = <T>(arr: T[]): T[] => [...arr];

const testPlayers = [
    { id: "p1", name: "Alice" },
    { id: "p2", name: "Bob" },
    { id: "p3", name: "Charlie" },
    { id: "p4", name: "Diana" },
];

describe("initGame", () => {
    it("deals cards evenly to all players", () => {
        const state = initGame(testPlayers, noShuffle);
        expect(state.players).toHaveLength(4);
        for (const player of state.players) {
            expect(player.hand).toHaveLength(16);
            expect(player.faceUpCards).toHaveLength(0);
        }
    });

    it("creates correct total card count", () => {
        const state = initGame(testPlayers, noShuffle);
        const totalCards = state.players.reduce(
            (sum, p) => sum + p.hand.length,
            0,
        );
        expect(totalCards).toBe(64);
    });

    it("handles remainder cards for 3 players", () => {
        const players = testPlayers.slice(0, 3);
        const state = initGame(players, noShuffle);
        for (const player of state.players) {
            expect(player.hand).toHaveLength(21);
        }
        const totalCards = state.players.reduce(
            (sum, p) => sum + p.hand.length,
            0,
        );
        expect(totalCards).toBe(63);
    });

    it("sets initial phase and active player", () => {
        const state = initGame(testPlayers, noShuffle);
        expect(state.phase).toBe("offering");
        expect(state.activePlayerId).toBe("p1");
        expect(state.offerChain).toBeNull();
        expect(state.loserId).toBeNull();
    });

    it("has all 8 creature types in deck", () => {
        const state = initGame(testPlayers, noShuffle);
        const allCards = state.players.flatMap((p) => p.hand);
        for (const creature of CREATURE_TYPES) {
            const count = allCards.filter((c) => c === creature).length;
            expect(count).toBe(8);
        }
    });
});

describe("offer_card", () => {
    it("removes card from hand and creates offer chain", () => {
        const state = initGame(testPlayers, noShuffle);
        const cardToOffer = state.players[0].hand[0];
        const initialHandSize = state.players[0].hand.length;

        const result = processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "cockroach",
        });

        expect(result.type).toBe("card_offered");
        expect(state.players[0].hand).toHaveLength(initialHandSize - 1);
        expect(state.offerChain).not.toBeNull();
        expect(state.offerChain!.cardValue).toBe(cardToOffer);
        expect(state.offerChain!.currentClaim).toBe("cockroach");
        expect(state.offerChain!.currentOffererId).toBe("p1");
        expect(state.offerChain!.currentReceiverId).toBe("p2");
        expect(state.offerChain!.seenByPlayerIds).toEqual(["p1"]);
        expect(state.phase).toBe("awaiting_response");
        expect(state.activePlayerId).toBe("p2");
    });

    it("rejects when not offering phase", () => {
        const state = initGame(testPlayers, noShuffle);
        state.phase = "awaiting_response";

        const result = processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        expect(result.type).toBe("error");
    });

    it("rejects when wrong player", () => {
        const state = initGame(testPlayers, noShuffle);

        const result = processAction(state, {
            type: "offer_card",
            playerId: "p2",
            targetId: "p1",
            cardIndex: 0,
            claim: "bat",
        });

        expect(result.type).toBe("error");
    });

    it("rejects when offering to self", () => {
        const state = initGame(testPlayers, noShuffle);

        const result = processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p1",
            cardIndex: 0,
            claim: "bat",
        });

        expect(result.type).toBe("error");
    });

    it("rejects invalid card index", () => {
        const state = initGame(testPlayers, noShuffle);

        const result = processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 999,
            claim: "bat",
        });

        expect(result.type).toBe("error");
    });
});

describe("call_true", () => {
    function setupOffer(
        claim: CreatureType,
        actualCard?: CreatureType,
    ): CockroachPokerState {
        const state = initGame(testPlayers, noShuffle);
        if (actualCard) {
            const idx = state.players[0].hand.indexOf(actualCard);
            if (idx >= 0) {
                processAction(state, {
                    type: "offer_card",
                    playerId: "p1",
                    targetId: "p2",
                    cardIndex: idx,
                    claim,
                });
                return state;
            }
        }
        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim,
        });
        return state;
    }

    it("offerer takes card when caller is correct (claim is true)", () => {
        const state = initGame(testPlayers, noShuffle);
        const actualCard = state.players[0].hand[0];

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: actualCard,
        });

        const result = processAction(state, {
            type: "call_true",
            playerId: "p2",
        });

        expect(result.type).toBe("call_resolved");
        if (result.type === "call_resolved") {
            expect(result.wasCorrect).toBe(true);
            expect(result.cardTakerId).toBe("p1");
        }
        expect(state.players[0].faceUpCards).toContain(actualCard);
        expect(state.phase).toBe("offering");
        expect(state.activePlayerId).toBe("p1");
    });

    it("receiver takes card when caller is wrong (claim is false)", () => {
        const state = initGame(testPlayers, noShuffle);
        const actualCard = state.players[0].hand[0];
        const wrongClaim =
            CREATURE_TYPES.find((c) => c !== actualCard) ?? "bat";

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: wrongClaim,
        });

        const result = processAction(state, {
            type: "call_true",
            playerId: "p2",
        });

        expect(result.type).toBe("call_resolved");
        if (result.type === "call_resolved") {
            expect(result.wasCorrect).toBe(false);
            expect(result.cardTakerId).toBe("p2");
        }
        expect(state.players[1].faceUpCards).toContain(actualCard);
        expect(state.phase).toBe("offering");
        expect(state.activePlayerId).toBe("p2");
    });
});

describe("call_false", () => {
    it("offerer takes card when caller is correct (claim was indeed false)", () => {
        const state = initGame(testPlayers, noShuffle);
        const actualCard = state.players[0].hand[0];
        const wrongClaim =
            CREATURE_TYPES.find((c) => c !== actualCard) ?? "bat";

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: wrongClaim,
        });

        const result = processAction(state, {
            type: "call_false",
            playerId: "p2",
        });

        expect(result.type).toBe("call_resolved");
        if (result.type === "call_resolved") {
            expect(result.wasCorrect).toBe(true);
            expect(result.cardTakerId).toBe("p1");
        }
        expect(state.players[0].faceUpCards).toContain(actualCard);
    });

    it("receiver takes card when caller is wrong (claim was actually true)", () => {
        const state = initGame(testPlayers, noShuffle);
        const actualCard = state.players[0].hand[0];

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: actualCard,
        });

        const result = processAction(state, {
            type: "call_false",
            playerId: "p2",
        });

        expect(result.type).toBe("call_resolved");
        if (result.type === "call_resolved") {
            expect(result.wasCorrect).toBe(false);
            expect(result.cardTakerId).toBe("p2");
        }
        expect(state.players[1].faceUpCards).toContain(actualCard);
    });
});

describe("peek_and_pass", () => {
    it("passes card to a new player", () => {
        const state = initGame(testPlayers, noShuffle);

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        const result = processAction(state, {
            type: "peek_and_pass",
            playerId: "p2",
            targetId: "p3",
            newClaim: "fly",
        });

        expect(result.type).toBe("card_passed");
        if (result.type === "card_passed") {
            expect(result.passerId).toBe("p2");
            expect(result.newReceiverId).toBe("p3");
            expect(result.newClaim).toBe("fly");
        }
        expect(state.offerChain!.seenByPlayerIds).toContain("p2");
        expect(state.offerChain!.currentOffererId).toBe("p2");
        expect(state.offerChain!.currentReceiverId).toBe("p3");
        expect(state.offerChain!.currentClaim).toBe("fly");
        expect(state.activePlayerId).toBe("p3");
    });

    it("rejects passing to a player who already saw the card", () => {
        const state = initGame(testPlayers, noShuffle);

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        processAction(state, {
            type: "peek_and_pass",
            playerId: "p2",
            targetId: "p3",
            newClaim: "fly",
        });

        const result = processAction(state, {
            type: "peek_and_pass",
            playerId: "p3",
            targetId: "p1",
            newClaim: "cockroach",
        });

        expect(result.type).toBe("error");
    });

    it("rejects when last unseen player tries to pass", () => {
        const players = testPlayers.slice(0, 3);
        const state = initGame(players, noShuffle);

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        processAction(state, {
            type: "peek_and_pass",
            playerId: "p2",
            targetId: "p3",
            newClaim: "fly",
        });

        const result = processAction(state, {
            type: "peek_and_pass",
            playerId: "p3",
            targetId: "p1",
            newClaim: "cockroach",
        });

        expect(result.type).toBe("error");
        if (result.type === "error") {
            expect(result.message).toContain("last player");
        }
    });

    it("rejects passing to yourself", () => {
        const state = initGame(testPlayers, noShuffle);

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        const result = processAction(state, {
            type: "peek_and_pass",
            playerId: "p2",
            targetId: "p2",
            newClaim: "fly",
        });

        expect(result.type).toBe("error");
    });
});

describe("multi-step offer chain", () => {
    it("supports passing through multiple players before resolution", () => {
        const state = initGame(testPlayers, noShuffle);
        const actualCard = state.players[0].hand[0];

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "cockroach",
        });

        processAction(state, {
            type: "peek_and_pass",
            playerId: "p2",
            targetId: "p3",
            newClaim: "bat",
        });

        processAction(state, {
            type: "peek_and_pass",
            playerId: "p3",
            targetId: "p4",
            newClaim: "fly",
        });

        expect(state.offerChain!.seenByPlayerIds).toEqual([
            "p1",
            "p2",
            "p3",
        ]);
        expect(state.activePlayerId).toBe("p4");

        const result = processAction(state, {
            type: "call_true",
            playerId: "p4",
        });

        expect(result.type).toBe("call_resolved");
        if (result.type === "call_resolved") {
            expect(result.actualCard).toBe(actualCard);
        }
    });
});

describe("four of a kind loss", () => {
    it("triggers game over when player gets 4 face-up of same type", () => {
        const state = initGame(testPlayers, noShuffle);

        const p2 = state.players.find((p) => p.id === "p2")!;
        p2.faceUpCards = ["bat", "bat", "bat"];

        const batIdx = state.players[0].hand.indexOf("bat");
        expect(batIdx).toBeGreaterThanOrEqual(0);

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: batIdx,
            claim: "cockroach",
        });

        const result = processAction(state, {
            type: "call_false",
            playerId: "p2",
        });

        if (state.offerChain?.cardValue === "bat") {
            expect(result.type).toBe("game_over");
            if (result.type === "game_over") {
                expect(result.loserId).toBe("p2");
                expect(result.reason).toBe("four_of_a_kind");
            }
            expect(state.phase).toBe("game_over");
        }
    });
});

describe("empty hand loss", () => {
    it("triggers game over when player has no cards on their turn to offer", () => {
        const state = initGame(testPlayers, noShuffle);

        const p1 = state.players.find((p) => p.id === "p1")!;
        const lastCard = p1.hand[0];
        p1.hand = [lastCard];

        const differentClaim =
            CREATURE_TYPES.find((c) => c !== lastCard) ?? "bat";

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: differentClaim,
        });

        expect(p1.hand).toHaveLength(0);

        const result = processAction(state, {
            type: "call_false",
            playerId: "p2",
        });

        if (result.type === "call_resolved" && result.cardTakerId === "p1") {
            expect(state.phase).toBe("game_over");
            expect(state.loserId).toBe("p1");
            expect(state.loseReason).toBe("empty_hand");
        }
    });
});

describe("game_over state", () => {
    it("rejects all actions when game is over", () => {
        const state = initGame(testPlayers, noShuffle);
        state.phase = "game_over";

        const result = processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        expect(result.type).toBe("error");
    });
});

describe("removePlayer", () => {
    it("removes player from game", () => {
        const state = initGame(testPlayers, noShuffle);
        removePlayer(state, "p4");
        expect(state.players).toHaveLength(3);
    });

    it("ends game when fewer than 3 players remain", () => {
        const players = testPlayers.slice(0, 3);
        const state = initGame(players, noShuffle);
        removePlayer(state, "p3");
        expect(state.phase).toBe("game_over");
    });

    it("resets offer chain when involved player leaves", () => {
        const state = initGame(testPlayers, noShuffle);

        processAction(state, {
            type: "offer_card",
            playerId: "p1",
            targetId: "p2",
            cardIndex: 0,
            claim: "bat",
        });

        removePlayer(state, "p2");
        expect(state.offerChain).toBeNull();
        expect(state.phase).toBe("offering");
    });

    it("advances active player when active player leaves", () => {
        const state = initGame(testPlayers, noShuffle);
        removePlayer(state, "p1");
        expect(state.activePlayerId).toBe("p2");
    });
});

describe("endGameByHost", () => {
    it("forces game to end", () => {
        const state = initGame(testPlayers, noShuffle);
        const result = endGameByHost(state);
        expect(state.phase).toBe("game_over");
        expect(result.type).toBe("game_over");
    });
});
