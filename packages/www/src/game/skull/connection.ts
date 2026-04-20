import type { GameConnection } from "../connection";
import type { SkullClientMessage, SkullServerMessage } from "./messages";
import type { SkullPlayerView } from "./views";

export type SkullSideEvent = Exclude<SkullServerMessage, { type: "skull:state" }>;

export type SkullClientOutgoing = Omit<SkullClientMessage, "playerId" | "playerName">;

export type SkullConnection = GameConnection<
    SkullPlayerView,
    SkullClientOutgoing,
    SkullSideEvent
>;
