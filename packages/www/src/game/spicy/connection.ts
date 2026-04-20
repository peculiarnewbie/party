import type { GameConnection } from "../connection";
import type { SpicyClientMessage, SpicyServerMessage } from "./messages";
import type { SpicyPlayerView } from "./views";

export type SpicySideEvent = Exclude<SpicyServerMessage, { type: "spicy:state" }>;

export type SpicyClientOutgoing = Omit<SpicyClientMessage, "playerId" | "playerName">;

export type SpicyConnection = GameConnection<
    SpicyPlayerView,
    SpicyClientOutgoing,
    SpicySideEvent
>;
