import type {
    CreatureType,
    CockroachPokerPhase,
    CockroachPokerPlayer,
    CockroachPokerState,
    CockroachPokerResult,
    OfferChain,
} from "./schemas";

export type {
    CreatureType,
    CockroachPokerPhase,
    CockroachPokerPlayer,
    CockroachPokerState,
    CockroachPokerResult,
    OfferChain,
};

export { CREATURE_TYPES } from "./schemas";

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
