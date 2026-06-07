import type { Flip7State } from "./types";
import { flip7ClientMessageSchema, type Flip7ClientMessage } from "./messages";
import { flip7Server } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const flip7Registration: GameAdapterRegistration<Flip7ClientMessage> = {
    gameTypes: ["flip_7"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: Flip7State | null };
        return {
            messagePrefix: "flip_7:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("flip_7", flip7ClientMessageSchema, json, {
                    operation: "game-room.flip-7-message.decode",
                    component: "flip-7-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                flip7Server(ref).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                flip7Server(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) => {
                if (hostId === null) throw new Error("Cannot init flip_7: hostId is null");
                flip7Server(ref).initGame(players, hostId, broadcast, sendTo);
            },
            removePlayer: (playerId, broadcast, sendTo) =>
                flip7Server(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                flip7Server(ref).endGame(broadcast, sendTo),
        };
    },
};
