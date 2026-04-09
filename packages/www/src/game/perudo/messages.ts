import z from "zod";

const faceValueSchema = z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
]);

export const perudoClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("perudo:bid"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            quantity: z.number().min(1),
            faceValue: faceValueSchema,
        }),
    }),
    z.object({
        type: z.literal("perudo:challenge"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("perudo:start_round"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type PerudoClientMessage = z.output<typeof perudoClientMessageSchema>;

export const perudoServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("perudo:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("perudo:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("perudo:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("perudo:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type PerudoServerMessage = z.output<typeof perudoServerMessageSchema>;
