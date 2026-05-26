import type { GameConnection } from "../connection";
import type { HerdClientMessage } from "./messages";
import type { HerdPlayerView, HerdSideMessage } from "./schemas";

export type HerdSideEvent = HerdSideMessage;

export type HerdClientOutgoing = Omit<
    HerdClientMessage,
    "playerId" | "playerName"
>;

export type HerdConnection = GameConnection<
    HerdPlayerView,
    HerdClientOutgoing,
    HerdSideEvent
>;
