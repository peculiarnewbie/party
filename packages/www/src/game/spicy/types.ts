export const SPICY_MIN_PLAYERS = 3;
export const SPICY_MAX_PLAYERS = 6;
export const SPICY_HAND_SIZE = 6;
export const SPICY_TROPHY_COUNT = 3;
export const SPICY_WILD_CARDS_PER_TYPE = 5;
export const SPICY_STANDARD_COPIES = 3;

export const SPICE_TYPES = ["chili", "wasabi", "pepper"] as const;
export type SpiceType = (typeof SPICE_TYPES)[number];

export const CHALLENGE_TRAITS = ["number", "spice"] as const;
export type ChallengeTrait = (typeof CHALLENGE_TRAITS)[number];

export interface StandardSpicyCard {
    id: string;
    kind: "standard";
    number: number;
    spice: SpiceType;
}

export interface WildSpiceCard {
    id: string;
    kind: "wild_spice";
}

export interface WildNumberCard {
    id: string;
    kind: "wild_number";
}

export interface WorldsEndCard {
    id: "worlds_end";
    kind: "worlds_end";
}

export type SpicyCard = StandardSpicyCard | WildSpiceCard | WildNumberCard;
export type DrawPileCard = SpicyCard | WorldsEndCard;

export interface SpicyPlayer {
    id: string;
    name: string;
    hand: SpicyCard[];
    wonCardCount: number;
    trophies: number;
}

export interface SpicyStackEntry {
    playerId: string;
    card: SpicyCard;
    declaredNumber: number;
    declaredSpice: SpiceType;
}

export interface SpicyFinalScore {
    playerId: string;
    points: number;
    wonCardCount: number;
    trophies: number;
    handCount: number;
}

export type SpicyPhase = "playing" | "last_card_window" | "game_over";

export type SpicyEndReason =
    | "two_trophies"
    | "all_trophies"
    | "worlds_end"
    | "host_ended"
    | "not_enough_players";

export interface SpicyState {
    players: SpicyPlayer[];
    phase: SpicyPhase;
    currentPlayerId: string;
    stack: SpicyStackEntry[];
    drawPile: DrawPileCard[];
    pendingLastCardPlayerId: string | null;
    safePassPlayerIds: string[];
    trophiesRemaining: number;
    winners: string[] | null;
    endReason: SpicyEndReason | null;
    finalScores: SpicyFinalScore[] | null;
}

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

export type DrawContext =
    | "pass"
    | "invalid_declaration"
    | "challenge_penalty"
    | "trophy_refill";

export type SpicyResult =
    | {
          type: "card_played";
          playerId: string;
          declaredNumber: number;
          declaredSpice: SpiceType;
          stackSize: number;
          handCount: number;
          lastCard: boolean;
      }
    | {
          type: "player_passed";
          playerId: string;
          drewCount: number;
      }
    | {
          type: "invalid_declaration";
          playerId: string;
          declaredNumber: number;
          declaredSpice: SpiceType;
          drewCount: number;
      }
    | {
          type: "challenge_resolved";
          challengerId: string;
          challengedPlayerId: string;
          challengedTrait: ChallengeTrait;
          declaredNumber: number;
          declaredSpice: SpiceType;
          actualCard: SpicyCard;
          challengerWon: boolean;
          winnerId: string;
          loserId: string;
          collectedCardCount: number;
          loserDrewCount: number;
      }
    | {
          type: "last_card_confirmed";
          playerId: string;
          pendingPlayerId: string;
          confirmations: number;
          required: number;
      }
    | {
          type: "trophy_awarded";
          playerId: string;
          trophies: number;
          trophiesRemaining: number;
          drewCount: number;
      }
    | {
          type: "worlds_end_revealed";
          triggeringPlayerId: string;
          during: DrawContext;
      }
    | {
          type: "game_over";
          winners: string[];
          reason: SpicyEndReason;
          finalScores: SpicyFinalScore[];
      };

export type SpicyEngineResult =
    | { type: "error"; message: string }
    | { type: "ok"; events: SpicyResult[] };
