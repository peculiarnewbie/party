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
        let opts: {
            visibilityMode: "standard" | "backwards";
            scheduleNextHand?: (
                broadcast: (msg: string) => void,
                sendTo: (playerId: string, msg: string) => void,
            ) => void;
        };
        let timerArmed = false;
        const gameTimer = createGameTimer(
            adapterCtx,
            POKER_NEXT_HAND_DELAY_MS,
            (broadcast, sendTo) => {
                timerArmed = false;
                pokerServer(ref, opts).startNextHand(broadcast, sendTo);
                adapterCtx?.persistGameSnapshot();
            },
        );
        const scheduleNextHand = gameTimer.schedule
            ? (
                  broadcast: (msg: string) => void,
                  sendTo: (playerId: string, msg: string) => void,
              ) => {
                  timerArmed = true;
                  gameTimer.schedule?.(broadcast, sendTo);
              }
            : undefined;
        opts = { visibilityMode: vis, scheduleNextHand };
        return {
            messagePrefix: "poker:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull(
                    "poker",
                    pokerClientMessageSchema,
                    json,
                    {
                        operation: "game-room.poker-message.decode",
                        component: "poker-transport",
                    },
                ),
            processMessage: (msg, broadcast, sendTo) =>
                pokerServer(ref, opts).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: () => {},
            initGame: (players, _hostId, broadcast, sendTo) =>
                pokerServer(ref, opts).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                pokerServer(ref, opts).disconnectPlayer(
                    playerId,
                    broadcast,
                    sendTo,
                ),
            endGame: (broadcast, sendTo) =>
                pokerServer(ref, opts).endGame(broadcast, sendTo),
            resumeGame: (broadcast, sendTo) => {
                if (ref.current?.street === "hand_over" && !timerArmed) {
                    scheduleNextHand?.(broadcast, sendTo);
                }
            },
            onPlayerJoin: (
                playerId,
                playerName,
                isReconnect,
                broadcast,
                sendTo,
            ) => {
                const poker = pokerServer(ref, opts);
                if (isReconnect) {
                    poker.reconnectPlayer(
                        { id: playerId, name: playerName },
                        broadcast,
                        sendTo,
                    );
                } else {
                    poker.addSpectator(
                        { id: playerId, name: playerName },
                        broadcast,
                        sendTo,
                    );
                }
            },
        };
    },
};
