import z from "zod";

export const cheeseThiefClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("cheese_thief:start_day"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("cheese_thief:start_voting"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("cheese_thief:cast_vote"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            targetId: z.string(),
        }),
    }),
    z.object({
        type: z.literal("cheese_thief:reveal_votes"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("cheese_thief:next_round"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type CheeseThiefClientMessage = z.output<
    typeof cheeseThiefClientMessageSchema
>;

export const cheeseThiefServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("cheese_thief:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("cheese_thief:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("cheese_thief:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type CheeseThiefServerMessage = z.output<
    typeof cheeseThiefServerMessageSchema
>;
