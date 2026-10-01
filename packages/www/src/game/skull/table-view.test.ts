import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { initGame } from "./engine";
import { getSkullTableView, skullTableViewSchema } from "./table-view";
import { skullStateSchema } from "./schemas";
import { skullServer } from "./server";

const players = Array.from({ length: 6 }, (_, index) => ({
    id: `p${index}`,
    name: `Player ${index}`,
}));

describe("Skull public table", () => {
    it("shows counts and revealed discs while keeping every hand and unrevealed mat private", () => {
        const state = initGame(players, () => "p0");
        state.players[0].mat = ["skull", "flower"];
        state.players[1].mat = ["skull"];
        state.phase = "attempt";
        state.attempt = {
            challengerId: "p0",
            target: 3,
            revealedCount: 1,
            autoRevealDone: true,
            revealedSteps: [{ ownerId: "p0", disc: "flower", automatic: true }],
        };
        const view = getSkullTableView(state);
        expect(Schema.decodeUnknownSync(skullTableViewSchema)(view)).toEqual(
            view,
        );
        expect(view.players[0]).toMatchObject({
            faceDownCount: 1,
            revealedDiscs: ["flower"],
        });
        expect(view.players[1]).toMatchObject({
            faceDownCount: 1,
            revealedDiscs: [],
        });
        const wire = JSON.stringify(view);
        for (const key of [
            '"myHand"',
            '"myMat"',
            '"hand"',
            '"mat"',
            '"skull"',
            '"selectableFlipOwnerIds"',
        ])
            expect(wire).not.toContain(key);
        state.attempt.revealedSteps[0].disc = "skull";
        expect(view.attempt?.revealedSteps[0].disc).toBe("flower");
    });

    it("retains the public result through persisted snapshots and reconnects, accepting older snapshots", () => {
        const state = initGame(players, () => "p0");
        expect(
            Schema.decodeUnknownSync(skullStateSchema)(state).lastPublicResult,
        ).toBeUndefined();
        state.lastPublicResult = {
            type: "attempt_succeeded",
            challengerId: "p0",
            successfulChallenges: 1,
            target: 2,
        };
        const restored = Schema.decodeUnknownSync(skullStateSchema)(
            JSON.parse(JSON.stringify(state)),
        );
        const messages: string[] = [];
        skullServer({ current: restored }).sendStateToPlayer(
            "p0",
            (_, message) => messages.push(message),
        );
        expect(JSON.parse(messages[0]).data.lastPublicResult).toEqual(
            state.lastPublicResult,
        );
        expect(getSkullTableView(restored).lastPublicResult).toEqual(
            state.lastPublicResult,
        );
    });
});
