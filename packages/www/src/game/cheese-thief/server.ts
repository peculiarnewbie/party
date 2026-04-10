import type { CheeseThiefState } from "./types";
import type { CheeseThiefClientMessage } from "./messages";
import {
    initGame,
    processAction,
    removePlayer as removeCheeseThiefPlayer,
    endGameByHost,
} from "./engine";
import { getPlayerView } from "./views";

function sendStateToAll(
    state: CheeseThiefState,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendTo(
            player.id,
            JSON.stringify({
                type: "cheese_thief:state",
                data: getPlayerView(state, player.id),
            }),
        );
    }
    sendTo(
        state.hostId,
        JSON.stringify({
            type: "cheese_thief:state",
            data: getPlayerView(state, state.hostId),
        }),
    );
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

        sendTo(
            playerId,
            JSON.stringify({
                type: "cheese_thief:state",
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
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "cheese_thief:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "cheese_thief:action",
                data: result,
            }),
        );

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
