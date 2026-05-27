import type { GameType } from "~/game";
import { isPokerGameType } from "~/game";
import { decodeGameClientMessageOrNull } from "~/effect/schema-helpers";
import { goFishServer, goFishClientMessageSchema } from "~/game/go-fish";
import { pokerServer, pokerClientMessageSchema } from "~/game/poker";
import { blackjackServer, blackjackClientMessageSchema } from "~/game/blackjack";
import { yahtzeeServer, yahtzeeClientMessageSchema } from "~/game/yahtzee";
import { perudoServer, perudoClientMessageSchema } from "~/game/perudo";
import { rpsServer, rpsClientMessageSchema } from "~/game/rps";
import { herdServer, herdClientMessageSchema } from "~/game/herd";
import { funFactsServer, funFactsClientMessageSchema } from "~/game/fun-facts";
import { cheeseThiefServer, cheeseThiefClientMessageSchema } from "~/game/cheese-thief";
import { cockroachPokerServer, cockroachPokerClientMessageSchema } from "~/game/cockroach-poker";
import { flip7Server, flip7ClientMessageSchema } from "~/game/flip-7";
import { skullServer, skullClientMessageSchema } from "~/game/skull";
import { spicyServer, spicyClientMessageSchema } from "~/game/spicy";

type BroadcastFn = (msg: string) => void;
type SendToFn = (playerId: string, msg: string) => void;

const POKER_NEXT_HAND_DELAY_MS = 4500;
const BLACKJACK_NEXT_ROUND_DELAY_MS = 5000;

export interface GameAdapter {
    messagePrefix: string;
    decodeMessage(
        json: Record<string, unknown>,
    ): ReturnType<typeof decodeGameClientMessageOrNull>;
    processMessage(
        message: unknown,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): void;
    sendStateToPlayer(playerId: string, sendTo: SendToFn): void;
    initGame(
        players: { id: string; name: string }[],
        hostId: string | null,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): void;
    removePlayer(
        playerId: string,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): void;
    endGame(broadcast: BroadcastFn, sendTo: SendToFn): void;
    onPlayerJoin?(
        playerId: string,
        playerName: string,
        isReconnect: boolean,
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ): void;
}

function getPokerVisibilityMode(gameType: GameType): "standard" | "backwards" {
    return gameType === "backwards_poker" ? "backwards" : "standard";
}

function getYahtzeeMode(gameType: GameType): "standard" | "lying" {
    return gameType === "lying_yahtzee" ? "lying" : "standard";
}

function requireHostId(hostId: string | null, gameType: string): string {
    if (hostId === null) {
        throw new Error(`Cannot init ${gameType}: hostId is null`);
    }
    return hostId;
}

export interface GameAdapterContext {
    endGameAndPersist: (
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
    ) => void;
    setGameTimer: (clearFn: (() => void) | null) => void;
}

export function createGameAdapter(
    gameType: GameType,
    stateRef: { current: unknown },
    adapterCtx?: GameAdapterContext,
): GameAdapter | null {
    if (gameType === "go_fish") {
        const ref = stateRef as { current: import("~/game/go-fish").GoFishState | null };
        return {
            messagePrefix: "go_fish:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("go_fish", goFishClientMessageSchema, json, {
                    operation: "game-room.go-fish-message.decode",
                    component: "go-fish-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                goFishServer(ref).processMessage(msg as import("~/game/go-fish").GoFishClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                goFishServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                goFishServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                goFishServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: () => {},

        };
    }

    if (isPokerGameType(gameType)) {
        const ref = stateRef as { current: import("~/game/poker").PokerState | null };
        const vis = getPokerVisibilityMode(gameType);
        let nextHandTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleNextHand = adapterCtx
            ? (broadcast: (msg: string) => void, sendTo: (playerId: string, msg: string) => void) => {
                if (nextHandTimer) clearTimeout(nextHandTimer);
                nextHandTimer = setTimeout(() => {
                    nextHandTimer = null;
                    adapterCtx.endGameAndPersist(broadcast, sendTo);
                }, POKER_NEXT_HAND_DELAY_MS);
                adapterCtx.setGameTimer(() => {
                    if (nextHandTimer) {
                        clearTimeout(nextHandTimer);
                        nextHandTimer = null;
                    }
                });
            }
            : undefined;
        const opts = { visibilityMode: vis, scheduleNextHand };
        return {
            messagePrefix: "poker:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("poker", pokerClientMessageSchema, json, {
                    operation: "game-room.poker-message.decode",
                    component: "poker-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                pokerServer(ref, opts).processMessage(msg as import("~/game/poker").PokerClientMessage, broadcast, sendTo),
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
    }

    if (gameType === "blackjack") {
        const ref = stateRef as { current: import("~/game/blackjack").BlackjackState | null };
        let nextRoundTimer: ReturnType<typeof setTimeout> | null = null;
        const scheduleNextRound = adapterCtx
            ? (broadcast: (msg: string) => void, sendTo: (playerId: string, msg: string) => void) => {
                if (nextRoundTimer) clearTimeout(nextRoundTimer);
                nextRoundTimer = setTimeout(() => {
                    nextRoundTimer = null;
                    adapterCtx.endGameAndPersist(broadcast, sendTo);
                }, BLACKJACK_NEXT_ROUND_DELAY_MS);
                adapterCtx.setGameTimer(() => {
                    if (nextRoundTimer) {
                        clearTimeout(nextRoundTimer);
                        nextRoundTimer = null;
                    }
                });
            }
            : undefined;
        const opts = { scheduleNextRound };
        return {
            messagePrefix: "blackjack:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("blackjack", blackjackClientMessageSchema, json, {
                    operation: "game-room.blackjack-message.decode",
                    component: "blackjack-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                blackjackServer(ref, opts).processMessage(msg as import("~/game/blackjack").BlackjackClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                blackjackServer(ref, opts).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                blackjackServer(ref, opts).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                blackjackServer(ref, opts).removePlayer(playerId, broadcast, sendTo),
            endGame: () => {},
        };
    }

    if (gameType === "yahtzee" || gameType === "lying_yahtzee") {
        const ref = stateRef as { current: import("~/game/yahtzee").YahtzeeState | null };
        const mode = getYahtzeeMode(gameType);
        const opts = { mode };
        return {
            messagePrefix: "yahtzee:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("yahtzee", yahtzeeClientMessageSchema, json, {
                    operation: "game-room.yahtzee-message.decode",
                    component: "yahtzee-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                yahtzeeServer(ref, opts).processMessage(msg as import("~/game/yahtzee").YahtzeeClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                yahtzeeServer(ref, opts).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                yahtzeeServer(ref, opts).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                yahtzeeServer(ref, opts).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                yahtzeeServer(ref, opts).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "perudo") {
        const ref = stateRef as { current: import("~/game/perudo").PerudoState | null };
        return {
            messagePrefix: "perudo:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("perudo", perudoClientMessageSchema, json, {
                    operation: "game-room.perudo-message.decode",
                    component: "perudo-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                perudoServer(ref).processMessage(msg as import("~/game/perudo").PerudoClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                perudoServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                perudoServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                perudoServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                perudoServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "rps") {
        const ref = stateRef as { current: import("~/game/rps").RpsState | null };
        return {
            messagePrefix: "rps:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("rps", rpsClientMessageSchema, json, {
                    operation: "game-room.rps-message.decode",
                    component: "rps-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                rpsServer(ref).processMessage(msg as import("~/game/rps").RpsClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                rpsServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                rpsServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                rpsServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                rpsServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "herd") {
        const ref = stateRef as { current: import("~/game/herd").HerdState | null };
        return {
            messagePrefix: "herd:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("herd", herdClientMessageSchema, json, {
                    operation: "game-room.herd-message.decode",
                    component: "herd-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                herdServer(ref).processMessage(msg as import("~/game/herd").HerdClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                herdServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) =>
                herdServer(ref).initGame(players, requireHostId(hostId, "herd"), broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                herdServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                herdServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "fun_facts") {
        const ref = stateRef as { current: import("~/game/fun-facts").FunFactsState | null };
        return {
            messagePrefix: "fun_facts:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("fun_facts", funFactsClientMessageSchema, json, {
                    operation: "game-room.fun-facts-message.decode",
                    component: "fun-facts-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                funFactsServer(ref).processMessage(msg as import("~/game/fun-facts").FunFactsClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                funFactsServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) =>
                funFactsServer(ref).initGame(players, requireHostId(hostId, "fun_facts"), broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                funFactsServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                funFactsServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "cheese_thief") {
        const ref = stateRef as { current: import("~/game/cheese-thief").CheeseThiefState | null };
        return {
            messagePrefix: "cheese_thief:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("cheese_thief", cheeseThiefClientMessageSchema, json, {
                    operation: "game-room.cheese-thief-message.decode",
                    component: "cheese-thief-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                cheeseThiefServer(ref).processMessage(msg as import("~/game/cheese-thief").CheeseThiefClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                cheeseThiefServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) =>
                cheeseThiefServer(ref).initGame(players, requireHostId(hostId, "cheese_thief"), broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                cheeseThiefServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                cheeseThiefServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "cockroach_poker") {
        const ref = stateRef as { current: import("~/game/cockroach-poker").CockroachPokerState | null };
        return {
            messagePrefix: "cockroach_poker:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("cockroach_poker", cockroachPokerClientMessageSchema, json, {
                    operation: "game-room.cockroach-poker-message.decode",
                    component: "cockroach-poker-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                cockroachPokerServer(ref).processMessage(msg as import("~/game/cockroach-poker").CockroachPokerClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                cockroachPokerServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                cockroachPokerServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                cockroachPokerServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                cockroachPokerServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "flip_7") {
        const ref = stateRef as { current: import("~/game/flip-7").Flip7State | null };
        return {
            messagePrefix: "flip_7:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("flip_7", flip7ClientMessageSchema, json, {
                    operation: "game-room.flip-7-message.decode",
                    component: "flip-7-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                flip7Server(ref).processMessage(msg as import("~/game/flip-7").Flip7ClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                flip7Server(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, hostId, broadcast, sendTo) =>
                flip7Server(ref).initGame(players, requireHostId(hostId, "flip_7"), broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                flip7Server(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                flip7Server(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "skull") {
        const ref = stateRef as { current: import("~/game/skull").SkullState | null };
        return {
            messagePrefix: "skull:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("skull", skullClientMessageSchema, json, {
                    operation: "game-room.skull-message.decode",
                    component: "skull-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                skullServer(ref).processMessage(msg as import("~/game/skull").SkullClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                skullServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                skullServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                skullServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                skullServer(ref).endGame(broadcast, sendTo),

        };
    }

    if (gameType === "spicy") {
        const ref = stateRef as { current: import("~/game/spicy").SpicyState | null };
        return {
            messagePrefix: "spicy:",
            decodeMessage: (json) =>
                decodeGameClientMessageOrNull("spicy", spicyClientMessageSchema, json, {
                    operation: "game-room.spicy-message.decode",
                    component: "spicy-transport",
                }),
            processMessage: (msg, broadcast, sendTo) =>
                spicyServer(ref).processMessage(msg as import("~/game/spicy").SpicyClientMessage, broadcast, sendTo),
            sendStateToPlayer: (playerId, sendTo) =>
                spicyServer(ref).sendStateToPlayer(playerId, sendTo),
            initGame: (players, _hostId, broadcast, sendTo) =>
                spicyServer(ref).initGame(players, broadcast, sendTo),
            removePlayer: (playerId, broadcast, sendTo) =>
                spicyServer(ref).removePlayer(playerId, broadcast, sendTo),
            endGame: (broadcast, sendTo) =>
                spicyServer(ref).endGame(broadcast, sendTo),

        };
    }

    return null;
}
