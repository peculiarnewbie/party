import type { GameConnection } from "../connection";
import type { YahtzeeClientMessage, YahtzeeSideMessage } from "./messages";
import type { YahtzeePlayerView } from "./views";

export type YahtzeeSideEvent = YahtzeeSideMessage;

export type YahtzeeClientOutgoing = Omit<YahtzeeClientMessage, "playerId" | "playerName">;

export type YahtzeeConnection = GameConnection<
    YahtzeePlayerView,
    YahtzeeClientOutgoing,
    YahtzeeSideEvent
>;
