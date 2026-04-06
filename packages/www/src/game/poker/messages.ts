import z from "zod";

export const pokerClientMessageSchema = z.object({
    type: z.literal("poker:act"),
    playerId: z.string(),
    playerName: z.string(),
    data: z.discriminatedUnion("type", [
        z.object({
            type: z.literal("fold"),
        }),
        z.object({
            type: z.literal("check"),
        }),
        z.object({
            type: z.literal("call"),
        }),
        z.object({
            type: z.literal("bet"),
            amount: z.number().int().positive(),
        }),
        z.object({
            type: z.literal("raise"),
            amount: z.number().int().positive(),
        }),
        z.object({
            type: z.literal("all_in"),
        }),
    ]),
});

export type PokerClientMessage = z.output<typeof pokerClientMessageSchema>;

export const pokerServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("poker:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("poker:event"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("poker:action_result"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("poker:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type PokerServerMessage = z.output<typeof pokerServerMessageSchema>;
