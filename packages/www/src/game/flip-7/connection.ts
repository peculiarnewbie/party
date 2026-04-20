import type { GameConnection } from "../connection";
import type { Flip7ClientMessage, Flip7ServerMessage } from "./messages";
import type { Flip7PlayerView } from "./views";

export type Flip7SideEvent = Exclude<
    Flip7ServerMessage,
    { type: "flip_7:state" }
>;

export type Flip7ClientOutgoing = Omit<
    Flip7ClientMessage,
    "playerId" | "playerName"
>;

export type Flip7Connection = GameConnection<
    Flip7PlayerView,
    Flip7ClientOutgoing,
    Flip7SideEvent
>;
