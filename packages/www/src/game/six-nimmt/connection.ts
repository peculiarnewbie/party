import type { GameConnection } from "../connection";
import type {
    SixNimmtClientMessage,
    SixNimmtPlayerView,
    SixNimmtServerMessage,
} from "./schemas";
type Outgoing<T> = T extends unknown
    ? Omit<T, "playerId" | "playerName">
    : never;
export type SixNimmtConnection = GameConnection<
    SixNimmtPlayerView,
    Outgoing<SixNimmtClientMessage>,
    Exclude<SixNimmtServerMessage, { type: "six_nimmt:state" }>
>;
