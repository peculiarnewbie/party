import type {
    DiscType,
    SkullAttemptState,
    SkullPhase,
    SkullPlayer,
    SkullResult,
    SkullRevealStep,
    SkullState,
} from "./schemas";

export type {
    DiscType,
    SkullAttemptState,
    SkullPhase,
    SkullPlayer,
    SkullResult,
    SkullRevealStep,
    SkullState,
};

export const SKULL_MIN_PLAYERS = 3;
export const SKULL_MAX_PLAYERS = 6;

export const SKULL_STARTING_HAND = [
    "flower",
    "flower",
    "flower",
    "skull",
] as const;

export type SkullAction =
    | { type: "play_disc"; playerId: string; disc: DiscType }
    | { type: "start_challenge"; playerId: string; bid: number }
    | { type: "raise_bid"; playerId: string; bid: number }
    | { type: "pass_bid"; playerId: string }
    | { type: "flip_disc"; playerId: string; ownerId: string }
    | { type: "discard_lost_disc"; playerId: string; discIndex: number }
    | { type: "choose_next_starter"; playerId: string; nextStarterId: string };

export type SkullEngineResult =
    | { type: "error"; message: string }
    | { type: "ok"; events: SkullResult[] };
