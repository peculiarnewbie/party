import type { PerudoState } from "./types";
import { perudoClientMessageSchema, type PerudoClientMessage } from "./messages";
import { perudoServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const perudoRegistration: GameAdapterRegistration<PerudoClientMessage> = {
    gameTypes: ["perudo"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: PerudoState | null };
        return {
            messagePrefix: "perudo:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("perudo", perudoClientMessageSchema, json, {
                    operation: "game-room.perudo-message.decode",
                    component: "perudo-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                perudoServer(ref).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                perudoServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                perudoServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                perudoServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                perudoServer(ref).endGame(broadcast, sendTo),
        };
    },
};
