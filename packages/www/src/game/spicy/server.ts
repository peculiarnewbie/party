import type { SpicyClientMessage } from "./messages";
import type { SpicyResult, SpicyState } from "./types";
import { endGameByHost, initGame, processAction, removePlayer } from "./engine";
import { getPlayerView } from "./views";

function sendStateToAll(
    state: SpicyState,
    lastPublicResult: SpicyResult | null,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendTo(
            player.id,
            JSON.stringify({
                type: "spicy:state",
                data: getPlayerView(state, player.id, lastPublicResult),
            }),
        );
    }
}

function broadcastEvents(
    events: SpicyResult[],
    broadcast: (msg: string) => void,
) {
    let gameOverEvent: SpicyResult | null = null;

    for (const event of events) {
        broadcast(
            JSON.stringify({
                type: "spicy:action",
                data: event,
            }),
        );
        if (event.type === "game_over") {
            gameOverEvent = event;
        }
    }

    return gameOverEvent;
}

export const spicyServer = (stateRef: { current: SpicyState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "spicy:state",
                data: getPlayerView(state, playerId),
            }),
        );
    },

    initGame(
        players: { id: string; name: string }[],
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = initGame(players);
        stateRef.current = state;
        sendStateToAll(state, null, sendTo);
    },

    processMessage(
        message: SpicyClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const action =
            message.type === "spicy:play_card"
                ? {
                      type: "play_card" as const,
                      playerId: message.playerId,
                      cardId: message.data.cardId,
                      declaredNumber: message.data.declaredNumber,
                      declaredSpice: message.data.declaredSpice,
                  }
                : message.type === "spicy:pass"
                  ? {
                        type: "pass" as const,
                        playerId: message.playerId,
                    }
                  : message.type === "spicy:challenge"
                    ? {
                          type: "challenge" as const,
                          playerId: message.playerId,
                          trait: message.data.trait,
                      }
                    : message.type === "spicy:confirm_last_card"
                      ? {
                            type: "confirm_last_card" as const,
                            playerId: message.playerId,
                        }
                      : null;

        if (!action) {
            return;
        }

        const result = processAction(state, action);
        if (result.type === "error") {
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "spicy:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        const lastPublicResult =
            result.events.length > 0 ? result.events[result.events.length - 1]! : null;
        const gameOverEvent = broadcastEvents(result.events, broadcast);
        sendStateToAll(state, lastPublicResult, sendTo);

        if (gameOverEvent?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "spicy:game_over",
                    data: gameOverEvent,
                }),
            );
        }
    },

    endGame(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = endGameByHost(state);
        broadcast(
            JSON.stringify({
                type: "spicy:action",
                data: result,
            }),
        );
        sendStateToAll(state, result, sendTo);
        broadcast(
            JSON.stringify({
                type: "spicy:game_over",
                data: result,
            }),
        );
    },

    removePlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = removePlayer(state, playerId);
        sendStateToAll(state, result, sendTo);

        if (result?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "spicy:game_over",
                    data: result,
                }),
            );
        }
    },
});
