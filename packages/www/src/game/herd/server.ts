import type { HerdState } from "./types";
import type { HerdClientMessage } from "./messages";
import {
    initGame,
    processAction,
    removePlayer as removeHerdPlayer,
    endGameByHost,
} from "./engine";
import { getPlayerView } from "./views";

function sendStateToAll(
    state: HerdState,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendTo(
            player.id,
            JSON.stringify({
                type: "herd:state",
                data: getPlayerView(state, player.id),
            }),
        );
    }
    sendTo(
        state.hostId,
        JSON.stringify({
            type: "herd:state",
            data: getPlayerView(state, state.hostId),
        }),
    );
}

export const herdServer = (stateRef: { current: HerdState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "herd:state",
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
        message: HerdClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "herd:toggle_pink_cow") {
            action = {
                type: "toggle_pink_cow" as const,
                hostId: message.playerId,
                enabled: message.data.enabled,
            };
        } else if (message.type === "herd:next_question") {
            action = {
                type: "next_question" as const,
                hostId: message.playerId,
                customQuestion: message.data.customQuestion,
            };
        } else if (message.type === "herd:submit_answer") {
            action = {
                type: "submit_answer" as const,
                playerId: message.playerId,
                answer: message.data.answer,
            };
        } else if (message.type === "herd:close_answers") {
            action = {
                type: "close_answers" as const,
                hostId: message.playerId,
            };
        } else if (message.type === "herd:merge_groups") {
            action = {
                type: "merge_groups" as const,
                hostId: message.playerId,
                groupId1: message.data.groupId1,
                groupId2: message.data.groupId2,
            };
        } else if (message.type === "herd:confirm_scoring") {
            action = {
                type: "confirm_scoring" as const,
                hostId: message.playerId,
            };
        } else if (message.type === "herd:next_round") {
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
                    type: "herd:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "herd:action",
                data: result,
            }),
        );

        sendStateToAll(state, sendTo);

        if (result.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "herd:game_over",
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
        if (result.type !== "game_over") return;

        sendStateToAll(state, sendTo);

        broadcast(
            JSON.stringify({
                type: "herd:game_over",
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

        const result = removeHerdPlayer(state, playerId);

        sendStateToAll(state, sendTo);

        if (result?.type === "game_over") {
            broadcast(
                JSON.stringify({
                    type: "herd:game_over",
                    data: { winnerId: result.winnerId },
                }),
            );
        }
    },
});
