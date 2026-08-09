import type {
    GameAdapter,
    GameAdapterRegistration,
} from "~/game/shared/game-adapter-types";
import { createRpsEngine, type RpsEngine } from "./engine-new";
import { rpsClientMessageSchema, type RpsClientMessage } from "./messages";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { RpsState } from "./types";

export const rpsEngineRegistration: GameAdapterRegistration<RpsClientMessage> =
    {
        gameTypes: ["rps"],
        create: (_gameType, stateRef, adapterCtx) => {
            const ref = stateRef as { current: RpsState | null };
            let engine: RpsEngine | null = null;
            let engineBroadcast: (msg: string) => void = () => {};
            let engineSendTo: ((playerId: string, msg: string) => void) | null =
                null;

            const ensureEngine = (
                broadcast?: (msg: string) => void,
                sendTo?: (playerId: string, msg: string) => void,
            ) => {
                if (broadcast) engineBroadcast = broadcast;
                if (sendTo) engineSendTo = sendTo;
                if (engine) return engine;

                engine = createRpsEngine({
                    broadcast: (message) => engineBroadcast(message),
                    sendTo: (playerId, message) =>
                        engineSendTo?.(playerId, message),
                });
                if (ref.current) {
                    engine.restoreGame(
                        ref.current,
                        adapterCtx?.getHostPlayerId() ?? null,
                    );
                }
                return engine;
            };

            const persistEngine = () => {
                ref.current = engine?.getPersistedState() ?? null;
                adapterCtx?.persistGameSnapshot();
            };

            const adapter: GameAdapter<RpsClientMessage> = {
                messagePrefix: "rps:",
                decodeMessage: (json) =>
                    decodeGameClientMessageOrNull(
                        "rps",
                        rpsClientMessageSchema,
                        json,
                        {
                            operation: "game-room.rps-message.decode",
                            component: "rps-transport",
                        },
                    ),
                processMessage: (msg, broadcast, sendTo) => {
                    ensureEngine(broadcast, sendTo).processMessage(
                        JSON.stringify(msg),
                    );
                    if (msg.type !== "rps:sync") {
                        persistEngine();
                    }
                },
                sendStateToPlayer: (playerId, sendTo) => {
                    const activeEngine = ensureEngine(undefined, sendTo);
                    const sync = activeEngine.sync(playerId, 0, 0);
                    const sendFn = engineSendTo ?? sendTo;
                    sendFn(
                        playerId,
                        JSON.stringify({ type: "rps:sync_response", ...sync }),
                    );
                },
                initGame: (players, _hostId, broadcast, sendTo) => {
                    ref.current = null;
                    engine = null;
                    engineSendTo = sendTo;
                    engineBroadcast = broadcast;
                    engine = createRpsEngine({
                        broadcast: (message) => engineBroadcast(message),
                        sendTo: (playerId, message) =>
                            engineSendTo?.(playerId, message),
                    });
                    engine.initGame(players, _hostId);
                    persistEngine();
                },
                removePlayer: (playerId, broadcast, sendTo) => {
                    ensureEngine(broadcast, sendTo).removePlayer(playerId);
                    persistEngine();
                },
                endGame: (broadcast, sendTo) => {
                    ensureEngine(broadcast, sendTo).endGame();
                    persistEngine();
                },
            };

            return adapter;
        },
    };
