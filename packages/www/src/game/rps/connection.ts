import type { GameConnection } from "../connection";
import type { RpsClientMessage, RpsServerMessage } from "./messages";
import type { RpsPlayerView } from "./views";

export type RpsSideEvent = Exclude<RpsServerMessage, { type: "rps:state" }>;

export type RpsClientOutgoing = Omit<
    RpsClientMessage,
    "playerId" | "playerName"
>;

export type RpsConnection = GameConnection<
    RpsPlayerView,
    RpsClientOutgoing,
    RpsSideEvent
>;
