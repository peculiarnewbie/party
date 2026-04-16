import z from "zod";
import { CHALLENGE_TRAITS, SPICE_TYPES } from "./types";

const spiceTypeSchema = z.enum(SPICE_TYPES);
const challengeTraitSchema = z.enum(CHALLENGE_TRAITS);

export const spicyClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("spicy:play_card"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            cardId: z.string(),
            declaredNumber: z.number().int().min(1).max(10),
            declaredSpice: spiceTypeSchema,
        }),
    }),
    z.object({
        type: z.literal("spicy:pass"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("spicy:challenge"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            trait: challengeTraitSchema,
        }),
    }),
    z.object({
        type: z.literal("spicy:confirm_last_card"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type SpicyClientMessage = z.output<typeof spicyClientMessageSchema>;

export const spicyServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("spicy:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("spicy:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("spicy:error"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("spicy:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type SpicyServerMessage = z.output<typeof spicyServerMessageSchema>;
