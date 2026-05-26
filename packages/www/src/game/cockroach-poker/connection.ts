import type { GameConnection } from "../connection";
import type { CockroachPokerClientMessage } from "./messages";
import type {
    CockroachPokerPlayerView,
    CockroachPokerSideMessage,
} from "./schemas";

export type CockroachPokerSideEvent = CockroachPokerSideMessage;

export type CockroachPokerClientOutgoing = Omit<
    CockroachPokerClientMessage,
    "playerId" | "playerName"
>;

export type CockroachPokerConnection = GameConnection<
    CockroachPokerPlayerView,
    CockroachPokerClientOutgoing,
    CockroachPokerSideEvent
>;
