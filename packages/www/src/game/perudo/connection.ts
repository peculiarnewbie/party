import type { GameConnection } from "../connection";
import type { PerudoClientMessage } from "./messages";
import type { PerudoPlayerView, PerudoSideMessage } from "./schemas";

export type PerudoSideEvent = PerudoSideMessage;

export type PerudoClientOutgoing = Omit<PerudoClientMessage, "playerId" | "playerName">;

export type PerudoConnection = GameConnection<
    PerudoPlayerView,
    PerudoClientOutgoing,
    PerudoSideEvent
>;
