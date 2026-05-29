import type { GoFishState } from "./types";
import type { GoFishClientMessage } from "./messages";
import { goFishClientMessageSchema } from "./messages";
import { goFishServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

export const goFishRegistration: GameAdapterRegistration = {
    gameTypes: ["go_fish"],
    create: (_gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: GoFishState | null };
        return {
            messagePrefix: "go_fish:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("go_fish", goFishClientMessageSchema, json, {
                    operation: "game-room.go-fish-message.decode",
                    component: "go-fish-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                goFishServer(ref).processMessage(msg as GoFishClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                goFishServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                goFishServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                goFishServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: () => {},
        };
    },
};
