import type { GameConnection } from "../connection";
import type { HerdClientMessage, HerdServerMessage } from "./messages";
import type { HerdPlayerView } from "./views";

export type HerdSideEvent = Exclude<HerdServerMessage, { type: "herd:state" }>;

export type HerdClientOutgoing = Omit<
    HerdClientMessage,
    "playerId" | "playerName"
>;

export type HerdConnection = GameConnection<
    HerdPlayerView,
    HerdClientOutgoing,
    HerdSideEvent
>;
