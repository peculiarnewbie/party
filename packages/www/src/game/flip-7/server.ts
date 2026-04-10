import {
    endGameByHost,
    initGame,
    processAction,
    removePlayer as removeFlip7Player,
} from "./engine";
import type { Flip7State } from "./types";
import type { Flip7ClientMessage } from "./messages";
import { getPlayerView } from "./views";

function sendStateToAll(
    state: Flip7State,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendTo(
            player.id,
            JSON.stringify({
                type: "flip_7:state",
                data: getPlayerView(state, player.id),
            }),
        );
    }
}

export const flip7Server = (stateRef: { current: Flip7State | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "flip_7:state",
                data: getPlayerView(state, playerId),
            }),
        );
    },

    initGame(
        players: { id: string; name: string }[],
        hostId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = initGame(players, hostId);
        stateRef.current = state;
        sendStateToAll(state, sendTo);
    },

    processMessage(
        message: Flip7ClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const action =
            message.type === "flip_7:hit"
                ? { type: "hit" as const, playerId: message.playerId }
                : message.type === "flip_7:stay"
                  ? { type: "stay" as const, playerId: message.playerId }
                  : message.type === "flip_7:choose_target"
                    ? {
                          type: "choose_target" as const,
                          playerId: message.playerId,
                          targetId: message.data.targetId,
                      }
                    : {
                          type: "next_round" as const,
                          playerId: message.playerId,
                      };

        const result = processAction(state, action);

        if (result.type === "error") {
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "flip_7:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "flip_7:action",
                data: result,
            }),
        );
        sendStateToAll(state, sendTo);

        if (result.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "flip_7:game_over",
                    data: {
                        winners: result.winners,
                        endedByHost: result.endedByHost,
                    },
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
        sendStateToAll(state, sendTo);

        if (result.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "flip_7:game_over",
                    data: {
                        winners: result.winners,
                        endedByHost: result.endedByHost,
                    },
                }),
            );
        }
    },

    removePlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = removeFlip7Player(state, playerId);
        sendStateToAll(state, sendTo);

        if (result?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "flip_7:game_over",
                    data: {
                        winners: result.winners,
                        endedByHost: result.endedByHost,
                    },
                }),
            );
        }
    },
});
