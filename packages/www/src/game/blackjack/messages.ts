import z from "zod";

export const blackjackClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("blackjack:bet"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            amount: z.number().min(1),
        }),
    }),
    z.object({
        type: z.literal("blackjack:hit"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("blackjack:stand"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("blackjack:double"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("blackjack:split"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("blackjack:insurance"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            accept: z.boolean(),
        }),
    }),
]);

export type BlackjackClientMessage = z.output<
    typeof blackjackClientMessageSchema
>;

export const blackjackServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("blackjack:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("blackjack:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("blackjack:settled"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("blackjack:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type BlackjackServerMessage = z.output<
    typeof blackjackServerMessageSchema
>;
