import type { PokerStreet } from "./schemas";

export type {
    PokerAction,
    PokerActionType,
    PokerPlayer,
    PokerPot,
    PokerSpectator,
    PokerEvent,
    PokerState,
    PokerStreet,
    PokerPlayerStatus,
} from "./schemas";

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
