import type { RpsState } from "./types";
import type { RpsClientMessage } from "./messages";
import type { RpsChoice, BestOf } from "./types";
import {
    initGame,
    processAction,
    removePlayer as removeRpsPlayer,
    endGameByHost,
} from "./engine";
import { getPlayerView } from "./views";

export const rpsServer = (stateRef: { current: RpsState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "rps:state",
                data: getPlayerView(state, playerId),
            }),
        );
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
            sendTo(
                player.id,
                JSON.stringify({
                    type: "rps:state",
                    data: getPlayerView(state, player.id),
                }),
            );
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
                choice: message.data.choice as RpsChoice,
            };
        } else if (message.type === "rps:next_round") {
            action = {
                type: "next_round" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "rps:set_best_of") {
            action = {
                type: "set_best_of" as const,
                bestOf: message.data.bestOf as BestOf,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "rps:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "rps:action",
                data: result,
            }),
        );

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "rps:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        if (result.type === "tournament_over") {
            broadcast(
                JSON.stringify({
                    type: "rps:game_over",
                    data: { winnerId: result.winnerId },
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
        if (result.type !== "tournament_over") return;

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "rps:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        broadcast(
            JSON.stringify({
                type: "rps:game_over",
                data: { winnerId: result.winnerId },
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

        const result = removeRpsPlayer(state, playerId);

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "rps:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        if (result?.type === "tournament_over") {
            broadcast(
                JSON.stringify({
                    type: "rps:game_over",
                    data: { winnerId: result.winnerId },
                }),
            );
        }
    },
});
