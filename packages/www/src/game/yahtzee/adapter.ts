import type { YahtzeeState } from "./types";
import type { YahtzeeClientMessage } from "./messages";
import { yahtzeeClientMessageSchema } from "./messages";
import { yahtzeeServer } from "./server";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import type { GameAdapterRegistration } from "~/game/shared/game-adapter-types";

function getYahtzeeMode(gameType: string): "standard" | "lying" {
    return gameType === "lying_yahtzee" ? "lying" : "standard";
}

export const yahtzeeRegistration: GameAdapterRegistration = {
    gameTypes: ["yahtzee", "lying_yahtzee"],
    create: (gameType, stateRef, _adapterCtx) => {
        const ref = stateRef as { current: YahtzeeState | null };
        const opts = { mode: getYahtzeeMode(gameType) };
        return {
            messagePrefix: "yahtzee:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("yahtzee", yahtzeeClientMessageSchema, json, {
                    operation: "game-room.yahtzee-message.decode",
                    component: "yahtzee-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                yahtzeeServer(ref, opts).processMessage(msg as YahtzeeClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                yahtzeeServer(ref, opts).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                yahtzeeServer(ref, opts).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                yahtzeeServer(ref, opts).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                yahtzeeServer(ref, opts).endGame(broadcast, sendTo),
        };
    },
};
