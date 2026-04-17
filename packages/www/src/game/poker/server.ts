import {
    encodePokerServerMessage,
    type PokerClientMessage,
    type PokerServerMessage,
} from "./messages";
import {
    addSpectator,
    disconnectPlayer,
    endGameByHost,
    initGame,
    processAction,
    reconnectPlayer,
    startNextHand,
} from "./engine";
import { getPlayerView, type PokerVisibilityMode } from "./views";
import type { PokerState } from "./types";

function broadcastServerMessage(
    send: (message: string) => void,
    message: PokerServerMessage,
) {
    send(encodePokerServerMessage(message));
}

function broadcastState(
    state: PokerState,
    broadcast: (msg: string) => void,
    sendTo: (playerId: string, msg: string) => void,
    visibilityMode: PokerVisibilityMode,
) {
    for (const player of state.players) {
        broadcastServerMessage((message) => sendTo(player.id, message), {
            type: "poker:state",
            data: getPlayerView(state, player.id, visibilityMode) as unknown as Record<
                string,
                unknown
            >,
        });
    }

    for (const spectator of state.spectators) {
        broadcastServerMessage((message) => sendTo(spectator.id, message), {
            type: "poker:state",
            data: getPlayerView(state, spectator.id, visibilityMode) as unknown as Record<
                string,
                unknown
            >,
        });
    }

    const latestEvent = state.eventLog[state.eventLog.length - 1];
    if (latestEvent) {
        broadcastServerMessage(broadcast, {
            type: "poker:event",
            data: latestEvent as unknown as Record<string, unknown>,
        });
    }

    if (state.street === "tournament_over") {
        broadcastServerMessage(broadcast, {
            type: "poker:game_over",
            data: {
                winnerIds: state.winnerIds,
                endedByHost: state.endedByHost,
            },
        });
    }
}

export const pokerServer = (
    stateRef: { current: PokerState | null },
    opts?: {
        scheduleNextHand?: () => void;
        visibilityMode?: PokerVisibilityMode;
    },
) => ({
    initGame(
        players: { id: string; name: string }[],
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = initGame(players);
        stateRef.current = state;
        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
        if (state.street === "hand_over") {
            opts?.scheduleNextHand?.();
        }
    },

    addSpectator(
        player: { id: string; name: string },
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;
        addSpectator(state, player);
        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
    },

    reconnectPlayer(
        player: { id: string; name: string },
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;
        reconnectPlayer(state, player.id, player.name);
        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
    },

    disconnectPlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;
        disconnectPlayer(state, playerId);
        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
        if (state.street === "hand_over") {
            opts?.scheduleNextHand?.();
        }
    },

    processMessage(
        message: PokerClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = processAction(state, message.playerId, message.data);
        if (result.type === "error") {
            broadcastServerMessage(
                (encoded) => sendTo(message.playerId, encoded),
                {
                    type: "poker:action_result",
                    data: { error: result.message },
                },
            );
            return;
        }

        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
        if (state.street === "hand_over") {
            opts?.scheduleNextHand?.();
        }
    },

    endGame(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;
        endGameByHost(state);
        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
    },

    startNextHand(
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;
        const started = startNextHand(state);
        if (!started && state.street !== "tournament_over") {
            return;
        }
        broadcastState(
            state,
            broadcast,
            sendTo,
            opts?.visibilityMode ?? "standard",
        );
        if (state.street === "hand_over") {
            opts?.scheduleNextHand?.();
        }
    },
});
