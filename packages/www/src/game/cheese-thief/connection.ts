import type { GameConnection } from "../connection";
import type {
    CheeseThiefClientMessage,
    CheeseThiefServerMessage,
} from "./messages";
import type { CheeseThiefPlayerView } from "./views";

export type CheeseThiefSideEvent = Exclude<
    CheeseThiefServerMessage,
    { type: "cheese_thief:state" }
>;

export type CheeseThiefClientOutgoing = Omit<
    CheeseThiefClientMessage,
    "playerId" | "playerName"
>;

export type CheeseThiefConnection = GameConnection<
    CheeseThiefPlayerView,
    CheeseThiefClientOutgoing,
    CheeseThiefSideEvent
>;
