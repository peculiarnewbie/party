import type { GameConnection } from "../connection";
import type {
    BlackjackClientMessage,
    BlackjackServerMessage,
} from "./messages";
import type { BlackjackPlayerView } from "./views";

export type BlackjackSideEvent = Exclude<
    BlackjackServerMessage,
    { type: "blackjack:state" }
>;

export type BlackjackClientOutgoing = Omit<
    BlackjackClientMessage,
    "playerId" | "playerName"
>;

export type BlackjackConnection = GameConnection<
    BlackjackPlayerView,
    BlackjackClientOutgoing,
    BlackjackSideEvent
>;
