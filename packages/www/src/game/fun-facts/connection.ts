import type { GameConnection } from "../connection";
import type {
    FunFactsClientMessage,
    FunFactsServerMessage,
} from "./messages";
import type { FunFactsPlayerView } from "./views";

export type FunFactsSideEvent = Exclude<
    FunFactsServerMessage,
    { type: "fun_facts:state" }
>;

export type FunFactsClientOutgoing = Omit<
    FunFactsClientMessage,
    "playerId" | "playerName"
>;

export type FunFactsConnection = GameConnection<
    FunFactsPlayerView,
    FunFactsClientOutgoing,
    FunFactsSideEvent
>;
