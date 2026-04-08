import type { YahtzeeState } from "./types";
import type { YahtzeeClientMessage } from "./messages";
import type { ScoringCategory } from "./types";
import { initGame, processAction } from "./engine";
import { getPlayerView } from "./views";

export const yahtzeeServer = (
    stateRef: { current: YahtzeeState | null },
) => ({
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
                    type: "yahtzee:state",
                    data: getPlayerView(state, player.id),
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
        } else {
            return;
        }

        const result = processAction(state, action);

        if (result.type === "error") {
            sendTo(
                message.playerId,
                JSON.stringify({
                    type: "yahtzee:error",
                    data: { message: result.message },
                }),
            );
            return;
        }

        broadcast(
            JSON.stringify({
                type: "yahtzee:action",
                data: result,
            }),
        );

        for (const player of state.players) {
            sendTo(
                player.id,
                JSON.stringify({
                    type: "yahtzee:state",
                    data: getPlayerView(state, player.id),
                }),
            );
        }

        if (result.type === "game_over") {
            broadcast(
                JSON.stringify({
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
