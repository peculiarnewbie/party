import type { CheeseThiefState } from "./types";
import { cheeseThiefClientMessageSchema, type CheeseThiefClientMessage } from "./messages";
import { cheeseThiefServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const cheeseThiefRegistration: GameAdapterRegistration<CheeseThiefClientMessage> = {
    gameTypes: ["cheese_thief"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: CheeseThiefState | null };
        return {
            messagePrefix: "cheese_thief:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("cheese_thief", cheeseThiefClientMessageSchema, json, {
                    operation: "game-room.cheese-thief-message.decode",
                    component: "cheese-thief-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                cheeseThiefServer(ref).processMessage(msg, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                cheeseThiefServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) => {
                if (hostId === null) throw new Error("Cannot init cheese_thief: hostId is null");
                cheeseThiefServer(ref).initGame(players, hostId, broadcast, sendTo);
            },
            removePlayer: (playerId, broadcast, sendTo) =>
                cheeseThiefServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                cheeseThiefServer(ref).endGame(broadcast, sendTo),
        };
    },
};
