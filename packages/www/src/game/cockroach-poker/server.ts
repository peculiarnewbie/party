import type {
    CockroachPokerClientMessage,
    CockroachPokerServerMessage,
} from "./messages";
import { encodeCockroachPokerServerMessage } from "./schemas";
import {
    initGame,
    processAction,
    removePlayer as removeCockroachPokerPlayer,
    endGameByHost,
} from "./engine";
import { getPlayerView } from "./views";
import type { CockroachPokerState } from "./types";

function sendServerMessage(
    send: (message: string) => void,
    message: CockroachPokerServerMessage,
) {
    send(encodeCockroachPokerServerMessage(message));
}

function sendStateToAll(
    state: CockroachPokerState,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendServerMessage((msg) => sendTo(player.id, msg), {
            type: "cockroach_poker:state",
            data: getPlayerView(state, player.id),
        });
    }
}

export const cockroachPokerServer = (stateRef: {
    current: CockroachPokerState | null;
}) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendServerMessage((msg) => sendTo(playerId, msg), {
            type: "cockroach_poker:state",
            data: getPlayerView(state, playerId),
        });
    },

    initGame(
        players: { id: string; name: string }[],
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = initGame(players);
        stateRef.current = state;

        sendStateToAll(state, sendTo);
    },

    processMessage(
        message: CockroachPokerClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "cockroach_poker:offer_card") {
            action = {
                type: "offer_card" as const,
                playerId: message.playerId,
                targetId: message.data.targetId,
                cardIndex: message.data.cardIndex,
                claim: message.data.claim,
            };
        } else if (message.type === "cockroach_poker:call_true") {
            action = {
                type: "call_true" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "cockroach_poker:call_false") {
            action = {
                type: "call_false" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "cockroach_poker:peek_and_pass") {
            action = {
                type: "peek_and_pass" as const,
                playerId: message.playerId,
                targetId: message.data.targetId,
                newClaim: message.data.newClaim,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendServerMessage((msg) => sendTo(message.playerId, msg), {
                type: "cockroach_poker:error",
                data: { message: result.message },
            });
            return;
        }

        sendServerMessage(broadcast, {
            type: "cockroach_poker:action",
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

        removeCockroachPokerPlayer(state, playerId);
        sendStateToAll(state, sendTo);
    },
});
