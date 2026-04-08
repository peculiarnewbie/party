export type ScoringCategory =
    | "ones"
    | "twos"
    | "threes"
    | "fours"
    | "fives"
    | "sixes"
    | "three_of_a_kind"
    | "four_of_a_kind"
    | "full_house"
    | "small_straight"
    | "large_straight"
    | "yahtzee"
    | "chance";

export const SCORING_CATEGORIES: ScoringCategory[] = [
    "ones",
    "twos",
    "threes",
    "fours",
    "fives",
    "sixes",
    "three_of_a_kind",
    "four_of_a_kind",
    "full_house",
    "small_straight",
    "large_straight",
    "yahtzee",
    "chance",
];

export const UPPER_CATEGORIES: ScoringCategory[] = [
    "ones",
    "twos",
    "threes",
    "fours",
    "fives",
    "sixes",
];

export const LOWER_CATEGORIES: ScoringCategory[] = [
    "three_of_a_kind",
    "four_of_a_kind",
    "full_house",
    "small_straight",
    "large_straight",
    "yahtzee",
    "chance",
];

export const CATEGORY_LABELS: Record<ScoringCategory, string> = {
    ones: "Ones",
    twos: "Twos",
    threes: "Threes",
    fours: "Fours",
    fives: "Fives",
    sixes: "Sixes",
    three_of_a_kind: "3 of a Kind",
    four_of_a_kind: "4 of a Kind",
    full_house: "Full House",
    small_straight: "Sm Straight",
    large_straight: "Lg Straight",
    yahtzee: "YAHTZEE",
    chance: "Chance",
};

export type Dice = [number, number, number, number, number];
export type HeldDice = [boolean, boolean, boolean, boolean, boolean];
export type YahtzeeMode = "standard" | "lying";

export interface YahtzeePlayer {
    id: string;
    name: string;
    scorecard: Partial<Record<ScoringCategory, number>>;
    yahtzeeBonus: number;
    penaltyPoints: number;
}

export interface LyingClaim {
    playerId: string;
    category: ScoringCategory;
    claimedDice: Dice;
    claimedPoints: number;
}

export interface LyingTurnReveal {
    playerId: string;
    category: ScoringCategory;
    actualDice: Dice;
    claimedDice: Dice;
    claimedPoints: number;
    outcome: "accepted" | "truthful_challenge" | "caught_lying";
    penaltyPlayerId: string | null;
    penaltyPoints: number;
}

export type YahtzeePhase =
    | "pre_roll"
    | "mid_turn"
    | "awaiting_response"
    | "game_over";

export interface YahtzeeState {
    mode: YahtzeeMode;
    players: YahtzeePlayer[];
    currentPlayerIndex: number;
    dice: Dice;
    held: HeldDice;
    rollsLeft: number;
    phase: YahtzeePhase;
    round: number;
    winners: string[] | null;
    pendingClaim: LyingClaim | null;
    lastTurnReveal: LyingTurnReveal | null;
}

export type YahtzeeAction =
    | { type: "roll"; playerId: string }
    | { type: "toggle_hold"; playerId: string; diceIndex: number }
    | { type: "score"; playerId: string; category: ScoringCategory }
    | {
          type: "claim";
          playerId: string;
          category: ScoringCategory;
          claimedDice: Dice;
      }
    | { type: "accept_claim"; playerId: string }
    | { type: "challenge_claim"; playerId: string };

export type YahtzeeResult =
    | { type: "error"; message: string }
    | { type: "rolled"; playerId: string; dice: Dice }
    | {
          type: "held_toggled";
          playerId: string;
          diceIndex: number;
          held: boolean;
      }
    | {
          type: "scored";
          playerId: string;
          category: ScoringCategory;
          points: number;
          yahtzeeBonus: boolean;
      }
    | {
          type: "claim_submitted";
          playerId: string;
          category: ScoringCategory;
          claimedDice: Dice;
          claimedPoints: number;
      }
    | ({
          type: "claim_resolved";
          playerId: string;
          category: ScoringCategory;
          points: number;
          yahtzeeBonus: boolean;
      } & LyingTurnReveal)
    | { type: "game_over"; winners: string[]; finalScores: FinalScore[] };

export interface FinalScore {
    playerId: string;
    playerName: string;
    total: number;
}
