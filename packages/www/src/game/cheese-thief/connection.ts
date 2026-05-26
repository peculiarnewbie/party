import type { GameConnection } from "../connection";
import type { CheeseThiefClientMessage } from "./messages";
import type { CheeseThiefSideMessage } from "./schemas";
import type { CheeseThiefPlayerView } from "./schemas";

export type CheeseThiefSideEvent = CheeseThiefSideMessage;

export type CheeseThiefClientOutgoing = Omit<
    CheeseThiefClientMessage,
    "playerId" | "playerName"
>;

export type CheeseThiefConnection = GameConnection<
    CheeseThiefPlayerView,
    CheeseThiefClientOutgoing,
    CheeseThiefSideEvent
>;
