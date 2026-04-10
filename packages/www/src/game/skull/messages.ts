import z from "zod";

const discTypeSchema = z.union([z.literal("flower"), z.literal("skull")]);

export const skullClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("skull:play_disc"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            disc: discTypeSchema,
        }),
    }),
    z.object({
        type: z.literal("skull:start_challenge"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            bid: z.number().int().min(1),
        }),
    }),
    z.object({
        type: z.literal("skull:raise_bid"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            bid: z.number().int().min(1),
        }),
    }),
    z.object({
        type: z.literal("skull:pass_bid"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("skull:flip_disc"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            ownerId: z.string(),
        }),
    }),
    z.object({
        type: z.literal("skull:discard_lost_disc"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            discIndex: z.number().int().min(0),
        }),
    }),
    z.object({
        type: z.literal("skull:choose_next_starter"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            playerId: z.string(),
        }),
    }),
]);

export type SkullClientMessage = z.output<typeof skullClientMessageSchema>;

export const skullServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("skull:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("skull:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("skull:error"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("skull:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type SkullServerMessage = z.output<typeof skullServerMessageSchema>;
