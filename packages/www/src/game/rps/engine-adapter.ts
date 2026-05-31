import type { GameAdapter, GameAdapterRegistration } from "~/game/shared/game-adapter-types";
import type { GameEngine } from "~/game/shared/game-engine-types";
import { createRpsEngine } from "./engine-new";
import { rpsClientMessageSchema } from "./messages";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";

export const rpsEngineRegistration: GameAdapterRegistration = {
    gameTypes: ["rps"],
    create: (_gameType, _stateRef, _adapterCtx) => {
        let engine: GameEngine | null = null;
        let engineSendTo: ((playerId: string, msg: string) => void) | null = null;

        const adapter: GameAdapter = {
            messagePrefix: "rps:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("rps", rpsClientMessageSchema, json, {
                    operation: "game-room.rps-message.decode",
                    component: "rps-transport",
                }),
            processMessage: (_msg, _broadcast, _sendTo) => {
                if (!engine) return;
                engine.processMessage(JSON.stringify(_msg));
            },
            sendStateToPlayer: (playerId, _sendTo) => {
                if (!engine) return;
                const sync = engine.sync(playerId, 0, 0);
                const sendFn = engineSendTo ?? _sendTo;
                sendFn(
                    playerId,
                    JSON.stringify({ type: "rps:sync_response", ...sync }),
                );
            },
            initGame: (players, _hostId, broadcast, sendTo) => {
                engineSendTo = sendTo;
                engine = createRpsEngine({ broadcast, sendTo });
                engine.initGame(players, _hostId);
            },
            removePlayer: (playerId, _broadcast, _sendTo) => {
                engine?.removePlayer(playerId);
            },
            endGame: (_broadcast, _sendTo) => {
                engine?.endGame();
            },
        };

        return adapter;
    },
};
