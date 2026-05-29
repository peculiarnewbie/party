import type { BlackjackState } from "./types";
import type { BlackjackClientMessage } from "./messages";
import { blackjackClientMessageSchema } from "./messages";
import { blackjackServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import { createGameTimer } from "~/game/shared/game-timer";
import type { GameAdapterRegistration, GameAdapterContext } from "~/game/shared/game-adapter-types";

const BLACKJACK_NEXT_ROUND_DELAY_MS = 5000;

export const blackjackRegistration: GameAdapterRegistration = {
    gameTypes: ["blackjack"],
    create: (_gameType, stateRef, adapterCtx) => {
        const ref = stateRef as { current: BlackjackState | null };
        const ctx = adapterCtx as GameAdapterContext | undefined;
        const gameTimer = createGameTimer(ctx, BLACKJACK_NEXT_ROUND_DELAY_MS, (broadcast, sendTo) => {
            ctx!.endGameAndPersist(broadcast, sendTo);
        });
        const opts = { scheduleNextRound: gameTimer.schedule };
        return {
            messagePrefix: "blackjack:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("blackjack", blackjackClientMessageSchema, json, {
                    operation: "game-room.blackjack-message.decode",
                    component: "blackjack-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                blackjackServer(ref, opts).processMessage(msg as BlackjackClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                blackjackServer(ref, opts).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                blackjackServer(ref, opts).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                blackjackServer(ref, opts).removePlayer(playerId, broadcast, sendTo),
            endGame: () => {},
        };
    },
};
