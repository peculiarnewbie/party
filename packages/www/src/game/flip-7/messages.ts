import z from "zod";

export const flip7ClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("flip_7:hit"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("flip_7:stay"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("flip_7:choose_target"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            targetId: z.string(),
        }),
    }),
    z.object({
        type: z.literal("flip_7:next_round"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type Flip7ClientMessage = z.output<typeof flip7ClientMessageSchema>;

export const flip7ServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("flip_7:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("flip_7:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("flip_7:error"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("flip_7:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type Flip7ServerMessage = z.output<typeof flip7ServerMessageSchema>;
