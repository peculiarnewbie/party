import type { HerdState } from "./types";
import { herdClientMessageSchema, type HerdClientMessage } from "./messages";
import { herdServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const herdRegistration: GameAdapterRegistration<HerdClientMessage> = {
    gameTypes: ["herd"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: HerdState | null };
        return {
            messagePrefix: "herd:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("herd", herdClientMessageSchema, json, {
                    operation: "game-room.herd-message.decode",
                    component: "herd-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                herdServer(ref).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                herdServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) => {
                if (hostId === null) throw new Error("Cannot init herd: hostId is null");
                herdServer(ref).initGame(players, hostId, broadcast, sendTo);
            },
            removePlayer: (playerId, broadcast, sendTo) =>
                herdServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                herdServer(ref).endGame(broadcast, sendTo),
        };
    },
};
