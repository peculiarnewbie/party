import type { YahtzeeState } from "./types";
import type { YahtzeeClientMessage } from "./messages";
import type { ScoringCategory, YahtzeeMode } from "./types";
import { encodeYahtzeeServerMessage } from "./messages";
import {
    endGameByHost,
    initGame,
    processAction,
    removePlayer as removeYahtzeePlayer,
} from "./engine";
import { getPlayerView } from "./views";

export const yahtzeeServer = (
    stateRef: { current: YahtzeeState | null },
    opts?: { mode?: YahtzeeMode },
) => ({
    sendStateToPlayer(
        playerId: string,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        sendTo(
            playerId,
            encodeYahtzeeServerMessage({
                type: "yahtzee:state",
                data: getPlayerView(state, playerId) as unknown as Record<
                    string,
                    unknown
                >,
            }),
        );
    },

    initGame(
        players: { id: string; name: string }[],
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = initGame(players, { mode: opts?.mode ?? "standard" });
        stateRef.current = state;

        for (const player of state.players) {
            sendTo(
                player.id,
                encodeYahtzeeServerMessage({
                    type: "yahtzee:state",
                    data: getPlayerView(state, player.id) as unknown as Record<
                        string,
                        unknown
                    >,
                }),
            );
        }
    },

    processMessage(
        message: YahtzeeClientMessage,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) {
        const state = stateRef.current;
        if (!state) return;

        let action;
        if (message.type === "yahtzee:roll") {
            action = {
                type: "roll" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "yahtzee:toggle_hold") {
            action = {
                type: "toggle_hold" as const,
                playerId: message.playerId,
                diceIndex: message.data.diceIndex,
            };
        } else if (message.type === "yahtzee:score") {
            action = {
                type: "score" as const,
                playerId: message.playerId,
                category: message.data.category as ScoringCategory,
            };
        } else if (message.type === "yahtzee:claim") {
            action = {
                type: "claim" as const,
                playerId: message.playerId,
                category: message.data.category as ScoringCategory,
                claimedDice: message.data.claimedDice,
            };
        } else if (message.type === "yahtzee:accept_claim") {
            action = {
                type: "accept_claim" as const,
                playerId: message.playerId,
            };
        } else if (message.type === "yahtzee:challenge_claim") {
            action = {
                type: "challenge_claim" as const,
                playerId: message.playerId,
            };
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendTo(
                message.playerId,
                encodeYahtzeeServerMessage({
                    type: "yahtzee:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            encodeYahtzeeServerMessage({
                type: "yahtzee:action",
                data: result as unknown as Record<string, unknown>,
            }),
        );

        for (const player of state.players) {
            sendTo(
                player.id,
                encodeYahtzeeServerMessage({
                    type: "yahtzee:state",
                    data: getPlayerView(state, player.id) as unknown as Record<
                        string,
                        unknown
                    >,
                }),
            );
        }

        if (result.type === "game_over") {
            broadcast(
                encodeYahtzeeServerMessage({
                    type: "yahtzee:game_over",
                    data: {
                        winners: result.winners,
                        finalScores: result.finalScores,
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

        for (const player of state.players) {
            sendTo(
                player.id,
                encodeYahtzeeServerMessage({
                    type: "yahtzee:state",
                    data: getPlayerView(state, player.id) as unknown as Record<
                        string,
                        unknown
                    >,
                }),
            );
        }

        broadcast(
            encodeYahtzeeServerMessage({
                type: "yahtzee:game_over",
                data: {
                    winners: result.winners,
                    finalScores: result.finalScores,
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

        const result = removeYahtzeePlayer(state, playerId);

        for (const player of state.players) {
            sendTo(
                player.id,
                encodeYahtzeeServerMessage({
                    type: "yahtzee:state",
                    data: getPlayerView(state, player.id) as unknown as Record<
                        string,
                        unknown
                    >,
                }),
            );
        }

        if (result?.type === "game_over") {
            broadcast(
                encodeYahtzeeServerMessage({
                    type: "yahtzee:game_over",
                    data: {
                        winners: result.winners,
                        finalScores: result.finalScores,
                    },
                }),
            );
        }
    },
});
