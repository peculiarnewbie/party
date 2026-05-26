import type {
    ChallengeTrait,
    DrawContext,
    DrawPileCard,
    SpiceType,
    SpicyCard,
    SpicyEndReason,
    SpicyFinalScore,
    SpicyPhase,
    SpicyPlayer,
    SpicyResult,
    SpicyStackEntry,
    SpicyState,
    WorldsEndCard,
} from "./schemas";

export type {
    ChallengeTrait,
    DrawContext,
    DrawPileCard,
    SpiceType,
    SpicyCard,
    SpicyEndReason,
    SpicyFinalScore,
    SpicyPhase,
    SpicyPlayer,
    SpicyResult,
    SpicyStackEntry,
    SpicyState,
    WorldsEndCard,
};

export {
    CHALLENGE_TRAITS,
    SPICE_TYPES,
} from "./schemas";

export const SPICY_MIN_PLAYERS = 3;
export const SPICY_MAX_PLAYERS = 6;
export const SPICY_HAND_SIZE = 6;
export const SPICY_TROPHY_COUNT = 3;
export const SPICY_WILD_CARDS_PER_TYPE = 5;
export const SPICY_STANDARD_COPIES = 3;

export type SpicyAction =
    | {
          type: "play_card";
          playerId: string;
          cardId: string;
          declaredNumber: number;
          declaredSpice: SpiceType;
      }
    | {
          type: "pass";
          playerId: string;
      }
    | {
          type: "challenge";
          playerId: string;
          trait: ChallengeTrait;
      }
    | {
          type: "confirm_last_card";
          playerId: string;
      };

export type SpicyEngineResult =
    | { type: "error"; message: string }
    | { type: "ok"; events: SpicyResult[] };
