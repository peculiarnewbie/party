import type { BlackjackClientMessage, BlackjackServerMessage } from "./messages";
import { encodeBlackjackServerMessage } from "./schemas";
import {
    initGame,
    processAction,
    removePlayer as removeBlackjackPlayer,
} from "./engine";
import { getPlayerView } from "./views";
import type { BlackjackResult, BlackjackState } from "./types";

function sendServerMessage(
    send: (message: string) => void,
    message: BlackjackServerMessage,
) {
    send(encodeBlackjackServerMessage(message));
}

function broadcastAction(
    broadcast: (msg: string) => void,
    result: Exclude<BlackjackResult, { type: "error" }>,
) {
    broadcast(
        encodeBlackjackServerMessage({
            type: "blackjack:action",
            data: result,
        }),
    );
}

function broadcastStateToAll(
    state: BlackjackState,
    sendTo: (playerId: string, msg: string) => void,
) {
    for (const player of state.players) {
        sendServerMessage((msg) => sendTo(player.id, msg), {
            type: "blackjack:state",
            data: getPlayerView(state, player.id),
        });
    }
}

export const blackjackServer = (
    stateRef: { current: BlackjackState | null },
    opts: {
        scheduleNextRound?: (
            broadcast: (msg: string) => void,
            sendTo: (playerId: string, msg: string) => void,
        ) => void;
    },
) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendServerMessage((msg) => sendTo(playerId, msg), {
            type: "blackjack:state",
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

        broadcastStateToAll(state, sendTo);
    },

    processMessage(
        message: BlackjackClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "blackjack:bet") {
            action = {
                type: "place_bet" as const,
                playerId: message.playerId,
                amount: message.data.amount,
            };
        } else if (message.type === "blackjack:hit") {
            action = {
                type: "hit" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "blackjack:stand") {
            action = {
                type: "stand" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "blackjack:double") {
            action = {
                type: "double_down" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "blackjack:split") {
            action = {
                type: "split" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "blackjack:insurance") {
            action = {
                type: "insurance" as const,
                playerId: message.playerId,
                accept: message.data.accept,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendServerMessage((msg) => sendTo(message.playerId, msg), {
                type: "blackjack:error",
                data: { message: result.message },
            });
            return;
        }

        broadcastAction(broadcast, result);
        broadcastStateToAll(state, sendTo);

        if (state.phase === "settled" && state.results) {
            broadcast(
                encodeBlackjackServerMessage({
                    type: "blackjack:settled",
                    data: { results: state.results },
                }),
            );
            opts.scheduleNextRound?.(broadcast, sendTo);
        }
    },

    startNextRound(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = processAction(state, { type: "new_round" });
        if (result.type === "error") return;

        broadcastAction(broadcast, result);
        broadcastStateToAll(state, sendTo);
    },

    removePlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = removeBlackjackPlayer(state, playerId);

        if (result && result.type !== "error") {
            broadcastAction(broadcast, result);
        }

        broadcastStateToAll(state, sendTo);

        if (state.phase === "settled" && state.results) {
            broadcast(
                encodeBlackjackServerMessage({
                    type: "blackjack:settled",
                    data: { results: state.results },
                }),
            );
            opts.scheduleNextRound?.(broadcast, sendTo);
        }
    },
});
