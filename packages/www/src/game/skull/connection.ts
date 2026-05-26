import type { GameConnection } from "../connection";
import type { SkullClientMessage } from "./messages";
import type { SkullPlayerView, SkullSideMessage } from "./schemas";

export type SkullSideEvent = SkullSideMessage;

export type SkullClientOutgoing = Omit<SkullClientMessage, "playerId" | "playerName">;

export type SkullConnection = GameConnection<
    SkullPlayerView,
    SkullClientOutgoing,
    SkullSideEvent
>;
