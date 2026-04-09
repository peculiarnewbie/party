import type { FunFactsState } from "./types";
import type { FunFactsClientMessage } from "./messages";
import {
    initGame,
    processAction,
    removePlayer as removeFunFactsPlayer,
    endGameByHost,
} from "./engine";
import { getPlayerView } from "./views";

function sendStateToAll(
    state: FunFactsState,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendTo(
            player.id,
            JSON.stringify({
                type: "fun_facts:state",
                data: getPlayerView(state, player.id),
            }),
        );
    }
}

export const funFactsServer = (stateRef: {
    current: FunFactsState | null;
}) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "fun_facts:state",
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
        message: FunFactsClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "fun_facts:next_question") {
            action = {
                type: "next_question" as const,
                hostId: message.playerId,
                customQuestion: message.data.customQuestion,
            };
        } else if (message.type === "fun_facts:submit_answer") {
            action = {
                type: "submit_answer" as const,
                playerId: message.playerId,
                answer: message.data.answer,
            };
        } else if (message.type === "fun_facts:close_answers") {
            action = {
                type: "close_answers" as const,
                hostId: message.playerId,
            };
        } else if (message.type === "fun_facts:place_arrow") {
            action = {
                type: "place_arrow" as const,
                playerId: message.playerId,
                position: message.data.position,
            };
        } else if (message.type === "fun_facts:next_round") {
            action = {
                type: "next_round" as const,
                hostId: message.playerId,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "fun_facts:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "fun_facts:action",
                data: result,
            }),
        );

        sendStateToAll(state, sendTo);

        if (result.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "fun_facts:game_over",
                    data: {
                        teamScore: result.teamScore,
                        maxScore: result.maxScore,
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

        sendStateToAll(state, sendTo);

        broadcast(
            JSON.stringify({
                type: "fun_facts:game_over",
                data: {
                    teamScore: result.teamScore,
                    maxScore: result.maxScore,
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

        const result = removeFunFactsPlayer(state, playerId);

        sendStateToAll(state, sendTo);

        if (result?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "fun_facts:game_over",
                    data: {
                        teamScore: result.teamScore,
                        maxScore: result.maxScore,
                    },
                }),
            );
        }
    },
});
