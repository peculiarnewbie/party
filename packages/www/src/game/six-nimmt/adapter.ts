import {
    decodeGameClientMessageOrNull,
    encodeJsonMessage,
} from "~/effect/schema-helpers";
import { createGameTimer } from "~/game/shared/game-timer";
import type {
    GameAdapterRegistration,
    BroadcastFn,
    SendToFn,
} from "~/game/shared/game-adapter-types";
import {
    sixNimmtClientMessageSchema,
    sixNimmtServerMessageSchema,
} from "./schemas";
import type { SixNimmtClientMessage, SixNimmtState } from "./schemas";
import {
    advance,
    chooseRow,
    finishGame,
    initGame,
    lockCard,
    nextRound,
    removePlayer,
} from "./engine";
import { getPlayerView } from "./views";

export const sixNimmtRegistration: GameAdapterRegistration<SixNimmtClientMessage> =
    {
        gameTypes: ["six_nimmt"],
        create: (_gameType, stateRef, ctx) => {
            const ref = stateRef as { current: SixNimmtState | null };
            let host: string | null = null;
            let armed = false;
            const sendState = (playerId: string, sendTo: SendToFn) => {
                if (ref.current)
                    sendTo(
                        playerId,
                        encodeJsonMessage(sixNimmtServerMessageSchema, {
                            type: "six_nimmt:state",
                            data: getPlayerView(ref.current, playerId),
                        }),
                    );
            };
            const sync = (sendTo: SendToFn) =>
                ref.current?.players.forEach((player) =>
                    sendState(player.id, sendTo),
                );
            const timer = createGameTimer(ctx, 1200, (broadcast, sendTo) => {
                armed = false;
                if (!ref.current) return;
                ref.current = advance(ref.current);
                ctx?.persistGameSnapshot();
                sync(sendTo);
                schedule(broadcast, sendTo);
            });
            const schedule = (broadcast: BroadcastFn, sendTo: SendToFn) => {
                if (
                    ref.current?.stage.type === "resolving" &&
                    !armed &&
                    timer.schedule
                ) {
                    armed = true;
                    timer.schedule(broadcast, sendTo);
                }
            };
            return {
                messagePrefix: "six_nimmt:",
                decodeMessage: (json) =>
                    decodeGameClientMessageOrNull(
                        "six_nimmt",
                        sixNimmtClientMessageSchema,
                        json,
                        {
                            operation: "game-room.six-nimmt-message.decode",
                            component: "six-nimmt-transport",
                        },
                    ),
                initGame: (players, hostId, _broadcast, sendTo) => {
                    host = hostId;
                    ref.current = initGame(players);
                    sync(sendTo);
                },
                sendStateToPlayer: sendState,
                setHost: (playerId) => {
                    host = playerId;
                },
                processMessage: (message, broadcast, sendTo) => {
                    const state = ref.current;
                    if (!state) return;
                    const fail = (messageText: string) =>
                        sendTo(
                            message.playerId,
                            encodeJsonMessage(sixNimmtServerMessageSchema, {
                                type: "six_nimmt:error",
                                data: { message: messageText },
                            }),
                        );
                    if (
                        message.data.round !== state.round ||
                        ("turn" in message.data &&
                            message.data.turn !== state.turn)
                    )
                        return fail("The turn has changed. Choose again.");
                    if (
                        !state.players.some(
                            (player) =>
                                player.id === message.playerId && player.active,
                        )
                    )
                        return fail("You are not playing this game.");
                    if (
                        message.type === "six_nimmt:next_round" &&
                        message.playerId !== (ctx?.getHostPlayerId() ?? host)
                    )
                        return fail("Only the host can deal the next hand.");
                    const result =
                        message.type === "six_nimmt:lock"
                            ? lockCard(
                                  state,
                                  message.playerId,
                                  message.data.card,
                              )
                            : message.type === "six_nimmt:choose_row"
                              ? chooseRow(
                                    state,
                                    message.playerId,
                                    message.data.row,
                                )
                              : nextRound(state);
                    if (result.error !== undefined) return fail(result.error);
                    ref.current = result.state;
                    sync(sendTo);
                    schedule(broadcast, sendTo);
                },
                removePlayer: (playerId, broadcast, sendTo) => {
                    if (ref.current)
                        ref.current = removePlayer(ref.current, playerId);
                    sync(sendTo);
                    schedule(broadcast, sendTo);
                },
                resumeGame: schedule,
                endGame: (_broadcast, sendTo) => {
                    timer.clear();
                    armed = false;
                    if (ref.current) ref.current = finishGame(ref.current);
                    sync(sendTo);
                },
            };
        },
    };
