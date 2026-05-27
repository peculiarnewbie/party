import { DurableObject } from "cloudflare:workers";
import { Effect, Schema } from "effect";
import {
    type GameParticipant,
    type GameParticipantStatus,
    type GameState,
    decodeClientMessage,
    encodeServerMessage,
    isPokerGameType,
    server,
} from "~/game";
import {
    createDefaultState,
    ensureSchema,
    loadGameSnapshot,
    loadRoomState,
    persistGameSnapshot as persistSnapshotToStorage,
    persistRoomState as persistRoomStateToStorage,
    type PersistedGameSnapshot,
} from "~/worker/room-storage";
import {
    decodeGameClientMessageOrNull,
    RoomMessageDecodeError,
    formatUnknownError,
} from "~/effect/schema-helpers";
import {
    runObservedPromiseExit,
    runObservedSync,
} from "~/effect/runtime";
import {
    createGameAdapter,
    type GameAdapter,
    type GameAdapterContext,
} from "~/worker/game-adapter";

const HIBERNATION_TIMEOUT_MS = 3 * 60 * 60 * 1000;

export class GameRoom extends DurableObject {
    sessions: Map<WebSocket, { id: string; playerId: string | null }>;
    state: GameState;
    gameStateHolder: { current: unknown };
    clearGameTimer: (() => void) | null;
    ready: Promise<void>;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();
        this.state = createDefaultState();
        this.gameStateHolder = { current: null };
        this.clearGameTimer = null;
        this.ready = this.ctx.blockConcurrencyWhile(async () => {
            const exit = await runObservedPromiseExit(
                ensureSchema(this.ctx).pipe(
                    Effect.andThen(
                        Effect.sync(() => {
                            this.loadPersistedState();
                        }),
                    ),
                ),
                "game-room.snapshot.load",
                this.roomLogContext({
                    component: "game-room",
                    result: "startup",
                }),
            );

            if (exit._tag === "Failure") {
                this.state = createDefaultState();
                this.gameStateHolder.current = null;
            }
        });
    }

    activeAdapter(adapterCtx?: GameAdapterContext): GameAdapter | null {
        const gameType = this.state.activeGameType;
        if (!gameType || gameType === "quiz") return null;
        return createGameAdapter(gameType, this.gameStateHolder, adapterCtx);
    }

    roomId() {
        return this.ctx.id.toString();
    }

    roomLogContext(
        context: {
            component?: string;
            operation?: string;
            gameType?: string | null;
            messageType?: string;
            playerId?: string | null;
            phase?: string;
            sessionCount?: number;
            result?: string;
            errorTag?: string;
            branch?: string;
        } = {},
    ) {
        return {
            roomId: this.roomId(),
            gameType: this.state.activeGameType,
            phase: this.state.phase,
            sessionCount: this.sessions.size,
            ...context,
        };
    }

    applyLoadedSnapshot(snapshot: PersistedGameSnapshot | null) {
        this.gameStateHolder.current = null;

        if (!snapshot) {
            return;
        }

        this.gameStateHolder.current = snapshot.state;
    }

    loadPersistedState() {
        this.state = runObservedSync(
            loadRoomState(this.ctx),
            "game-room.snapshot.load",
            this.roomLogContext({
                component: "room-storage",
                operation: "game-room.snapshot.load",
            }),
        );

        const snapshot = runObservedSync(
            loadGameSnapshot(this.ctx, this.state.activeGameType),
            "game-room.snapshot.load",
            this.roomLogContext({
                component: "room-storage",
                operation: "game-room.snapshot.load",
            }),
        );

        this.applyLoadedSnapshot(snapshot);
    }

    persistRoomState() {
        runObservedSync(
            persistRoomStateToStorage(this.ctx, this.state),
            "game-room.snapshot.persist",
            this.roomLogContext({
                component: "room-storage",
                operation: "game-room.snapshot.persist",
                result: "room_state",
            }),
        );
    }

    getCurrentGameSnapshot(): PersistedGameSnapshot | null {
        const gameType = this.state.activeGameType;
        if (!gameType || gameType === "quiz" || !this.gameStateHolder.current) {
            return null;
        }

        return {
            gameType,
            state: this.gameStateHolder.current,
        } as PersistedGameSnapshot;
    }

    persistGameSnapshot() {
        const snapshot = this.getCurrentGameSnapshot();
        runObservedSync(
            persistSnapshotToStorage(this.ctx, snapshot),
            "game-room.snapshot.persist",
            this.roomLogContext({
                component: "room-storage",
                operation: "game-room.snapshot.persist",
                result: snapshot ? "snapshot" : "snapshot_cleared",
            }),
        );
    }

    persistAllState() {
        this.persistRoomState();
        this.persistGameSnapshot();
    }

    async scheduleHibernationCleanup() {
        await this.ctx.storage.setAlarm(Date.now() + HIBERNATION_TIMEOUT_MS);
    }

    async clearHibernationCleanup() {
        await this.ctx.storage.deleteAlarm();
    }

    resetRoom() {
        this.clearGameTimer?.();
        this.clearGameTimer = null;
        this.gameStateHolder.current = null;
        this.state = createDefaultState();
    }

    async hibernateRoom() {
        if (this.state.phase !== "playing") {
            return;
        }

        this.clearGameTimer?.();
        this.clearGameTimer = null;
        this.state.phase = "hibernated";
        this.persistAllState();
        await this.scheduleHibernationCleanup();
    }

    async restartRoom() {
        this.resetRoom();
        await this.clearHibernationCleanup();
        this.persistAllState();
    }

    getGameParticipant(playerId: string) {
        return (
            this.state.gameParticipants.find(
                (participant) => participant.playerId === playerId,
            ) ?? null
        );
    }

    setGameParticipantStatus(
        playerId: string,
        status: GameParticipantStatus,
    ): boolean {
        const participant = this.getGameParticipant(playerId);
        if (!participant || participant.status === status) {
            return false;
        }

        participant.status = status;
        return true;
    }

    async alarm() {
        await this.ready;

        if (this.state.phase !== "hibernated") {
            return;
        }

        if (this.sessions.size > 0) {
            await this.scheduleHibernationCleanup();
            return;
        }

        this.resetRoom();
        await this.ctx.storage.deleteAll();
        runObservedSync(
            ensureSchema(this.ctx),
            "game-room.snapshot.persist",
            this.roomLogContext({
                component: "room-storage",
                operation: "game-room.snapshot.persist",
                result: "alarm-reset",
            }),
        );
    }

    roomStateMessage() {
        return encodeServerMessage({
            type: "room_state",
            data: server(this.state).getRoomState(),
        });
    }

    async fetch(request: Request): Promise<Response> {
        await this.ready;

        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);

        serverWs.accept();

        const id = crypto.randomUUID();
        this.sessions.set(serverWs, { id, playerId: null });

        const sendRoomStateToSocket = (ws: WebSocket) => {
            ws.send(this.roomStateMessage());
        };

        const broadcast = (msg: string) => {
            this.sessions.forEach((_, ws) => ws.send(msg));
        };

        const broadcastRoomState = () => {
            broadcast(this.roomStateMessage());
        };

        const sendTo = (playerId: string, msg: string) => {
            this.sessions.forEach((session, ws) => {
                if (session.playerId === playerId) ws.send(msg);
            });
        };

        const getStoredPlayerName = (playerId: string) =>
            this.state.players.find((player) => player.id === playerId)?.name ??
            "";

        const canManageHibernatedRoom = (playerId: string) => {
            const participant = this.getGameParticipant(playerId);
            return participant !== null && participant.status !== "left_game";
        };

        const activateConnectedParticipants = () => {
            this.sessions.forEach((session) => {
                if (!session.playerId) {
                    return;
                }

                const participant = this.getGameParticipant(session.playerId);
                if (!participant || participant.status === "left_game") {
                    return;
                }

                participant.status = "active";
            });
        };

        const rehydrateConnectedParticipants = () => {
            this.sessions.forEach((session) => {
                if (!session.playerId) {
                    return;
                }

                const participant = this.getGameParticipant(session.playerId);
                if (!participant || participant.status !== "active") {
                    return;
                }

                this.rehydratePlayerGameState(
                    session.playerId,
                    getStoredPlayerName(session.playerId),
                    broadcast,
                    sendTo,
                    adapterCtx,
                );
            });
        };

        const adapterCtx: GameAdapterContext = {
            endGameAndPersist: (broadcast, sendTo) => {
                const adapter = this.activeAdapter(adapterCtx);
                if (adapter) {
                    adapter.endGame(broadcast, sendTo);
                }
                this.persistGameSnapshot();
            },
            setGameTimer: (clearFn) => {
                this.clearGameTimer = clearFn;
            },
        };

        sendRoomStateToSocket(serverWs);

        serverWs.addEventListener("message", (event) => {
            const raw = event.data as string;

            const program = Effect.gen(() =>
                (function* (this: GameRoom) {
                const json = yield* Effect.try({
                    try: () =>
                        Schema.decodeUnknownSync(
                            Schema.UnknownFromJsonString,
                        )(raw) as Record<string, unknown>,
                    catch: (error) =>
                        new RoomMessageDecodeError({
                            issue: formatUnknownError(error),
                        }),
                }).pipe(
                    Effect.catchTag("RoomMessageDecodeError", (error) =>
                        Effect.gen(function*() {
                            yield* Effect.logWarning(
                                "game-room.message.invalid-json",
                            ).pipe(
                                Effect.annotateLogs({
                                    component: "game-room",
                                    result: "ignored",
                                    errorTag: error._tag,
                                }),
                            );
                            return null;
                        }),
                    ),
                );

                if (!json) {
                    return;
                }

                const messageType =
                    typeof json.type === "string" ? json.type : undefined;
                const messagePlayerId =
                    typeof json.playerId === "string" ? json.playerId : null;

                yield* Effect.annotateCurrentSpan({
                    messageType: messageType ?? "unknown",
                    playerId: messagePlayerId ?? "",
                });

                const isSharedMessage =
                    typeof messageType === "string" &&
                    !messageType.includes(":");

                const sharedMessage = isSharedMessage
                    ? yield* decodeClientMessage(json).pipe(
                          Effect.tap(() =>
                              Effect.logInfo("game-room.room-message.decode").pipe(
                                  Effect.annotateLogs({
                                      component: "game-room",
                                      operation: "game-room.room-message.decode",
                                      result: "success",
                                  }),
                              ),
                          ),
                          Effect.catchTag("RoomMessageDecodeError", (error) =>
                              Effect.gen(function*() {
                                  yield* Effect.logWarning(
                                      "game-room.room-message.decode",
                                  ).pipe(
                                      Effect.annotateLogs({
                                          component: "game-room",
                                          operation:
                                              "game-room.room-message.decode",
                                          result: "ignored",
                                          errorTag: error._tag,
                                      }),
                                  );
                                  return null;
                              }),
                          ),
                      )
                    : null;

                if (
                    sharedMessage &&
                    (sharedMessage.type === "identify" ||
                        sharedMessage.type === "join")
                ) {
                    const session = this.sessions.get(serverWs);
                    if (session) {
                        session.playerId = sharedMessage.playerId;
                    }
                }

                if (sharedMessage?.type === "identify") {
                    const participant = this.getGameParticipant(
                        sharedMessage.playerId,
                    );
                    const didChange =
                        this.state.phase !== "hibernated" &&
                        participant?.status === "disconnected" &&
                        this.setGameParticipantStatus(
                            sharedMessage.playerId,
                            "active",
                        );

                    if (didChange) {
                        this.persistRoomState();
                        broadcastRoomState();
                    }

                    sendRoomStateToSocket(serverWs);

                    if (this.state.phase === "hibernated") {
                        yield* Effect.logInfo(
                            "game-room.message.processed",
                        ).pipe(
                            Effect.annotateLogs({
                                component: "game-room",
                                branch: "identify",
                                result: "hibernated",
                            }),
                        );
                        return;
                    }

                    this.rehydratePlayerGameState(
                        sharedMessage.playerId,
                        sharedMessage.playerName ||
                            getStoredPlayerName(sharedMessage.playerId),
                        broadcast,
                        sendTo,
                        adapterCtx,
                    );
                    this.persistGameSnapshot();
                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "identify",
                            result: "ok",
                        }),
                    );
                    return;
                }

                if (this.state.phase === "hibernated") {
                    if (sharedMessage?.type === "resume_room") {
                        if (!canManageHibernatedRoom(sharedMessage.playerId)) {
                            sendRoomStateToSocket(serverWs);
                            return;
                        }

                        yield* Effect.promise(() =>
                            this.clearHibernationCleanup(),
                        );
                        this.state.phase = "playing";
                        activateConnectedParticipants();
                        this.persistRoomState();
                        broadcastRoomState();
                        rehydrateConnectedParticipants();
                        this.persistGameSnapshot();
                        yield* Effect.logInfo("game-room.message.processed").pipe(
                            Effect.annotateLogs({
                                component: "game-room",
                                branch: "resume_room",
                                result: "ok",
                            }),
                        );
                        return;
                    }

                    if (sharedMessage?.type === "restart_room") {
                        if (!canManageHibernatedRoom(sharedMessage.playerId)) {
                            sendRoomStateToSocket(serverWs);
                            return;
                        }

                        yield* Effect.promise(() => this.restartRoom());
                        broadcastRoomState();
                        yield* Effect.logInfo("game-room.message.processed").pipe(
                            Effect.annotateLogs({
                                component: "game-room",
                                branch: "restart_room",
                                result: "ok",
                            }),
                        );
                        return;
                    }

                    sendRoomStateToSocket(serverWs);
                    return;
                }

                // Game-specific message routing via adapter
                const adapter = this.activeAdapter(adapterCtx);
                if (
                    adapter &&
                    typeof messageType === "string" &&
                    messageType.startsWith(adapter.messagePrefix)
                ) {
                    const parsed = yield* adapter.decodeMessage(json);
                    if (!parsed) return;

                    adapter.processMessage(parsed, broadcast, sendTo);
                    this.persistGameSnapshot();
                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: this.state.activeGameType ?? "unknown",
                            result: "ok",
                        }),
                    );
                    return;
                }

                if (!sharedMessage) {
                    return;
                }

                const wasPoker = isPokerGameType(this.state.activeGameType);
                const currentPokerState =
                    wasPoker ? this.gameStateHolder.current as import("~/game/poker").PokerState | null : null;
                const wasSeatedPokerPlayer =
                    wasPoker &&
                    !!currentPokerState?.players?.some(
                        (player: { id: string }) => player.id === sharedMessage.playerId,
                    );

                const processResult = yield* Effect.promise(() =>
                    server(this.state).processClientMessage(
                        sharedMessage,
                        broadcast,
                        {
                            createGameSession: () => ({
                                gameSessionId: crypto.randomUUID(),
                                participants: this.state.players.map(
                                    (player) => ({
                                        playerId: player.id,
                                        status: "active",
                                    }),
                                ),
                            }),
                        },
                    ),
                );

                if (
                    sharedMessage.type === "join" &&
                    this.state.phase === "playing"
                ) {
                    const participant = this.getGameParticipant(
                        sharedMessage.playerId,
                    );
                    if (participant?.status === "disconnected") {
                        this.setGameParticipantStatus(
                            sharedMessage.playerId,
                            "active",
                        );
                        broadcastRoomState();
                    }

                    const joinAdapter = this.activeAdapter(adapterCtx);
                    const isReconnect = !!participant || wasSeatedPokerPlayer;

                    if (joinAdapter?.onPlayerJoin) {
                        joinAdapter.onPlayerJoin(
                            sharedMessage.playerId,
                            sharedMessage.playerName,
                            isReconnect,
                            broadcast,
                            sendTo,
                        );
                    } else if (participant) {
                        this.rehydratePlayerGameState(
                            sharedMessage.playerId,
                            sharedMessage.playerName,
                            broadcast,
                            sendTo,
                            adapterCtx,
                        );
                    }
                }

                if (processResult.kind === "start") {
                    yield* Effect.promise(() =>
                        this.clearHibernationCleanup(),
                    );
                    this.clearGameTimer?.();
                    this.clearGameTimer = null;
                    this.gameStateHolder.current = null;

                    const gameAdapter = createGameAdapter(
                        processResult.gameType,
                        this.gameStateHolder,
                    );

                    if (gameAdapter) {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        gameAdapter.initGame(
                            players,
                            this.state.hostId,
                            broadcast,
                            sendTo,
                        );
                    }

                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "shared",
                            result: "start",
                        }),
                    );

                    this.persistAllState();
                    return;
                }

                if (processResult.kind === "end") {
                    if (processResult.gameType) {
                        const endAdapter = createGameAdapter(
                            processResult.gameType,
                            this.gameStateHolder,
                        );
                        if (endAdapter) {
                            this.clearGameTimer?.();
                            this.clearGameTimer = null;
                            endAdapter.endGame(broadcast, sendTo);
                        }
                    }

                    this.persistAllState();
                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "shared",
                            result: "end",
                        }),
                    );
                    return;
                }

                if (processResult.kind === "leave_game") {
                    const leaveAdapter = this.activeAdapter(adapterCtx);
                    if (leaveAdapter) {
                        leaveAdapter.removePlayer(
                            processResult.playerId,
                            broadcast,
                            sendTo,
                        );
                    }
                    this.persistAllState();
                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "shared",
                            result: "leave_game",
                        }),
                    );
                    return;
                }

                if (processResult.kind === "return_to_lobby") {
                    yield* Effect.promise(() => this.clearHibernationCleanup());
                    this.clearGameTimer?.();
                    this.clearGameTimer = null;
                    this.gameStateHolder.current = null;
                    this.persistAllState();
                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "shared",
                            result: "return_to_lobby",
                        }),
                    );
                    return;
                }

                this.persistRoomState();
                if (sharedMessage.type === "join") {
                    this.persistGameSnapshot();
                }
                yield* Effect.logInfo("game-room.message.processed").pipe(
                    Effect.annotateLogs({
                        component: "game-room",
                        branch: "shared",
                        result: "ok",
                    }),
                );
                }).call(this),
            );

            void runObservedPromiseExit(
                program as Effect.Effect<void, unknown, never>,
                "game-room.socket.message",
                this.roomLogContext({
                    component: "game-room",
                }),
            );
        });

        serverWs.addEventListener("close", () => {
            void (async () => {
                const session = this.sessions.get(serverWs);
                this.sessions.delete(serverWs);

                let didChange = false;
                if (session?.playerId) {
                    didChange = this.setGameParticipantStatus(
                        session.playerId,
                        "disconnected",
                    );

                    if (didChange && isPokerGameType(this.state.activeGameType)) {
                        const adapter = this.activeAdapter(adapterCtx);
                        if (adapter) {
                            adapter.removePlayer(
                                session.playerId,
                                broadcast,
                                sendTo,
                            );
                        }
                    }
                }

                if (
                    this.sessions.size === 0 &&
                    this.state.phase === "playing"
                ) {
                    await this.hibernateRoom();
                    return;
                }

                if (!didChange) {
                    return;
                }

                this.persistAllState();
                broadcastRoomState();
            })();
        });

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    private rehydratePlayerGameState(
        playerId: string,
        playerName: string,
        broadcast: (msg: string) => void,
        sendTo: (playerId: string, msg: string) => void,
        adapterCtx?: GameAdapterContext,
    ) {
        const participant = this.getGameParticipant(playerId);
        const isRoomPlayer = this.state.players.some(
            (player) => player.id === playerId,
        );

        if (participant?.status === "left_game") {
            return;
        }

        const adapter = this.activeAdapter(adapterCtx);
        if (!adapter) return;

        if (adapter.onPlayerJoin) {
            const isReconnect = !!participant;
            adapter.onPlayerJoin(playerId, playerName, isReconnect, broadcast, sendTo);
            return;
        }

        if (participant || isRoomPlayer) {
            adapter.sendStateToPlayer(playerId, sendTo);
        }
    }
}
