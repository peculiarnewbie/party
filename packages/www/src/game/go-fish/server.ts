import type { GoFishClientMessage, GoFishServerMessage } from "./messages";
import { encodeGoFishServerMessage } from "./schemas";
import {
    initGame,
    processAction,
    removePlayer as removeGoFishPlayer,
} from "./engine";
import { getPlayerView } from "./views";
import type { GoFishState } from "./types";

function sendServerMessage(
    send: (message: string) => void,
    message: GoFishServerMessage,
) {
    send(encodeGoFishServerMessage(message));
}

export const goFishServer = (stateRef: { current: GoFishState | null }) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendServerMessage((message) => sendTo(playerId, message), {
            type: "go_fish:state",
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

        for (const player of state.players) {
            sendServerMessage((message) => sendTo(player.id, message), {
                type: "go_fish:state",
                data: getPlayerView(state, player.id),
            });
        }
    },

    processMessage(
        message: GoFishClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        if (message.type === "go_fish:ask") {
            const result = processAction(state, {
                type: "ask",
                askerId: message.playerId,
                targetId: message.data.targetId,
                rank: message.data.rank,
            });

            if (result.type === "error") {
                sendServerMessage((msg) => sendTo(message.playerId, msg), {
                    type: "go_fish:ask_result",
                    data: { error: result.message },
                });
                return;
            }

            if (result.type === "cards_given") {
                broadcast(
                    encodeGoFishServerMessage({
                        type: "go_fish:ask_result",
                        data: {
                            askerId: message.playerId,
                            askerName: message.playerName,
                            targetId: message.data.targetId,
                            rank: message.data.rank,
                            count: result.count,
                            success: true,
                            bookMade: result.bookMade,
                        },
                    }),
                );
            } else if (result.type === "go_fish") {
                broadcast(
                    encodeGoFishServerMessage({
                        type: "go_fish:ask_result",
                        data: {
                            askerId: message.playerId,
                            askerName: message.playerName,
                            targetId: message.data.targetId,
                            rank: message.data.rank,
                            success: false,
                        },
                    }),
                );
            }

            if (state.gameOver) {
                broadcast(
                    encodeGoFishServerMessage({
                        type: "go_fish:game_over",
                        data: { winners: state.winner },
                    }),
                );
            }

            for (const player of state.players) {
                sendServerMessage((msg) => sendTo(player.id, msg), {
                    type: "go_fish:state",
                    data: getPlayerView(state, player.id),
                });
            }
        } else if (message.type === "go_fish:draw") {
            const result = processAction(state, {
                type: "draw",
                playerId: message.playerId,
            });

            if (result.type === "error") {
                sendServerMessage((msg) => sendTo(message.playerId, msg), {
                    type: "go_fish:draw_result",
                    data: { error: result.message },
                });
                return;
            }

            if (result.type === "go_fish") {
                broadcast(
                    encodeGoFishServerMessage({
                        type: "go_fish:draw_result",
                        data: {
                            playerId: message.playerId,
                            playerName: message.playerName,
                            drewAskedRank: result.drewAskedRank,
                            bookMade: result.bookMade,
                        },
                    }),
                );

                if (result.bookMade) {
                    const player = state.players.find(
                        (p) => p.id === message.playerId,
                    );
                    if (player) {
                        broadcast(
                            encodeGoFishServerMessage({
                                type: "go_fish:book_made",
                                data: {
                                    playerId: message.playerId,
                                    playerName: message.playerName,
                                    rank: player.books[player.books.length - 1],
                                },
                            }),
                        );
                    }
                }
            }

            if (state.gameOver) {
                broadcast(
                    encodeGoFishServerMessage({
                        type: "go_fish:game_over",
                        data: { winners: state.winner },
                    }),
                );
            }

            for (const player of state.players) {
                sendServerMessage((msg) => sendTo(player.id, msg), {
                    type: "go_fish:state",
                    data: getPlayerView(state, player.id),
                });
            }
        }
    },

    removePlayer(
        playerId: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        const result = removeGoFishPlayer(state, playerId);

        if (result?.type === "game_over") {
            broadcast(
                encodeGoFishServerMessage({
                    type: "go_fish:game_over",
                    data: { winners: result.winners },
                }),
            );
        }

        for (const player of state.players) {
            sendServerMessage((msg) => sendTo(player.id, msg), {
                type: "go_fish:state",
                data: getPlayerView(state, player.id),
            });
        }
    },
});
