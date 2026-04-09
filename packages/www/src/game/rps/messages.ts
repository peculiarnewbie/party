import z from "zod";

export const rpsClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("rps:throw"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            choice: z.enum(["rock", "paper", "scissors"]),
        }),
    }),
    z.object({
        type: z.literal("rps:next_round"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("rps:set_best_of"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            bestOf: z.union([z.literal(1), z.literal(3), z.literal(5)]),
        }),
    }),
]);

export type RpsClientMessage = z.output<typeof rpsClientMessageSchema>;

export const rpsServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("rps:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("rps:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("rps:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("rps:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type RpsServerMessage = z.output<typeof rpsServerMessageSchema>;
