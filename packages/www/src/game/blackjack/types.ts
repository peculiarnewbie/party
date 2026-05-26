import type { Card, Rank } from "~/assets/card-deck/types";
import type { RoundResult } from "./schemas";

export type { Card, Rank };

export type {
    BlackjackPhase,
    HandResult,
    RoundResult,
    BlackjackHand,
    BlackjackPlayer,
    BlackjackState,
} from "./schemas";

export type BlackjackAction =
    | { type: "place_bet"; playerId: string; amount: number }
    | { type: "hit"; playerId: string }
    | { type: "stand"; playerId: string }
    | { type: "double_down"; playerId: string }
    | { type: "split"; playerId: string }
    | { type: "insurance"; playerId: string; accept: boolean }
    | { type: "new_round" };

export type BlackjackResult =
    | { type: "error"; message: string }
    | { type: "bet_placed"; playerId: string; amount: number }
    | { type: "dealt"; insuranceOffered: boolean }
    | { type: "insurance_resolved"; dealerBlackjack: boolean }
    | { type: "player_hit"; playerId: string; handIndex: number; busted: boolean }
    | { type: "player_stood"; playerId: string; handIndex: number }
    | { type: "player_doubled"; playerId: string; handIndex: number; busted: boolean }
    | { type: "player_split"; playerId: string }
    | { type: "settled"; results: RoundResult[] }
    | { type: "new_round"; roundNumber: number };
