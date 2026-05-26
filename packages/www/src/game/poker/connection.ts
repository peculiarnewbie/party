import type { GameConnection } from "../connection";
import type { PokerClientMessage } from "./messages";
import type { PokerSideMessage } from "./messages";
import type { PokerPlayerView } from "./views";

export type PokerSideEvent = PokerSideMessage;

export type PokerClientOutgoing = Omit<PokerClientMessage, "playerId" | "playerName">;

export type PokerConnection = GameConnection<
    PokerPlayerView,
    PokerClientOutgoing,
    PokerSideEvent
>;
