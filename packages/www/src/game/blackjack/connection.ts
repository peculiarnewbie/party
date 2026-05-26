import type { GameConnection } from "../connection";
import type { BlackjackClientMessage } from "./messages";
import type { BlackjackSideMessage } from "./schemas";
import type { BlackjackPlayerView } from "./views";

export type BlackjackSideEvent = BlackjackSideMessage;

export type BlackjackClientOutgoing = Omit<
    BlackjackClientMessage,
    "playerId" | "playerName"
>;

export type BlackjackConnection = GameConnection<
    BlackjackPlayerView,
    BlackjackClientOutgoing,
    BlackjackSideEvent
>;
