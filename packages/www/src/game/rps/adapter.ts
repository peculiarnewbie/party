import type { RpsState } from "./types";
import type { RpsClientMessage } from "./messages";
import { rpsClientMessageSchema } from "./messages";
import { rpsServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const rpsRegistration: GameAdapterRegistration = {
    gameTypes: ["rps"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: RpsState | null };
        return {
            messagePrefix: "rps:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("rps", rpsClientMessageSchema, json, {
                    operation: "game-room.rps-message.decode",
                    component: "rps-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                rpsServer(ref).processMessage(msg as RpsClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                rpsServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                rpsServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                rpsServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                rpsServer(ref).endGame(broadcast, sendTo),
        };
    },
};
