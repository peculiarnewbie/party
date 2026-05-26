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

export type PokerAction =
    | { type: "fold" }
    | { type: "check" }
    | { type: "call" }
    | { type: "bet"; amount: number }
    | { type: "raise"; amount: number }
    | { type: "all_in" };

export type PokerActionType = PokerAction["type"];

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

export type PokerEventBase =
    | {
          type: "hand_started";
          message: string;
          street: PokerStreet;
      }
    | {
          type: "blinds_posted";
          message: string;
          playerId: string;
          amount: number;
          street: PokerStreet;
      }
    | {
          type: "player_action";
          message: string;
          playerId: string;
          amount?: number;
          street: PokerStreet;
      }
    | {
          type: "board_dealt";
          message: string;
          street: PokerStreet;
      }
    | {
          type: "showdown";
          message: string;
          street: PokerStreet;
      }
    | {
          type: "pot_awarded";
          message: string;
          amount?: number;
          street: PokerStreet;
      }
    | {
          type: "player_disconnected";
          message: string;
          playerId: string;
          street: PokerStreet;
      }
    | {
          type: "player_reconnected";
          message: string;
          playerId: string;
          street: PokerStreet;
      }
    | {
          type: "game_ended";
          message: string;
      }
    | {
          type: "info";
          message: string;
          street: PokerStreet;
      };

export type PokerEvent = PokerEventBase & { id: number };

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
