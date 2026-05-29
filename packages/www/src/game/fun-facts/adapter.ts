import type { FunFactsState } from "./types";
import type { FunFactsClientMessage } from "./messages";
import { funFactsClientMessageSchema } from "./messages";
import { funFactsServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const funFactsRegistration: GameAdapterRegistration = {
    gameTypes: ["fun_facts"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: FunFactsState | null };
        return {
            messagePrefix: "fun_facts:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("fun_facts", funFactsClientMessageSchema, json, {
                    operation: "game-room.fun-facts-message.decode",
                    component: "fun-facts-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                funFactsServer(ref).processMessage(msg as FunFactsClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                funFactsServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) => {
                if (hostId === null) throw new Error("Cannot init fun_facts: hostId is null");
                funFactsServer(ref).initGame(players, hostId, broadcast, sendTo);
            },
            removePlayer: (playerId, broadcast, sendTo) =>
                funFactsServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                funFactsServer(ref).endGame(broadcast, sendTo),
        };
    },
};
