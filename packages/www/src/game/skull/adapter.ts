import type { SkullState } from "./types";
import type { SkullClientMessage } from "./messages";
import { skullClientMessageSchema } from "./messages";
import { skullServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const skullRegistration: GameAdapterRegistration = {
    gameTypes: ["skull"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: SkullState | null };
        return {
            messagePrefix: "skull:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("skull", skullClientMessageSchema, json, {
                    operation: "game-room.skull-message.decode",
                    component: "skull-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                skullServer(ref).processMessage(msg as SkullClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                skullServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                skullServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                skullServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                skullServer(ref).endGame(broadcast, sendTo),
        };
    },
};
