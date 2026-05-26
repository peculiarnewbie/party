import type { GameConnection } from "../connection";
import type { GoFishClientMessage } from "./messages";
import type { GoFishPlayerView } from "./views";
import type { GoFishSideMessage } from "./schemas";

export type GoFishSideEvent = GoFishSideMessage;

export type GoFishClientOutgoing = Omit<GoFishClientMessage, "playerId" | "playerName">;

export type GoFishConnection = GameConnection<
    GoFishPlayerView,
    GoFishClientOutgoing,
    GoFishSideEvent
>;
