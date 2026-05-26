import type { GameConnection } from "../connection";
import type { Flip7ClientMessage } from "./messages";
import type { Flip7PlayerView, Flip7SideMessage } from "./schemas";

export type Flip7SideEvent = Flip7SideMessage;

export type Flip7ClientOutgoing = Omit<
    Flip7ClientMessage,
    "playerId" | "playerName"
>;

export type Flip7Connection = GameConnection<
    Flip7PlayerView,
    Flip7ClientOutgoing,
    Flip7SideEvent
>;
