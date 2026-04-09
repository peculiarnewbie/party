import { describe, expect, it } from "bun:test";
import { getPlayerView } from "./views";
import { makePlayer, makeState } from "./test-helpers";

describe("Yahtzee views", () => {
    it("returns roll-enabled pre-roll state for the active player", () => {
        const view = getPlayerView(
            makeState({
                round: 3,
                currentPlayerIndex: 0,
                phase: "pre_roll",
                rollsLeft: 3,
            }),
            "p1",
        );

        expect(view.isMyTurn).toBe(true);
        expect(view.canRoll).toBe(true);
        expect(view.canScore).toBe(false);
        expect(view.canClaim).toBe(false);
        expect(view.dice).toEqual([0, 0, 0, 0, 0]);
    });

    it("computes standard-mode potential scores and tied suggested categories", () => {
        const view = getPlayerView(
            makeState({
                currentPlayerIndex: 0,
                phase: "mid_turn",
                rollsLeft: 1,
                dice: [5, 5, 5, 5, 6],
                players: [
                    makePlayer({
                        id: "p1",
                        name: "Alice",
                        scorecard: {
                            ones: 3,
                            twos: 6,
                        },
                    }),
                    makePlayer({
                        id: "p2",
                        name: "Bob",
                        scorecard: {},
                    }),
                ],
            }),
            "p1",
        );

        expect(view.canRoll).toBe(true);
        expect(view.canScore).toBe(true);
        expect(view.potentialScores?.fives).toBe(20);
        expect(view.potentialScores?.three_of_a_kind).toBe(26);
        expect(view.potentialScores?.four_of_a_kind).toBe(26);
        expect(view.potentialScores?.chance).toBe(26);
        expect(view.suggestedCategories).toEqual([
            "three_of_a_kind",
            "four_of_a_kind",
            "chance",
        ]);
    });

    it("locks all interaction flags for non-active standard players", () => {
        const view = getPlayerView(
            makeState({
                currentPlayerIndex: 1,
                phase: "mid_turn",
                dice: [2, 3, 4, 5, 6],
                held: [false, true, false, true, false],
            }),
            "p1",
        );

        expect(view.isMyTurn).toBe(false);
        expect(view.canRoll).toBe(false);
        expect(view.canScore).toBe(false);
        expect(view.canClaim).toBe(false);
        expect(view.canAcceptClaim).toBe(false);
        expect(view.canChallengeClaim).toBe(false);
        expect(view.potentialScores).toBeNull();
    });

    it("enables claim controls only for the active player in lying mode", () => {
        const activeView = getPlayerView(
            makeState({
                mode: "lying",
                currentPlayerIndex: 0,
                phase: "mid_turn",
                rollsLeft: 1,
                dice: [6, 6, 6, 2, 1],
            }),
            "p1",
        );
        const opponentView = getPlayerView(
            makeState({
                mode: "lying",
                currentPlayerIndex: 0,
                phase: "mid_turn",
                rollsLeft: 1,
                dice: [6, 6, 6, 2, 1],
            }),
            "p2",
        );

        expect(activeView.canClaim).toBe(true);
        expect(activeView.canAcceptClaim).toBe(false);
        expect(activeView.canChallengeClaim).toBe(false);
        expect(opponentView.dice).toEqual([0, 0, 0, 0, 0]);
        expect(opponentView.canClaim).toBe(false);
    });

    it("shows pending claim controls to the responder in lying mode", () => {
        const state = makeState({
            mode: "lying",
            currentPlayerIndex: 0,
            phase: "awaiting_response",
            dice: [2, 2, 2, 5, 5],
            pendingClaim: {
                playerId: "p1",
                category: "full_house",
                claimedDice: [2, 2, 5, 5, 5],
                claimedPoints: 25,
            },
        });

        const view = getPlayerView(state, "p2");

        expect(view.dice).toEqual([0, 0, 0, 0, 0]);
        expect(view.pendingClaim).toEqual({
            playerId: "p1",
            category: "full_house",
            claimedDice: [2, 2, 5, 5, 5],
            claimedPoints: 25,
        });
        expect(view.canAcceptClaim).toBe(true);
        expect(view.canChallengeClaim).toBe(true);
        expect(view.canClaim).toBe(false);
    });

    it("preserves last turn reveal details for the next player", () => {
        const view = getPlayerView(
            makeState({
                mode: "lying",
                currentPlayerIndex: 1,
                phase: "pre_roll",
                lastTurnReveal: {
                    playerId: "p1",
                    category: "full_house",
                    actualDice: [2, 2, 2, 5, 5],
                    claimedDice: [2, 2, 5, 5, 5],
                    claimedPoints: 25,
                    outcome: "caught_lying",
                    penaltyPlayerId: "p1",
                    penaltyPoints: 25,
                },
            }),
            "p2",
        );

        expect(view.lastTurnReveal).toEqual({
            playerId: "p1",
            category: "full_house",
            actualDice: [2, 2, 2, 5, 5],
            claimedDice: [2, 2, 5, 5, 5],
            claimedPoints: 25,
            outcome: "caught_lying",
            penaltyPlayerId: "p1",
            penaltyPoints: 25,
        });
        expect(view.canRoll).toBe(true);
    });

    it("exposes winners and disables actions after game over", () => {
        const view = getPlayerView(
            makeState({
                phase: "game_over",
                winners: ["p1"],
                players: [
                    makePlayer({
                        id: "p1",
                        name: "Alice",
                        scorecard: { chance: 24 },
                    }),
                    makePlayer({
                        id: "p2",
                        name: "Bob",
                        scorecard: { chance: 12 },
                    }),
                ],
            }),
            "p1",
        );

        expect(view.winners).toEqual(["p1"]);
        expect(view.canRoll).toBe(false);
        expect(view.canScore).toBe(false);
        expect(view.canClaim).toBe(false);
        expect(view.canAcceptClaim).toBe(false);
        expect(view.canChallengeClaim).toBe(false);
    });
});
