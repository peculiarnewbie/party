import type { GameConnection } from "../connection";
import type { FunFactsClientMessage } from "./messages";
import type { FunFactsPlayerView, FunFactsSideMessage } from "./schemas";

export type FunFactsSideEvent = FunFactsSideMessage;

export type FunFactsClientOutgoing = Omit<
    FunFactsClientMessage,
    "playerId" | "playerName"
>;

export type FunFactsConnection = GameConnection<
    FunFactsPlayerView,
    FunFactsClientOutgoing,
    FunFactsSideEvent
>;
