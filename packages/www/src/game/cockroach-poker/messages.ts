import z from "zod";

const creatureTypeSchema = z.enum([
    "bat",
    "fly",
    "cockroach",
    "toad",
    "rat",
    "scorpion",
    "spider",
    "stink_bug",
]);

export const cockroachPokerClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("cockroach_poker:offer_card"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            targetId: z.string(),
            cardIndex: z.number().int().min(0),
            claim: creatureTypeSchema,
        }),
    }),
    z.object({
        type: z.literal("cockroach_poker:call_true"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("cockroach_poker:call_false"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("cockroach_poker:peek_and_pass"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            targetId: z.string(),
            newClaim: creatureTypeSchema,
        }),
    }),
]);

export type CockroachPokerClientMessage = z.output<
    typeof cockroachPokerClientMessageSchema
>;

export const cockroachPokerServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("cockroach_poker:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("cockroach_poker:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("cockroach_poker:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type CockroachPokerServerMessage = z.output<
    typeof cockroachPokerServerMessageSchema
>;
