import { describe, expect, it } from "bun:test";
import { getPlayerView } from "./views";
import { initGame, processAction } from "./engine";
import type { DiscType, SkullEngineResult, SkullState } from "./types";

const PLAYERS: { id: string; name: string }[] = [
    { id: "p1", name: "Ada" },
    { id: "p2", name: "Bea" },
    { id: "p3", name: "Cy" },
];

function createState(starterId: string = "p1") {
    return initGame(PLAYERS, () => starterId);
}

function expectOk(result: SkullEngineResult) {
    expect(result.type).toBe("ok");
    if (result.type !== "ok") {
        throw new Error(result.message);
    }
    return result.events;
}

function play(state: SkullState, playerId: string, disc: DiscType) {
    return expectOk(processAction(state, { type: "play_disc", playerId, disc }));
}

function startChallenge(state: SkullState, playerId: string, bid: number) {
    return expectOk(
        processAction(state, { type: "start_challenge", playerId, bid }),
    );
}

function raiseBid(state: SkullState, playerId: string, bid: number) {
    return expectOk(processAction(state, { type: "raise_bid", playerId, bid }));
}

function passBid(state: SkullState, playerId: string) {
    return expectOk(processAction(state, { type: "pass_bid", playerId }));
}

function flipDisc(state: SkullState, playerId: string, ownerId: string) {
    return expectOk(
        processAction(state, { type: "flip_disc", playerId, ownerId }),
    );
}

function discardDisc(state: SkullState, playerId: string, discIndex: number) {
    return expectOk(
        processAction(state, {
            type: "discard_lost_disc",
            playerId,
            discIndex,
        }),
    );
}

function chooseStarter(
    state: SkullState,
    playerId: string,
    nextStarterId: string,
) {
    return expectOk(
        processAction(state, {
            type: "choose_next_starter",
            playerId,
            nextStarterId,
        }),
    );
}

function reachBuildingPhase(state: SkullState, openingDisc: DiscType = "flower") {
    play(state, "p1", openingDisc);
    play(state, "p2", openingDisc);
    play(state, "p3", openingDisc);
}

describe("skull engine", () => {
    it("uses the injected random first player", () => {
        const state = createState("p3");

        expect(state.starterPlayerId).toBe("p3");
        expect(state.currentPlayerId).toBe("p3");
    });

    it("advances opening placements into the building phase", () => {
        const state = createState("p1");

        play(state, "p1", "flower");
        expect(state.phase).toBe("turn_prep");
        expect(state.currentPlayerId).toBe("p2");

        play(state, "p2", "flower");
        const events = play(state, "p3", "flower");

        expect(state.phase).toBe("building");
        expect(state.currentPlayerId).toBe("p1");
        expect(state.playersWhoPlacedOpeningDisc).toEqual(["p1", "p2", "p3"]);
        expect(events[0]).toMatchObject({
            type: "disc_played",
            playerId: "p3",
        });
    });

    it("validates challenge bids against discs on the mats", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        const invalid = processAction(state, {
            type: "start_challenge",
            playerId: "p1",
            bid: 4,
        });

        expect(invalid).toEqual({
            type: "error",
            message: "Bid is out of range",
        });

        const events = startChallenge(state, "p1", 3);
        expect(state.phase).toBe("auction");
        expect(state.highestBid).toBe(3);
        expect(events[0]).toEqual({
            type: "challenge_started",
            playerId: "p1",
            bid: 3,
        });
    });

    it("runs the auction until one bidder remains", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        startChallenge(state, "p1", 1);
        raiseBid(state, "p2", 2);
        passBid(state, "p3");
        const events = passBid(state, "p1");

        expect(state.phase).toBe("attempt");
        expect(state.attempt?.challengerId).toBe("p2");
        expect(state.attempt?.target).toBe(2);
        expect(events.map((event) => event.type)).toEqual([
            "bid_passed",
            "attempt_started",
            "disc_revealed",
        ]);
    });

    it("allows direct max bids and goes straight to the attempt after passes", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        const challengeEvents = startChallenge(state, "p1", 3);
        expect(challengeEvents[0]).toMatchObject({
            type: "challenge_started",
            bid: 3,
        });

        passBid(state, "p2");
        const events = passBid(state, "p3");

        expect(state.phase).toBe("attempt");
        expect(state.attempt?.target).toBe(3);
        expect(events.some((event) => event.type === "attempt_started")).toBe(
            true,
        );
    });

    it("auto-reveals the challenger's own mat before opponent picks", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        play(state, "p1", "flower");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 3);
        passBid(state, "p2");
        passBid(state, "p3");

        expect(state.phase).toBe("attempt");
        expect(state.attempt?.autoRevealDone).toBe(true);
        expect(state.attempt?.revealedCount).toBe(2);
        expect(
            state.attempt?.revealedSteps.map((step) => ({
                ownerId: step.ownerId,
                disc: step.disc,
            })),
        ).toEqual([
            { ownerId: "p1", disc: "flower" },
            { ownerId: "p1", disc: "flower" },
        ]);
    });

    it("fails immediately when the challenger hits their own skull during auto reveal", () => {
        const state = createState("p1");

        play(state, "p1", "skull");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        play(state, "p1", "flower");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 3);
        passBid(state, "p2");
        const events = passBid(state, "p3");

        expect(state.phase).toBe("penalty");
        expect(state.penaltyPlayerId).toBe("p1");
        expect(state.pendingNextStarterChooserId).toBe("p1");
        expect(events.map((event) => event.type)).toEqual([
            "bid_passed",
            "attempt_started",
            "disc_revealed",
            "disc_revealed",
            "attempt_failed",
            "discard_required",
        ]);
    });

    it("can succeed entirely from the challenger's own mat", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        play(state, "p1", "flower");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 2);
        passBid(state, "p2");
        const events = passBid(state, "p3");

        expect(state.phase).toBe("turn_prep");
        expect(state.roundNumber).toBe(2);
        expect(state.starterPlayerId).toBe("p1");
        expect(state.players[0]?.successfulChallenges).toBe(1);
        expect(events.map((event) => event.type)).toEqual([
            "bid_passed",
            "attempt_started",
            "disc_revealed",
            "disc_revealed",
            "attempt_succeeded",
            "round_started",
        ]);
    });

    it("only reveals opponent top discs during the manual attempt", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        play(state, "p1", "flower");
        play(state, "p2", "skull");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 3);
        passBid(state, "p2");
        passBid(state, "p3");
        const events = flipDisc(state, "p1", "p2");

        expect(state.phase).toBe("penalty");
        expect(state.penaltyPlayerId).toBe("p2");
        expect(events).toContainEqual({
            type: "disc_revealed",
            ownerId: "p2",
            disc: "skull",
            revealedCount: 3,
            target: 3,
            automatic: false,
        });
    });

    it("keeps discard identity private while exposing updated hand counts", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        play(state, "p1", "flower");
        play(state, "p2", "skull");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 3);
        passBid(state, "p2");
        passBid(state, "p3");
        flipDisc(state, "p1", "p2");

        const challengerView = getPlayerView(state, "p1");
        const penalizedView = getPlayerView(state, "p2");

        expect(challengerView.penaltyPlayerId).toBe("p2");
        expect(challengerView.players.find((player) => player.id === "p2")?.handCount).toBe(4);
        expect(challengerView.myHand).toHaveLength(4);
        expect("myHand" in challengerView.players[1]!).toBe(false);
        expect(penalizedView.myHand).toEqual(["flower", "flower", "flower", "skull"]);
        expect(penalizedView.needsDiscardChoice).toBe(true);

        discardDisc(state, "p2", 1);
        const updatedView = getPlayerView(state, "p1");
        expect(updatedView.players.find((player) => player.id === "p2")?.handCount).toBe(3);
    });

    it("starts the next round from the skull owner after another player fails", () => {
        const state = createState("p1");
        reachBuildingPhase(state);

        play(state, "p1", "flower");
        play(state, "p2", "skull");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 3);
        passBid(state, "p2");
        passBid(state, "p3");
        flipDisc(state, "p1", "p2");
        const events = discardDisc(state, "p2", 1);

        expect(state.phase).toBe("turn_prep");
        expect(state.starterPlayerId).toBe("p2");
        expect(state.currentPlayerId).toBe("p2");
        expect(events.map((event) => event.type)).toEqual([
            "disc_lost",
            "round_started",
        ]);
    });

    it("requires the challenger to choose the next starter after flipping their own skull", () => {
        const state = createState("p1");

        play(state, "p1", "skull");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        play(state, "p1", "flower");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 3);
        passBid(state, "p2");
        passBid(state, "p3");
        const discardEvents = discardDisc(state, "p1", 0);

        expect(state.phase).toBe("next_starter");
        expect(state.pendingNextStarterChooserId).toBe("p1");
        expect(discardEvents.map((event) => event.type)).toEqual([
            "disc_lost",
            "next_starter_required",
        ]);

        const chooseEvents = chooseStarter(state, "p1", "p3");
        expect(state.phase).toBe("turn_prep");
        expect(state.starterPlayerId).toBe("p3");
        expect(chooseEvents.map((event) => event.type)).toEqual([
            "next_starter_chosen",
            "round_started",
        ]);
    });

    it("ends the game when the last remaining active player survives the penalty", () => {
        const state = createState("p1");
        state.players[1]!.hand = ["skull"];
        state.players[1]!.mat = [];
        state.players[2]!.hand = [];
        state.players[2]!.mat = [];
        state.players[2]!.eliminated = true;
        state.phase = "penalty";
        state.penaltyPlayerId = "p2";
        state.pendingNextStarterChooserId = null;

        const events = discardDisc(state, "p2", 0);

        expect(state.phase as SkullState["phase"]).toBe("game_over");
        expect(state.winnerId).toBe("p1");
        expect(events.map((event) => event.type)).toEqual([
            "disc_lost",
            "game_over",
        ]);
    });

    it("wins immediately on a second successful challenge", () => {
        const state = createState("p1");
        state.players[0]!.successfulChallenges = 1;
        reachBuildingPhase(state);

        play(state, "p1", "flower");
        play(state, "p2", "flower");
        play(state, "p3", "flower");
        startChallenge(state, "p1", 2);
        passBid(state, "p2");
        const events = passBid(state, "p3");

        expect(state.phase).toBe("game_over");
        expect(state.winnerId).toBe("p1");
        expect(events.map((event) => event.type)).toEqual([
            "bid_passed",
            "attempt_started",
            "disc_revealed",
            "disc_revealed",
            "attempt_succeeded",
            "game_over",
        ]);
    });
});
