import type { Card } from "~/assets/card-deck/types";

export type PokerStreet =
    | "preflop"
    | "flop"
    | "turn"
    | "river"
    | "showdown"
    | "hand_over"
    | "tournament_over";

export type PokerPlayerStatus =
    | "active"
    | "folded"
    | "all_in"
    | "busted"
    | "disconnected";

export type PokerActionType =
    | "fold"
    | "check"
    | "call"
    | "bet"
    | "raise"
    | "all_in";

export type PokerAction =
    | { type: "fold" }
    | { type: "check" }
    | { type: "call" }
    | { type: "bet"; amount: number }
    | { type: "raise"; amount: number }
    | { type: "all_in" };

export interface PokerPlayer {
    id: string;
    name: string;
    stack: number;
    holeCards: Card[];
    status: PokerPlayerStatus;
    connected: boolean;
    committedThisStreet: number;
    committedThisHand: number;
    hasActedThisStreet: boolean;
    raiseLocked: boolean;
}

export interface PokerPot {
    amount: number;
    eligiblePlayerIds: string[];
}

export interface PokerEvent {
    id: number;
    type:
        | "hand_started"
        | "blinds_posted"
        | "player_action"
        | "board_dealt"
        | "showdown"
        | "pot_awarded"
        | "player_disconnected"
        | "player_reconnected"
        | "game_ended"
        | "info";
    message: string;
    playerId?: string;
    amount?: number;
    street?: PokerStreet;
}

export interface PokerSpectator {
    id: string;
    name: string;
}

export interface PokerState {
    players: PokerPlayer[];
    spectators: PokerSpectator[];
    deck: Card[];
    board: Card[];
    dealerIndex: number;
    smallBlindIndex: number;
    bigBlindIndex: number;
    actingPlayerIndex: number | null;
    street: PokerStreet;
    pots: PokerPot[];
    currentBet: number;
    minRaise: number;
    handNumber: number;
    lastAggressorIndex: number | null;
    endedByHost: boolean;
    winnerIds: string[] | null;
    eventLog: PokerEvent[];
    eventSeq: number;
}

export type PokerActionResult =
    | {
          type: "ok";
          stateChanged: boolean;
      }
    | {
          type: "error";
          message: string;
      };

export interface PokerHandValue {
    category: number;
    label: string;
    values: number[];
}
