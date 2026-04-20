import type { GameConnection } from "../connection";
import type {
    CockroachPokerClientMessage,
    CockroachPokerServerMessage,
} from "./messages";
import type { CockroachPokerPlayerView } from "./views";

export type CockroachPokerSideEvent = Exclude<
    CockroachPokerServerMessage,
    { type: "cockroach_poker:state" }
>;

export type CockroachPokerClientOutgoing = Omit<
    CockroachPokerClientMessage,
    "playerId" | "playerName"
>;

export type CockroachPokerConnection = GameConnection<
    CockroachPokerPlayerView,
    CockroachPokerClientOutgoing,
    CockroachPokerSideEvent
>;
