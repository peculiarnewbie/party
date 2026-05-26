import type { FaceValue } from "./schemas";

export type {
    FaceValue,
    PerudoPlayer,
    Bid,
    ChallengeResult,
    PerudoPhase,
    PerudoState,
    PerudoResult,
} from "./schemas";

export type PerudoAction =
    | { type: "bid"; playerId: string; quantity: number; faceValue: FaceValue }
    | { type: "challenge"; playerId: string };
