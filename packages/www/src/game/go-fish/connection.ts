import type { GameConnection } from "../connection";
import type { GoFishClientMessage, GoFishServerMessage } from "./messages";
import type { GoFishPlayerView } from "./views";

export type GoFishSideEvent = Exclude<GoFishServerMessage, { type: "go_fish:state" }>;

export type GoFishClientOutgoing = Omit<GoFishClientMessage, "playerId" | "playerName">;

export type GoFishConnection = GameConnection<
    GoFishPlayerView,
    GoFishClientOutgoing,
    GoFishSideEvent
>;
