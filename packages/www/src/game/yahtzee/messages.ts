import z from "zod";
import { SCORING_CATEGORIES } from "./types";

const diceSchema = z.tuple([
    z.number().min(1).max(6),
    z.number().min(1).max(6),
    z.number().min(1).max(6),
    z.number().min(1).max(6),
    z.number().min(1).max(6),
]);

export const yahtzeeClientMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("yahtzee:roll"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("yahtzee:toggle_hold"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            diceIndex: z.number().min(0).max(4),
        }),
    }),
    z.object({
        type: z.literal("yahtzee:score"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            category: z.enum(SCORING_CATEGORIES as [string, ...string[]]),
        }),
    }),
    z.object({
        type: z.literal("yahtzee:claim"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({
            category: z.enum(SCORING_CATEGORIES as [string, ...string[]]),
            claimedDice: diceSchema,
        }),
    }),
    z.object({
        type: z.literal("yahtzee:accept_claim"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
    z.object({
        type: z.literal("yahtzee:challenge_claim"),
        playerId: z.string(),
        playerName: z.string(),
        data: z.object({}),
    }),
]);

export type YahtzeeClientMessage = z.output<typeof yahtzeeClientMessageSchema>;

export const yahtzeeServerMessageSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("yahtzee:state"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("yahtzee:action"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("yahtzee:game_over"),
        data: z.record(z.string(), z.unknown()),
    }),
    z.object({
        type: z.literal("yahtzee:error"),
        data: z.record(z.string(), z.unknown()),
    }),
]);

export type YahtzeeServerMessage = z.output<typeof yahtzeeServerMessageSchema>;
