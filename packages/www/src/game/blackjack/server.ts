import type { BlackjackState } from "./types";
import type { BlackjackClientMessage } from "./messages";
import {
    initGame,
    processAction,
    removePlayer as removeBlackjackPlayer,
} from "./engine";
import { getPlayerView } from "./views";

export const blackjackServer = (
    stateRef: { current: BlackjackState | null },
    opts: {
        scheduleNextRound: () => void;
    },
) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            JSON.stringify({
                type: "blackjack:state",
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
                    type: "blackjack:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }
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
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "blackjack:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "blackjack:action",
                data: result,
            }),
        );

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "blackjack:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        if (state.phase === "settled" && state.results) {
            broadcast(
                JSON.stringify({
                    type: "blackjack:settled",
                    data: { results: state.results },
                }),
            );
            opts.scheduleNextRound();
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

        broadcast(
            JSON.stringify({
                type: "blackjack:action",
                data: result,
            }),
        );

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "blackjack:state",
                    data: getPlayerView(state, player.id),
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

        const result = removeBlackjackPlayer(state, playerId);

        if (result) {
            broadcast(
                JSON.stringify({
                    type: "blackjack:action",
                    data: result,
                }),
            );
        }

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "blackjack:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        if (state.phase === "settled" && state.results) {
            broadcast(
                JSON.stringify({
                    type: "blackjack:settled",
                    data: { results: state.results },
                }),
            );
            opts.scheduleNextRound();
        }
    },
});
