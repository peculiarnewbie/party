import type { CockroachPokerState } from "./types";
import type { CockroachPokerClientMessage } from "./messages";
import { cockroachPokerClientMessageSchema } from "./messages";
import { cockroachPokerServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const cockroachPokerRegistration: GameAdapterRegistration = {
    gameTypes: ["cockroach_poker"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: CockroachPokerState | null };
        return {
            messagePrefix: "cockroach_poker:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("cockroach_poker", cockroachPokerClientMessageSchema, json, {
                    operation: "game-room.cockroach-poker-message.decode",
                    component: "cockroach-poker-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                cockroachPokerServer(ref).processMessage(msg as CockroachPokerClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                cockroachPokerServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                cockroachPokerServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                cockroachPokerServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                cockroachPokerServer(ref).endGame(broadcast, sendTo),
        };
    },
};
