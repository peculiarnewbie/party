import { describe, expect, it } from "vitest";
import { Schema } from "effect";
import {
    advance,
    bullheads,
    chooseRow,
    destination,
    finishGame,
    initGame,
    lockCard,
    nextRound,
    removePlayer,
    rowPenalty,
    shuffledDeck,
} from "./engine";
import { getPlayerView, getTableView } from "./views";
import { sixNimmtClientMessageSchema, sixNimmtStateSchema } from "./schemas";
import type { SixNimmtState } from "./schemas";

const players = [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
    { id: "c", name: "Cara" },
];
const deck = Array.from({ length: 104 }, (_, i) => i + 1);
function resolving(cards: number[], rows: number[][]): SixNimmtState {
    const state = initGame(players, deck);
    const plays = cards.map((card, i) => ({
        playerId: players[i]!.id,
        name: players[i]!.name,
        card,
    }));
    return {
        ...state,
        stage: { type: "resolving" },
        queue: plays,
        revealed: plays,
        rows,
    };
}
describe("6 nimmt", () => {
    it.each([
        [1, 1],
        [5, 2],
        [10, 3],
        [11, 5],
        [55, 7],
        [100, 3],
        [104, 1],
    ])("scores card %i as %i", (card, points) =>
        expect(bullheads(card)).toBe(points),
    );
    it("deals ten unique sorted cards per player and four starters at maximum capacity", () => {
        const state = initGame(
            Array.from({ length: 10 }, (_, i) => ({
                id: `${i}`,
                name: `P${i}`,
            })),
        );
        const cards = [
            ...state.rows.flat(),
            ...state.players.flatMap((p) => p.hand),
        ];
        expect(new Set(cards).size).toBe(104);
        expect(
            state.players.every(
                (p) =>
                    p.hand.length === 10 &&
                    p.hand.every((c, i) => i === 0 || c > p.hand[i - 1]!),
            ),
        ).toBe(true);
        expect(() => initGame([players[0]!])).toThrow();
        expect(() => initGame([players[0]!, players[0]!])).toThrow();
    });
    it("keeps selections secret until everyone locks, and reveals in card order", () => {
        const initial = initGame(players, deck);
        const state = lockCard(initial, "b", 15).state!;
        expect(initial.players[1]!.selected).toBeNull();
        expect(getPlayerView(state, "b").selected).toBe(15);
        expect(getPlayerView(state, "a").selected).toBeNull();
        expect(getTableView(state).revealed).toEqual([]);
        expect(getTableView(state).players[1]).toEqual(
            expect.objectContaining({ ready: true }),
        );
        expect(getTableView(state).players[1]).not.toHaveProperty("hand");
        expect(getTableView(state).players[1]).not.toHaveProperty("selected");
        expect(getPlayerView(state, "stranger").myHand).toEqual([]);
        expect(lockCard(state, "b", 16).error).toBeDefined();
        expect(lockCard(state, "a", 15).error).toBeDefined();
        const ready = lockCard(lockCard(state, "c", 25).state!, "a", 5).state!;
        expect(ready.revealed.map((p) => p.card)).toEqual([5, 15, 25]);
        expect(
            ready.players.every(
                (p) => p.hand.length === 9 && p.selected === null,
            ),
        ).toBe(true);
        expect(lockCard(ready, "a", 6).error).toBeDefined();
    });
    it("places against the nearest lower row, taking five on the sixth card", () => {
        const rows = [[1, 5, 10, 11, 55], [60], [80], [95]];
        expect(destination(rows, 59)).toBe(0);
        expect(destination(rows, 90)).toBe(2);
        expect(destination(rows, 1)).toBeNull();
        const state = advance(resolving([59, 61], rows));
        expect(state.rows[0]).toEqual([59]);
        expect(state.players[0]!.score).toBe(18);
        expect(state.placements[0]!.taken).toEqual(rows[0]);
        const second = advance(state);
        expect(second.rows[1]).toEqual([60, 61]);
        expect(second.players[1]!.score).toBe(0);
    });
    it("pauses below all rows and lets only that player choose, then resumes the queue", () => {
        const state = advance(resolving([3, 35], [[10], [20], [30], [40]]));
        expect(state.stage).toEqual({
            type: "choosing",
            playerId: "a",
            card: 3,
        });
        expect(chooseRow(state, "b", 0).error).toBeDefined();
        expect(chooseRow(state, "a", 4).error).toBeDefined();
        const taken = chooseRow(state, "a", 2).state!;
        expect(taken.rows[2]).toEqual([3]);
        expect(taken.players[0]!.score).toBe(3);
        expect(advance(taken).rows[1]).toEqual([20, 35]);
    });
    it("ends only after ten turns, preserves totals between hands, and handles ties", () => {
        const state = initGame(players, deck);
        const complete: SixNimmtState = {
            ...state,
            turn: 10,
            stage: { type: "resolving" },
            players: state.players.map((p) => ({
                ...p,
                hand: [],
                score: 15,
                roundScore: 15,
            })),
        };
        const ended = advance(complete);
        expect(ended.stage.type).toBe("round_over");
        const next = nextRound(ended, deck).state!;
        expect(next.round).toBe(2);
        expect(next.players[0]).toEqual(
            expect.objectContaining({ score: 15, roundScore: 0 }),
        );
        expect(next.players[0]!.hand).toHaveLength(10);
        const high: SixNimmtState = {
            ...complete,
            players: complete.players.map((p, i) => ({
                ...p,
                score: i === 0 ? 66 : 15,
            })),
        };
        expect(advance({ ...high, turn: 9 }).stage.type).toBe("selecting");
        expect(advance(high).winners).toEqual(["b", "c"]);
        expect(nextRound(advance(high)).error).toBeDefined();
    });
    it("continues when a waiting or choosing player leaves and ends with one survivor", () => {
        let state = initGame(players, deck);
        state = lockCard(state, "a", 5).state!;
        state = lockCard(state, "b", 15).state!;
        expect(removePlayer(state, "c").stage.type).toBe("resolving");
        const choosing = advance(resolving([1, 22], [[10], [20], [30], [40]]));
        const removed = removePlayer(choosing, "a");
        expect(removed.stage.type).toBe("resolving");
        expect(advance(removed).rows[1]).toEqual([20, 22]);
        const last = removePlayer(removed, "b");
        expect(last.stage.type).toBe("game_over");
        expect(last.winners).toEqual(["c"]);
        expect(finishGame(initGame(players, deck)).winners).toEqual([
            "a",
            "b",
            "c",
        ]);
    });
    it("validates card and row bounds at the wire boundary", () => {
        const decode = Schema.decodeUnknownSync(sixNimmtClientMessageSchema);
        for (const card of [0, 105, 1.5, "1"])
            expect(() =>
                decode({
                    type: "six_nimmt:lock",
                    playerId: "a",
                    playerName: "Alice",
                    data: { round: 1, turn: 1, card },
                }),
            ).toThrow();
        expect(() =>
            decode({
                type: "six_nimmt:choose_row",
                playerId: "a",
                playerName: "Alice",
                data: { round: 1, turn: 1, row: 4 },
            }),
        ).toThrow();
    });
    it("plays complete matches for 2–10 players with conserved penalties and restartable state", () => {
        let seed = 91827;
        const random = () => {
            seed = (seed * 1664525 + 1013904223) >>> 0;
            return seed / 4294967296;
        };
        for (const count of [2, 3, 6, 10]) {
            let state = initGame(
                Array.from({ length: count }, (_, i) => ({
                    id: `${i}`,
                    name: `P${i}`,
                })),
                shuffledDeck(random),
            );
            for (
                let step = 0;
                step < 3000 && state.stage.type !== "game_over";
                step++
            ) {
                if (state.stage.type === "selecting") {
                    for (const p of state.players)
                        state = lockCard(
                            state,
                            p.id,
                            p.hand[Math.floor(random() * p.hand.length)]!,
                        ).state!;
                } else if (state.stage.type === "choosing") {
                    state = chooseRow(
                        state,
                        state.stage.playerId,
                        Math.floor(random() * 4),
                    ).state!;
                } else if (state.stage.type === "round_over")
                    state = nextRound(state, shuffledDeck(random)).state!;
                else state = advance(state);
                state = Schema.decodeUnknownSync(sixNimmtStateSchema)(
                    JSON.parse(JSON.stringify(state)),
                );
                expect(
                    state.rows.every(
                        (row) =>
                            row.length >= 1 &&
                            row.length <= 5 &&
                            row.every(
                                (card, i) => i === 0 || card > row[i - 1]!,
                            ),
                    ),
                ).toBe(true);
                expect(
                    state.players.every((p) => p.score >= p.roundScore),
                ).toBe(true);
                const visibleAndHeld = [
                    ...state.rows.flat(),
                    ...state.players.flatMap((p) => p.hand),
                    ...state.queue.map((p) => p.card),
                ];
                expect(new Set(visibleAndHeld).size).toBe(
                    visibleAndHeld.length,
                );
                expect(
                    state.placements.reduce((sum, p) => sum + p.penalty, 0),
                ).toBe(
                    state.placements.reduce(
                        (sum, p) => sum + rowPenalty(p.taken),
                        0,
                    ),
                );
            }
            expect(state.stage.type).toBe("game_over");
            expect(state.winners.length).toBeGreaterThan(0);
        }
    });
});
