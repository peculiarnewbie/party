import { describe, expect, it } from "vitest";
import { Effect, Schema } from "effect";
import { sixNimmtRegistration } from "./adapter";
import { initGame } from "./engine";
import { sixNimmtServerMessageSchema } from "./schemas";
import type { SixNimmtState } from "./schemas";

const players = [
    { id: "a", name: "Alice" },
    { id: "b", name: "Bob" },
];
describe("6 nimmt command authority", () => {
    it("rejects stale turns, duplicate locks, and cards outside the sender's hand", async () => {
        const ref = { current: initGame(players) };
        const adapter = sixNimmtRegistration.create("six_nimmt", ref);
        const messages: string[] = [];
        const sendTo = (_id: string, message: string) => messages.push(message);
        const send = (card: number, turn = 1) =>
            adapter.processMessage(
                {
                    type: "six_nimmt:lock",
                    playerId: "a",
                    playerName: "Forged",
                    data: { round: 1, turn, card },
                },
                () => {},
                sendTo,
            );
        const original = ref.current;
        send(original.players[0]!.hand[0]!, 2);
        expect(ref.current).toBe(original);
        send(original.players[1]!.hand[0]!);
        expect(ref.current).toBe(original);
        send(original.players[0]!.hand[0]!);
        const locked = ref.current;
        send(original.players[0]!.hand[1]!);
        expect(ref.current).toBe(locked);
        expect(ref.current.players[0]!.name).toBe("Alice");
        const parsed = messages.map((raw) =>
            Schema.decodeUnknownSync(sixNimmtServerMessageSchema)(
                JSON.parse(raw),
            ),
        );
        expect(parsed.filter((m) => m.type === "six_nimmt:error")).toHaveLength(
            3,
        );
        expect(
            await Effect.runPromise(
                adapter.decodeMessage({
                    type: "six_nimmt:lock",
                    playerId: "a",
                    playerName: "Alice",
                    data: { card: 105, round: 1, turn: 1 },
                }),
            ),
        ).toBeNull();
    });
    it("allows only the current host to deal the next hand", () => {
        const ref: { current: SixNimmtState } = {
            current: { ...initGame(players), stage: { type: "round_over" } },
        };
        const adapter = sixNimmtRegistration.create("six_nimmt", ref);
        adapter.setHost?.("a");
        const send = (playerId: string, round = 1) =>
            adapter.processMessage(
                {
                    type: "six_nimmt:next_round",
                    playerId,
                    playerName: playerId,
                    data: { round },
                },
                () => {},
                () => {},
            );
        const initial = ref.current;
        send("b");
        expect(ref.current).toBe(initial);
        adapter.setHost?.("b");
        send("a");
        expect(ref.current).toBe(initial);
        send("b");
        expect(ref.current.round).toBe(2);
        const dealt = ref.current;
        send("b");
        expect(ref.current).toBe(dealt);
    });
});
