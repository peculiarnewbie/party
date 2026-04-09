import z from "zod";

export const funFactsClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("fun_facts:next_question"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            customQuestion: z.string().optional(),
        }),
    }),
    z.object({
        type: z.literal("fun_facts:submit_answer"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            answer: z.number(),
        }),
    }),
    z.object({
        type: z.literal("fun_facts:close_answers"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("fun_facts:place_arrow"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            position: z.number().int().min(0),
        }),
    }),
    z.object({
        type: z.literal("fun_facts:next_round"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type FunFactsClientMessage = z.output<
    typeof funFactsClientMessageSchema
>;

export const funFactsServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("fun_facts:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("fun_facts:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("fun_facts:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("fun_facts:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type FunFactsServerMessage = z.output<
    typeof funFactsServerMessageSchema
>;
