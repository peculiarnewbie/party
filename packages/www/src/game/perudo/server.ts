import type { PerudoState } from "./types";
import type { PerudoClientMessage } from "./messages";
import type { FaceValue } from "./types";
import {
    initGame,
    processAction,
    removePlayer as removePerudoPlayer,
    startNewRound,
    endGameByHost,
    finishReveal,
} from "./engine";
import { getPlayerView } from "./views";

export const perudoServer = (stateRef: { current: PerudoState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "perudo:state",
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

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "perudo:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }
    },

    processMessage(
        message: PerudoClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "perudo:bid") {
            action = {
                type: "bid" as const,
                playerId: message.playerId,
                quantity: message.data.quantity,
                faceValue: message.data.faceValue as FaceValue,
            };
        } else if (message.type === "perudo:challenge") {
            action = {
                type: "challenge" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "perudo:start_round") {
            const result = startNewRound(state);
            broadcast(
                JSON.stringify({
                    type: "perudo:action",
                    data: result,
                }),
            );
            for (const player of state.players) {
                sendTo(
                    player.id,
                    JSON.stringify({
                        type: "perudo:state",
                        data: getPlayerView(state, player.id),
                    }),
                );
            }
            return;
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "perudo:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "perudo:action",
                data: result,
            }),
        );

        if (
            result.type === "player_eliminated" ||
            result.type === "game_over"
        ) {
            state.revealTimerActive = true;
        }

        if (result.type === "player_eliminated") {
            state.currentPlayerIndex = result.nextPlayerIndex;
            state.startingPlayerIndex = result.nextStartingPlayerIndex;
            state.palificoRound = result.palificoRound;
        }

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "perudo:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        if (result.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "perudo:game_over",
                    data: {
                        winners: result.winners,
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
        if (result.type !== "game_over") return;

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "perudo:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        broadcast(
            JSON.stringify({
                type: "perudo:game_over",
                data: {
                    winners: result.winners,
                },
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

        removePerudoPlayer(state, playerId);

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "perudo:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }
    },

    finishReveal(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = finishReveal(state);

        broadcast(
            JSON.stringify({
                type: "perudo:action",
                data: result,
            }),
        );

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "perudo:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }
    },
});
