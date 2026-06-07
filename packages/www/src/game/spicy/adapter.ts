import type { SpicyState } from "./types";
import { spicyClientMessageSchema, type SpicyClientMessage } from "./messages";
import { spicyServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const spicyRegistration: GameAdapterRegistration<SpicyClientMessage> = {
    gameTypes: ["spicy"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: SpicyState | null };
        return {
            messagePrefix: "spicy:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("spicy", spicyClientMessageSchema, json, {
                    operation: "game-room.spicy-message.decode",
                    component: "spicy-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                spicyServer(ref).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                spicyServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                spicyServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                spicyServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                spicyServer(ref).endGame(broadcast, sendTo),
        };
    },
};
