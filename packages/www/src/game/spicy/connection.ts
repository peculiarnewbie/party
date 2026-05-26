import type { GameConnection } from "../connection";
import type { SpicyClientMessage } from "./messages";
import type { SpicyPlayerView, SpicySideMessage } from "./schemas";

export type SpicySideEvent = SpicySideMessage;

export type SpicyClientOutgoing = Omit<SpicyClientMessage, "playerId" | "playerName">;

export type SpicyConnection = GameConnection<
    SpicyPlayerView,
    SpicyClientOutgoing,
    SpicySideEvent
>;
