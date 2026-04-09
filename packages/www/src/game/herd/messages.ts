import z from "zod";

export const herdClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("herd:toggle_pink_cow"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            enabled: z.boolean(),
        }),
    }),
    z.object({
        type: z.literal("herd:next_question"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            customQuestion: z.string().optional(),
        }),
    }),
    z.object({
        type: z.literal("herd:submit_answer"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            answer: z.string().min(1).max(200),
        }),
    }),
    z.object({
        type: z.literal("herd:close_answers"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("herd:merge_groups"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            groupId1: z.string(),
            groupId2: z.string(),
        }),
    }),
    z.object({
        type: z.literal("herd:confirm_scoring"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("herd:next_round"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type HerdClientMessage = z.output<typeof herdClientMessageSchema>;

export const herdServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("herd:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("herd:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("herd:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("herd:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type HerdServerMessage = z.output<typeof herdServerMessageSchema>;
