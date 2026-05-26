import type { PokerStreet } from "./schemas";

export type {
    PokerAction,
    PokerActionType,
    PokerPlayer,
    PokerPot,
    PokerSpectator,
    PokerEvent,
    PokerEventInput,
    PokerState,
    PokerStreet,
    PokerPlayerStatus,
} from "./schemas";

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
