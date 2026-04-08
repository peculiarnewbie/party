import type { Card, Rank } from "~/assets/card-deck/types";

export type { Card, Rank };

export interface BlackjackHand {
    cards: Card[];
    bet: number;
    doubled: boolean;
    stood: boolean;
    busted: boolean;
    isBlackjack: boolean;
    fromSplit: boolean;
}

export interface BlackjackPlayer {
    id: string;
    name: string;
    chips: number;
    hands: BlackjackHand[];
    currentHandIndex: number;
    bet: number;
    insuranceBet: number;
    insuranceDecided: boolean;
    done: boolean;
}

export type BlackjackPhase =
    | "betting"
    | "insurance"
    | "playing"
    | "dealer_turn"
    | "settled";

export interface BlackjackState {
    players: BlackjackPlayer[];
    shoe: Card[];
    burnPile: Card[];
    dealerHand: Card[];
    dealerRevealed: boolean;
    currentPlayerIndex: number;
    phase: BlackjackPhase;
    roundNumber: number;
    deckCount: number;
    cutCardPosition: number;
    results: RoundResult[] | null;
}

export interface HandResult {
    handIndex: number;
    bet: number;
    payout: number;
    outcome: "blackjack" | "win" | "push" | "lose" | "bust";
}

export interface RoundResult {
    playerId: string;
    playerName: string;
    hands: HandResult[];
    insurancePayout: number;
    netChips: number;
}

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
