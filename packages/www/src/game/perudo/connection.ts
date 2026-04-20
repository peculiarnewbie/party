import type { GameConnection } from "../connection";
import type { PerudoClientMessage, PerudoServerMessage } from "./messages";
import type { PerudoPlayerView } from "./views";

export type PerudoSideEvent = Exclude<PerudoServerMessage, { type: "perudo:state" }>;

export type PerudoClientOutgoing = Omit<PerudoClientMessage, "playerId" | "playerName">;

export type PerudoConnection = GameConnection<
    PerudoPlayerView,
    PerudoClientOutgoing,
    PerudoSideEvent
>;
