import type { PerudoState } from "./types";
import {
    perudoClientMessageSchema,
    type PerudoClientMessage,
} from "./messages";
import { perudoServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";
import { createGameTimer } from "~/game/shared/game-timer";

const PERUDO_REVEAL_DELAY_MS = 4_500;

export const perudoRegistration: GameAdapterRegistration<PerudoClientMessage> =
    {
        gameTypes: ["perudo"],
        create: (_gameType, stateRef, adapterCtx) => {
            const ref = stateRef as { current: PerudoState | null };
            let timerArmed = false;
            const gameTimer = createGameTimer(
                adapterCtx,
                PERUDO_REVEAL_DELAY_MS,
                (broadcast, sendTo) => {
                    timerArmed = false;
                    perudoServer(ref, options).finishReveal(broadcast, sendTo);
                    adapterCtx?.persistGameSnapshot();
                },
            );
            const scheduleFinishReveal = gameTimer.schedule
                ? (
                      broadcast: (msg: string) => void,
                      sendTo: (playerId: string, msg: string) => void,
                  ) => {
                      timerArmed = true;
                      gameTimer.schedule?.(broadcast, sendTo);
                  }
                : undefined;
            const options = { scheduleFinishReveal };
            return {
                messagePrefix: "perudo:",
                decodeMessage: (json) =>
                    decodeGameClientMessageOrNull(
                        "perudo",
                        perudoClientMessageSchema,
                        json,
                        {
                            operation: "game-room.perudo-message.decode",
                            component: "perudo-transport",
                        },
                    ),
                processMessage: (msg, broadcast, sendTo) =>
                    perudoServer(ref, options).processMessage(
                        msg,
                        broadcast,
                        sendTo,
                    ),
                sendStateToPlayer: (playerId, sendTo) =>
                    perudoServer(ref, options).sendStateToPlayer(
                        playerId,
                        sendTo,
                    ),
                initGame: (players, _hostId, broadcast, sendTo) =>
                    perudoServer(ref, options).initGame(
                        players,
                        broadcast,
                        sendTo,
                    ),
                removePlayer: (playerId, broadcast, sendTo) =>
                    perudoServer(ref, options).removePlayer(
                        playerId,
                        broadcast,
                        sendTo,
                    ),
                endGame: (broadcast, sendTo) => {
                    gameTimer.clear();
                    perudoServer(ref, options).endGame(broadcast, sendTo);
                },
                resumeGame: (broadcast, sendTo) => {
                    if (ref.current?.phase === "revealing" && !timerArmed) {
                        scheduleFinishReveal?.(broadcast, sendTo);
                    }
                },
            };
        },
    };
