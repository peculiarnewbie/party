export type {
    ScoringCategory,
    Dice,
    HeldDice,
    YahtzeeMode,
    YahtzeePhase,
    YahtzeePlayer,
    LyingClaim,
    LyingTurnReveal,
    YahtzeeState,
    FinalScore,
} from "./schemas";

export {
    SCORING_CATEGORIES,
    UPPER_CATEGORIES,
    LOWER_CATEGORIES,
    scoringCategories,
} from "./schemas";

export const CATEGORY_LABELS = {
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
} as const satisfies Record<
    import("./schemas").ScoringCategory,
    string
>;

export type YahtzeeAction =
    | { type: "roll"; playerId: string }
    | { type: "toggle_hold"; playerId: string; diceIndex: number }
    | { type: "score"; playerId: string; category: import("./schemas").ScoringCategory }
    | {
          type: "claim";
          playerId: string;
          category: import("./schemas").ScoringCategory;
          claimedDice: import("./schemas").RolledDice;
      }
    | { type: "accept_claim"; playerId: string }
    | { type: "challenge_claim"; playerId: string };

export type YahtzeeResult =
    | { type: "error"; message: string }
    | { type: "rolled"; playerId: string; dice: import("./schemas").RolledDice }
    | {
          type: "held_toggled";
          playerId: string;
          diceIndex: number;
          held: boolean;
      }
    | {
          type: "scored";
          playerId: string;
          category: import("./schemas").ScoringCategory;
          points: number;
          yahtzeeBonus: boolean;
      }
    | {
          type: "claim_submitted";
          playerId: string;
          category: import("./schemas").ScoringCategory;
          claimedDice: import("./schemas").RolledDice;
          claimedPoints: number;
      }
    | ({
          type: "claim_resolved";
          playerId: string;
          category: import("./schemas").ScoringCategory;
          points: number;
          yahtzeeBonus: boolean;
      } & import("./schemas").LyingTurnReveal)
    | {
          type: "game_over";
          winners: string[];
          finalScores: import("./schemas").FinalScore[];
      };
