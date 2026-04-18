export const SKULL_MIN_PLAYERS = 3;
export const SKULL_MAX_PLAYERS = 6;

export const SKULL_STARTING_HAND = [
    "flower",
    "flower",
    "flower",
    "skull",
] as const;

export type DiscType = (typeof SKULL_STARTING_HAND)[number];

export interface SkullPlayer {
    id: string;
    name: string;
    hand: DiscType[];
    mat: DiscType[];
    successfulChallenges: number;
    eliminated: boolean;
}

export interface SkullRevealStep {
    ownerId: string;
    disc: DiscType;
    automatic: boolean;
}

export interface SkullAttemptState {
    challengerId: string;
    target: number;
    revealedCount: number;
    autoRevealDone: boolean;
    revealedSteps: SkullRevealStep[];
}

export type SkullPhase =
    | "turn_prep"
    | "building"
    | "auction"
    | "attempt"
    | "penalty"
    | "next_starter"
    | "game_over";

export interface SkullState {
    players: SkullPlayer[];
    phase: SkullPhase;
    roundNumber: number;
    starterPlayerId: string;
    currentPlayerId: string;
    playersWhoPlacedOpeningDisc: string[];
    highestBid: number | null;
    highestBidderId: string | null;
    passedBidderIds: string[];
    attempt: SkullAttemptState | null;
    penaltyPlayerId: string | null;
    penaltyChooserId: string | null;
    pendingNextStarterChooserId: string | null;
    winnerId: string | null;
}

export type SkullAction =
    | { type: "play_disc"; playerId: string; disc: DiscType }
    | { type: "start_challenge"; playerId: string; bid: number }
    | { type: "raise_bid"; playerId: string; bid: number }
    | { type: "pass_bid"; playerId: string }
    | { type: "flip_disc"; playerId: string; ownerId: string }
    | { type: "discard_lost_disc"; playerId: string; discIndex: number }
    | { type: "choose_next_starter"; playerId: string; nextStarterId: string };

export type SkullResult =
    | {
          type: "round_started";
          roundNumber: number;
          starterPlayerId: string;
      }
    | {
          type: "disc_played";
          playerId: string;
          matCount: number;
          handCount: number;
      }
    | {
          type: "challenge_started";
          playerId: string;
          bid: number;
      }
    | {
          type: "bid_raised";
          playerId: string;
          bid: number;
      }
    | {
          type: "bid_passed";
          playerId: string;
      }
    | {
          type: "attempt_started";
          challengerId: string;
          target: number;
      }
    | {
          type: "disc_revealed";
          ownerId: string;
          disc: DiscType;
          revealedCount: number;
          target: number;
          automatic: boolean;
      }
    | {
          type: "attempt_succeeded";
          challengerId: string;
          successfulChallenges: number;
          target: number;
      }
    | {
          type: "attempt_failed";
          challengerId: string;
          ownerId: string;
          target: number;
          revealedCount: number;
          ownSkull: boolean;
      }
    | {
          type: "discard_required";
          playerId: string;
      }
    | {
          type: "disc_lost";
          playerId: string;
          remainingHandCount: number;
          eliminated: boolean;
      }
    | {
          type: "next_starter_required";
          chooserId: string;
      }
    | {
          type: "next_starter_chosen";
          chooserId: string;
          starterPlayerId: string;
      }
    | {
          type: "game_over";
          winnerId: string | null;
          reason:
              | "two_challenges"
              | "last_player_standing"
              | "host_ended"
              | "not_enough_players";
      };

export type SkullEngineResult =
    | { type: "error"; message: string }
    | { type: "ok"; events: SkullResult[] };
