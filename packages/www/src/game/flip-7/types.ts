export type {
    Flip7ActionCardType,
    Flip7BonusModifierValue,
    Flip7Card,
    Flip7ForcedDraw,
    Flip7PendingChoice,
    Flip7Phase,
    Flip7Player,
    Flip7PlayerStatus,
    Flip7Result,
    Flip7RoundEndReason,
    Flip7RoundResult,
    Flip7RoundScore,
    Flip7ShuffleMode,
    Flip7State,
} from "./schemas";

export {
    FLIP_7_ACTION_CARD_TYPES,
    FLIP_7_BONUS_MODIFIER_VALUES,
} from "./schemas";

export type Flip7Action =
    | { type: "hit"; playerId: string }
    | { type: "stay"; playerId: string }
    | { type: "choose_target"; playerId: string; targetId: string }
    | { type: "next_round"; playerId: string };
