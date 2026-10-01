import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import { initGame } from "./engine";
import { getSpicyTableView, spicyTableViewSchema } from "./table-view";
import { spicyStateSchema } from "./schemas";
import { spicyServer } from "./server";

const players = Array.from({ length: 6 }, (_, index) => ({
    id: `p${index}`,
    name: `Player ${index}`,
}));

describe("Spicy public table", () => {
    it("shows the claim without exposing hands, actual stack cards, or the draw pile", () => {
        const state = initGame(players);
        state.stack = [
            {
                playerId: "p0",
                card: {
                    id: "private-card",
                    kind: "standard",
                    number: 10,
                    spice: "wasabi",
                },
                declaredNumber: 1,
                declaredSpice: "chili",
            },
        ];
        const view = getSpicyTableView(state);
        expect(Schema.decodeUnknownSync(spicyTableViewSchema)(view)).toEqual(
            view,
        );
        expect(view.stackTop).toEqual({
            ownerId: "p0",
            declaredNumber: 1,
            declaredSpice: "chili",
            stackSize: 1,
        });
        const wire = JSON.stringify(view);
        for (const key of [
            '"myHand"',
            '"hand"',
            '"stack"',
            '"drawPile"',
            '"actualCard"',
            "private-card",
            "wasabi",
        ])
            expect(wire).not.toContain(key);
        view.players[0].handCount = 999;
        expect(state.players[0].hand.length).toBe(6);
    });

    it("publishes a challenge reveal and restores it on both the display and player's reconnect", () => {
        const state = initGame(players, { worldEndIndex: 100 });
        expect(
            Schema.decodeUnknownSync(spicyStateSchema)(state).lastPublicResult,
        ).toBeUndefined();
        const actualCard = {
            id: "revealed",
            kind: "standard" as const,
            number: 10,
            spice: "wasabi" as const,
        };
        state.stack = [
            {
                playerId: "p0",
                card: actualCard,
                declaredNumber: 1,
                declaredSpice: "chili",
            },
        ];
        const server = spicyServer({ current: state });
        server.processMessage(
            {
                type: "spicy:challenge",
                playerId: "p1",
                playerName: "Player 1",
                data: { trait: "number" },
            },
            () => {},
            () => {},
        );
        expect(getSpicyTableView(state).lastPublicResult).toMatchObject({
            type: "challenge_resolved",
            actualCard,
        });
        const restored = Schema.decodeUnknownSync(spicyStateSchema)(
            JSON.parse(JSON.stringify(state)),
        );
        const messages: string[] = [];
        spicyServer({ current: restored }).sendStateToPlayer(
            "p1",
            (_, message) => messages.push(message),
        );
        expect(JSON.parse(messages[0]).data.lastPublicResult).toEqual(
            state.lastPublicResult,
        );
        expect(getSpicyTableView(restored).lastPublicResult).toEqual(
            state.lastPublicResult,
        );
        const snapshot = getSpicyTableView(restored);
        if (
            snapshot.lastPublicResult?.type === "challenge_resolved" &&
            snapshot.lastPublicResult.actualCard.kind === "standard"
        )
            snapshot.lastPublicResult.actualCard.number = 9;
        expect(restored.lastPublicResult).toMatchObject({
            actualCard: { number: 10 },
        });
    });
});
