import z from "zod";

export const goFishClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("go_fish:ask"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            targetId: z.string(),
            rank: z.number().min(1).max(13),
        }),
    }),
    z.object({
        type: z.literal("go_fish:draw"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type GoFishClientMessage = z.output<typeof goFishClientMessageSchema>;

export const goFishServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("go_fish:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("go_fish:ask_result"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("go_fish:draw_result"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("go_fish:book_made"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("go_fish:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type GoFishServerMessage = z.output<typeof goFishServerMessageSchema>;
