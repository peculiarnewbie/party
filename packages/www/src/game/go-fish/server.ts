import type { Rank } from "~/assets/card-deck/types";
import type { GoFishState } from "./types";
import type { GoFishClientMessage } from "./messages";
import { initGame, processAction } from "./engine";
import { getPlayerView } from "./views";

export const goFishServer = (stateRef: { current: GoFishState | null }) => ({
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
                    type: "go_fish:state",
                    data: getPlayerView(state, player.id),
                }),
            );
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
                rank: message.data.rank as Rank,
            });

            if (result.type === "error") {
                sendTo(
                    message.playerId,
                    JSON.stringify({
                        type: "go_fish:ask_result",
                        data: { error: result.message },
                    }),
                );
                return;
            }

            if (result.type === "cards_given") {
                broadcast(
                    JSON.stringify({
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
                    JSON.stringify({
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
                    JSON.stringify({
                        type: "go_fish:game_over",
                        data: { winners: state.winner },
                    }),
                );
            }

            for (const player of state.players) {
                sendTo(
                    player.id,
                    JSON.stringify({
                        type: "go_fish:state",
                        data: getPlayerView(state, player.id),
                    }),
                );
            }
        } else if (message.type === "go_fish:draw") {
            const result = processAction(state, {
                type: "draw",
                playerId: message.playerId,
            });

            if (result.type === "error") {
                sendTo(
                    message.playerId,
                    JSON.stringify({
                        type: "go_fish:draw_result",
                        data: { error: result.message },
                    }),
                );
                return;
            }

            if (result.type === "go_fish") {
                broadcast(
                    JSON.stringify({
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
                            JSON.stringify({
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
                    JSON.stringify({
                        type: "go_fish:game_over",
                        data: { winners: state.winner },
                    }),
                );
            }

            for (const player of state.players) {
                sendTo(
                    player.id,
                    JSON.stringify({
                        type: "go_fish:state",
                        data: getPlayerView(state, player.id),
                    }),
                );
            }
        }
    },
});
