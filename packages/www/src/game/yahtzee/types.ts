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

export interface YahtzeePlayer {
    id: string;
    name: string;
    scorecard: Partial<Record<ScoringCategory, number>>;
    yahtzeeBonus: number;
}

export type YahtzeePhase = "pre_roll" | "mid_turn" | "game_over";

export interface YahtzeeState {
    players: YahtzeePlayer[];
    currentPlayerIndex: number;
    dice: Dice;
    held: HeldDice;
    rollsLeft: number;
    phase: YahtzeePhase;
    round: number;
    winners: string[] | null;
}

export type YahtzeeAction =
    | { type: "roll"; playerId: string }
    | { type: "toggle_hold"; playerId: string; diceIndex: number }
    | { type: "score"; playerId: string; category: ScoringCategory };

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
    | { type: "game_over"; winners: string[]; finalScores: FinalScore[] };

export interface FinalScore {
    playerId: string;
    playerName: string;
    total: number;
}
