import type { Effect } from "effect";

type BroadcastFn = (msg: string) => void;
type SendToFn = (playerId: string, msg: string) => void;

export type { BroadcastFn, SendToFn };

export interface GameAdapter {
    messagePrefix: string;
    decodeMessage(json: Record<string, unknown>): Effect.Effect<unknown, never, never>;
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

export interface GameAdapterContext {
    endGameAndPersist: (
        broadcast: BroadcastFn,
        sendTo: SendToFn,
    ) => void;
    setGameTimer: (clearFn: (() => void) | null) => void;
}

export interface GameAdapterRegistration {
    gameTypes: string[];
    create(
        gameType: string,
        stateRef: { current: unknown },
        adapterCtx?: GameAdapterContext,
    ): GameAdapter;
}
