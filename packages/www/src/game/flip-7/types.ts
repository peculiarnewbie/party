export const FLIP_7_ACTION_CARD_TYPES = [
    "freeze",
    "flip_three",
    "second_chance",
] as const;
export type Flip7ActionCardType = (typeof FLIP_7_ACTION_CARD_TYPES)[number];

export const FLIP_7_BONUS_MODIFIER_VALUES = [2, 4, 6, 8, 10] as const;
export type Flip7BonusModifierValue =
    (typeof FLIP_7_BONUS_MODIFIER_VALUES)[number];

export type Flip7Card =
    | { type: "number"; value: number }
    | { type: "bonus"; value: Flip7BonusModifierValue }
    | { type: "multiplier"; value: 2 }
    | { type: "action"; action: Flip7ActionCardType };

export type Flip7PlayerStatus = "active" | "stayed" | "busted" | "frozen";
export type Flip7Phase =
    | "initial_deal"
    | "turn"
    | "awaiting_target"
    | "round_over"
    | "game_over";
export type Flip7RoundEndReason =
    | "all_players_inactive"
    | "flip7"
    | "host_ended"
    | "too_few_players"
    | "deck_exhausted";
export type Flip7ShuffleMode = "random" | "none";

export interface Flip7Player {
    id: string;
    name: string;
    totalScore: number;
    status: Flip7PlayerStatus;
    cards: Flip7Card[];
}

export interface Flip7RoundScore {
    playerId: string;
    score: number;
    totalScore: number;
    status: Flip7PlayerStatus;
    numberTotal: number;
    flatModifierTotal: number;
    usedMultiplier: boolean;
    flip7Bonus: number;
}

export interface Flip7RoundResult {
    roundNumber: number;
    dealerId: string | null;
    endReason: Flip7RoundEndReason;
    flip7WinnerId: string | null;
    scores: Flip7RoundScore[];
}

export interface Flip7PendingChoice {
    chooserPlayerId: string;
    sourcePlayerId: string;
    card: Flip7ActionCardType;
    validTargetIds: string[];
}

export interface Flip7ForcedDraw {
    playerId: string;
    remaining: number;
    deferredActions: Extract<Flip7ActionCardType, "freeze" | "flip_three">[];
}

export interface Flip7State {
    hostId: string;
    players: Flip7Player[];
    phase: Flip7Phase;
    roundNumber: number;
    targetScore: number;
    dealerIndex: number;
    currentPlayerIndex: number | null;
    deck: Flip7Card[];
    discardPile: Flip7Card[];
    initialDealOrder: string[];
    initialDealCursor: number;
    pendingChoice: Flip7PendingChoice | null;
    forcedDraw: Flip7ForcedDraw | null;
    turnActionPlayerId: string | null;
    lastResult: Flip7Result | null;
    lastRoundResult: Flip7RoundResult | null;
    winners: string[] | null;
    endedByHost: boolean;
    shuffleMode: Flip7ShuffleMode;
}

export type Flip7Action =
    | { type: "hit"; playerId: string }
    | { type: "stay"; playerId: string }
    | { type: "choose_target"; playerId: string; targetId: string }
    | { type: "next_round"; playerId: string };

export type Flip7Result =
    | { type: "error"; message: string }
    | { type: "round_started"; roundNumber: number; dealerId: string | null }
    | { type: "player_hit"; playerId: string }
    | { type: "player_stayed"; playerId: string }
    | {
          type: "target_required";
          chooserPlayerId: string;
          card: Flip7ActionCardType;
          validTargetIds: string[];
      }
    | {
          type: "target_chosen";
          chooserPlayerId: string;
          targetId: string;
          card: Flip7ActionCardType;
      }
    | {
          type: "round_over";
          roundNumber: number;
          endReason: Flip7RoundEndReason;
          flip7WinnerId: string | null;
      }
    | {
          type: "round_advanced";
          roundNumber: number;
          dealerId?: string | null;
      }
    | { type: "game_over"; winners: string[]; endedByHost: boolean };
