import type { GameConnection } from "../connection";
import type { PokerClientMessage, PokerServerMessage } from "./messages";
import type { PokerPlayerView } from "./views";

export type PokerSideEvent = Exclude<PokerServerMessage, { type: "poker:state" }>;

export type PokerClientOutgoing = Omit<PokerClientMessage, "playerId" | "playerName">;

export type PokerConnection = GameConnection<
    PokerPlayerView,
    PokerClientOutgoing,
    PokerSideEvent
>;
