import type { GameConnection } from "../connection";
import type { RpsClientMessage } from "./messages";
import type { RpsPlayerView, RpsSideMessage } from "./schemas";

export type RpsSideEvent = RpsSideMessage;

export type RpsClientOutgoing = Omit<
    RpsClientMessage,
    "playerId" | "playerName"
>;

export type RpsConnection = GameConnection<
    RpsPlayerView,
    RpsClientOutgoing,
    RpsSideEvent
>;
