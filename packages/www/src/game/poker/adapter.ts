import type { PokerState } from "./types";
import { pokerClientMessageSchema, type PokerClientMessage } from "./messages";
import { pokerServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import { createGameTimer } from "~/game/shared/game-timer";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

const POKER_NEXT_HAND_DELAY_MS = 4500;

function getPokerVisibilityMode(gameType: string): "standard" | "backwards" {
    return gameType === "backwards_poker" ? "backwards" : "standard";
}

export const pokerRegistration: GameAdapterRegistration<PokerClientMessage> = {
    gameTypes: ["poker", "backwards_poker"],
    create: (gameType, stateRef, adapterCtx) => {
        const ref = stateRef as { current: PokerState | null };
        const vis = getPokerVisibilityMode(gameType);
        const gameTimer = createGameTimer(adapterCtx, POKER_NEXT_HAND_DELAY_MS, (broadcast, sendTo) => {
            adapterCtx!.endGameAndPersist(broadcast, sendTo);
        });
        const opts = { visibilityMode: vis, scheduleNextHand: gameTimer.schedule };
        return {
            messagePrefix: "poker:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("poker", pokerClientMessageSchema, json, {
                    operation: "game-room.poker-message.decode",
                    component: "poker-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                pokerServer(ref, opts).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: () => {},
            initGame: (players, _hostId, broadcast, sendTo) =>
                pokerServer(ref, opts).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                pokerServer(ref, opts).disconnectPlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                pokerServer(ref, opts).endGame(broadcast, sendTo),
            onPlayerJoin: (playerId, playerName, isReconnect, broadcast, sendTo) => {
                const poker = pokerServer(ref, opts);
                if (isReconnect) {
                    poker.reconnectPlayer({ id: playerId, name: playerName }, broadcast, sendTo);
                } else {
                    poker.addSpectator({ id: playerId, name: playerName }, broadcast, sendTo);
                }
            },
        };
    },
};
