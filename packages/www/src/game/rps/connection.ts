import type { GameConnection } from "../connection";
import type { RpsClientMessage } from "./messages";
import type { RpsPlayerView, RpsSideMessage } from "./schemas";

export type RpsSideEvent = RpsSideMessage;

export type RpsClientOutgoing = {
    [K in RpsClientMessage["type"]]: Omit<
        Extract<RpsClientMessage, { type: K }>,
        "playerId" | "playerName"
    >;
}[RpsClientMessage["type"]];

export type RpsConnection = GameConnection<
    RpsPlayerView,
    RpsClientOutgoing,
    RpsSideEvent
>;
