export const CREATURE_TYPES = [
    "bat",
    "fly",
    "cockroach",
    "toad",
    "rat",
    "scorpion",
    "spider",
    "stink_bug",
] as const;
export type CreatureType = (typeof CREATURE_TYPES)[number];

export interface CockroachPokerPlayer {
    id: string;
    name: string;
    hand: CreatureType[];
    faceUpCards: CreatureType[];
}

export interface OfferChain {
    originalOffererId: string;
    cardValue: CreatureType;
    currentClaim: CreatureType;
    currentOffererId: string;
    currentReceiverId: string;
    seenByPlayerIds: string[];
}

export type CockroachPokerPhase = "offering" | "awaiting_response" | "game_over";

export interface CockroachPokerState {
    players: CockroachPokerPlayer[];
    phase: CockroachPokerPhase;
    activePlayerId: string;
    offerChain: OfferChain | null;
    loserId: string | null;
    loseReason: "four_of_a_kind" | "empty_hand" | null;
    lastResult: CockroachPokerResult | null;
}

export type CockroachPokerAction =
    | {
          type: "offer_card";
          playerId: string;
          targetId: string;
          cardIndex: number;
          claim: CreatureType;
      }
    | { type: "call_true"; playerId: string }
    | { type: "call_false"; playerId: string }
    | {
          type: "peek_and_pass";
          playerId: string;
          targetId: string;
          newClaim: CreatureType;
      };

export type CockroachPokerResult =
    | { type: "error"; message: string }
    | {
          type: "card_offered";
          offererId: string;
          receiverId: string;
          claim: CreatureType;
      }
    | {
          type: "call_resolved";
          callerId: string;
          calledTrue: boolean;
          wasCorrect: boolean;
          actualCard: CreatureType;
          cardTakerId: string;
      }
    | {
          type: "card_passed";
          passerId: string;
          newReceiverId: string;
          newClaim: CreatureType;
      }
    | {
          type: "game_over";
          loserId: string;
          reason: "four_of_a_kind" | "empty_hand";
      };
