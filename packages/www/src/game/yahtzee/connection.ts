import type { GameConnection } from "../connection";
import type { YahtzeeClientMessage, YahtzeeServerMessage } from "./messages";
import type { YahtzeePlayerView } from "./views";

export type YahtzeeSideEvent = Exclude<YahtzeeServerMessage, { type: "yahtzee:state" }>;

export type YahtzeeClientOutgoing = Omit<YahtzeeClientMessage, "playerId" | "playerName">;

export type YahtzeeConnection = GameConnection<
    YahtzeePlayerView,
    YahtzeeClientOutgoing,
    YahtzeeSideEvent
>;
