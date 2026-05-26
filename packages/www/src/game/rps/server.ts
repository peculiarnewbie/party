import type { RpsClientMessage, RpsServerMessage } from "./messages";
import { encodeRpsServerMessage } from "./schemas";
import type { BestOf, RpsState } from "./types";
import {
    endGameByHost,
    initGame,
    processAction,
    removePlayer as removeRpsPlayer,
} from "./engine";
import { getPlayerView } from "./views";

function sendServerMessage(
    send: (message: string) => void,
    message: RpsServerMessage,
) {
    send(encodeRpsServerMessage(message));
}

export const rpsServer = (stateRef: { current: RpsState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendServerMessage((message) => sendTo(playerId, message), {
            type: "rps:state",
            data: getPlayerView(state, playerId),
        });
    },

    initGame(
        players: { id: string; name: string }[],
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
        bestOf: BestOf = 3,
    ) {
        const state = initGame(players, bestOf);
        stateRef.current = state;

        for (const player of state.players) {
            sendServerMessage((message) => sendTo(player.id, message), {
                type: "rps:state",
                data: getPlayerView(state, player.id),
            });
        }
    },

    processMessage(
        message: RpsClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "rps:throw") {
            action = {
                type: "throw" as const,
                playerId: message.playerId,
                choice: message.data.choice,
            };
        } else if (message.type === "rps:next_round") {
            action = {
                type: "next_round" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "rps:set_best_of") {
            action = {
                type: "set_best_of" as const,
                bestOf: message.data.bestOf,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendServerMessage((msg) => sendTo(message.playerId, msg), {
                type: "rps:error",
                data: { message: result.message },
            });
            return;
        }

        sendServerMessage(broadcast, {
            type: "rps:action",
            data: result,
        });

        for (const player of state.players) {
            sendServerMessage((msg) => sendTo(player.id, msg), {
                type: "rps:state",
                data: getPlayerView(state, player.id),
            });
        }

        if (result.type === "tournament_over") {
            sendServerMessage(broadcast, {
                type: "rps:game_over",
                data: { winnerId: result.winnerId },
            });
        }
    },

    endGame(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = endGameByHost(state);
        if (result.type !== "tournament_over") return;

        for (const player of state.players) {
            sendServerMessage((msg) => sendTo(player.id, msg), {
                type: "rps:state",
                data: getPlayerView(state, player.id),
            });
        }

        sendServerMessage(broadcast, {
            type: "rps:game_over",
            data: { winnerId: result.winnerId },
        });
    },

    removePlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = removeRpsPlayer(state, playerId);

        for (const player of state.players) {
            sendServerMessage((msg) => sendTo(player.id, msg), {
                type: "rps:state",
                data: getPlayerView(state, player.id),
            });
        }

        if (result?.type === "tournament_over") {
            sendServerMessage(broadcast, {
                type: "rps:game_over",
                data: { winnerId: result.winnerId },
            });
        }
    },
});
