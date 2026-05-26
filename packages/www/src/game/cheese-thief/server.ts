import type { CheeseThiefClientMessage, CheeseThiefServerMessage } from "./messages";
import { encodeCheeseThiefServerMessage } from "./schemas";
import {
    initGame,
    processAction,
    removePlayer as removeCheeseThiefPlayer,
    endGameByHost,
} from "./engine";
import { getPlayerView } from "./views";
import type { CheeseThiefState } from "./types";

function sendServerMessage(
    send: (message: string) => void,
    message: CheeseThiefServerMessage,
) {
    send(encodeCheeseThiefServerMessage(message));
}

function sendStateToAll(
    state: CheeseThiefState,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendServerMessage((msg) => sendTo(player.id, msg), {
            type: "cheese_thief:state",
            data: getPlayerView(state, player.id),
        });
    }
    sendServerMessage((msg) => sendTo(state.hostId, msg), {
        type: "cheese_thief:state",
        data: getPlayerView(state, state.hostId),
    });
}

export const cheeseThiefServer = (stateRef: {
    current: CheeseThiefState | null;
}) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendServerMessage((msg) => sendTo(playerId, msg), {
            type: "cheese_thief:state",
            data: getPlayerView(state, playerId),
        });
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
        message: CheeseThiefClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "cheese_thief:start_day") {
            action = {
                type: "start_day" as const,
                hostId: message.playerId,
            };
        } else if (message.type === "cheese_thief:start_voting") {
            action = {
                type: "start_voting" as const,
                hostId: message.playerId,
            };
        } else if (message.type === "cheese_thief:cast_vote") {
            action = {
                type: "cast_vote" as const,
                playerId: message.playerId,
                targetId: message.data.targetId,
            };
        } else if (message.type === "cheese_thief:reveal_votes") {
            action = {
                type: "reveal_votes" as const,
                hostId: message.playerId,
            };
        } else if (message.type === "cheese_thief:next_round") {
            action = {
                type: "next_round" as const,
                hostId: message.playerId,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendServerMessage((msg) => sendTo(message.playerId, msg), {
                type: "cheese_thief:error",
                data: { message: result.message },
            });
            return;
        }

        sendServerMessage(broadcast, {
            type: "cheese_thief:action",
            data: result,
        });

        sendStateToAll(state, sendTo);
    },

    endGame(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        endGameByHost(state);
        sendStateToAll(state, sendTo);
    },

    removePlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        removeCheeseThiefPlayer(state, playerId);
        sendStateToAll(state, sendTo);
    },
});
