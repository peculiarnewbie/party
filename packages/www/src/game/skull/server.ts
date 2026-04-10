import type { SkullClientMessage } from "./messages";
import type { SkullEngineResult, SkullResult, SkullState } from "./types";
import {
    endGameByHost,
    initGame,
    processAction,
    removePlayer as removeSkullPlayer,
} from "./engine";
import { getPlayerView } from "./views";

function sendStateToAll(
    state: SkullState,
    lastPublicResult: SkullResult | null,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendTo(
            player.id,
            JSON.stringify({
                type: "skull:state",
                data: getPlayerView(state, player.id, lastPublicResult),
            }),
        );
    }
}

function broadcastEvents(
    result: SkullEngineResult,
    broadcast: (msg: string) => void,
) {
    if (result.type !== "ok") {
        return null;
    }

    let gameOverEvent: SkullResult | null = null;
    for (const event of result.events) {
        broadcast(
            JSON.stringify({
                type: "skull:action",
                data: event,
            }),
        );
        if (event.type === "game_over") {
            gameOverEvent = event;
        }
    }

    return gameOverEvent;
}

export const skullServer = (stateRef: { current: SkullState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "skull:state",
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
        message: SkullClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const action =
            message.type === "skull:play_disc"
                ? {
                      type: "play_disc" as const,
                      playerId: message.playerId,
                      disc: message.data.disc,
                  }
                : message.type === "skull:start_challenge"
                  ? {
                        type: "start_challenge" as const,
                        playerId: message.playerId,
                        bid: message.data.bid,
                    }
                  : message.type === "skull:raise_bid"
                    ? {
                          type: "raise_bid" as const,
                          playerId: message.playerId,
                          bid: message.data.bid,
                      }
                    : message.type === "skull:pass_bid"
                      ? {
                            type: "pass_bid" as const,
                            playerId: message.playerId,
                        }
                      : message.type === "skull:flip_disc"
                        ? {
                              type: "flip_disc" as const,
                              playerId: message.playerId,
                              ownerId: message.data.ownerId,
                          }
                        : message.type === "skull:discard_lost_disc"
                          ? {
                                type: "discard_lost_disc" as const,
                                playerId: message.playerId,
                                discIndex: message.data.discIndex,
                            }
                          : message.type === "skull:choose_next_starter"
                            ? {
                                  type: "choose_next_starter" as const,
                                  playerId: message.playerId,
                                  nextStarterId: message.data.playerId,
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
                    type: "skull:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        const lastPublicResult =
            result.events.length > 0 ? result.events[result.events.length - 1]! : null;
        const gameOverEvent = broadcastEvents(result, broadcast);
        sendStateToAll(state, lastPublicResult, sendTo);

        if (gameOverEvent?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "skull:game_over",
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
                type: "skull:action",
                data: result,
            }),
        );
        sendStateToAll(state, result, sendTo);
        broadcast(
            JSON.stringify({
                type: "skull:game_over",
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

        const result = removeSkullPlayer(state, playerId);
        sendStateToAll(state, result, sendTo);

        if (result?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "skull:game_over",
                    data: result,
                }),
            );
        }
    },
});
