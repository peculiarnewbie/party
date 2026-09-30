import { getTableView as getSixNimmtTableView } from "~/game/six-nimmt/views";
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
    deletePlayerCapability,
    ensureSchema,
    loadGameSnapshot,
    loadPlayerCapabilityHash,
    loadRoomState,
    persistPlayerCapabilityHash,
    persistGameSnapshot as persistSnapshotToStorage,
    persistRoomState as persistRoomStateToStorage,
    type PersistedGameSnapshot,
} from "~/worker/room-storage";
import {
    decodeGameClientMessageOrNull,
    RoomMessageDecodeError,
    formatUnknownError,
} from "~/effect/schema-helpers";
import { runObservedPromiseExit, runObservedSync } from "~/effect/runtime";
import {
    createGameAdapter,
    type GameAdapter,
    type GameAdapterContext,
} from "~/worker/game-adapter";
import {
    createPlayerCapability,
    hashPlayerCapability,
    verifyPlayerCapability,
} from "~/worker/player-capability";

import { makeRpsRpcHandler } from "./rps-rpc";
import { RpsRequestError, rpsCommandSchema } from "~/game/rps/rpc";
import {
    rpsServerMessageSchema,
    type RpsServerMessage,
} from "~/game/rps/schemas";
import type { RpsClientMessage } from "~/game/rps/messages";
import { getPokerTableView } from "~/game/poker/table-view";
import {
    displayMessageSchema,
    type DisplayState,
} from "~/room/display-protocol";

import { getFlip7TableView } from "~/game/flip-7/table-view";
import { getBlackjackTableView } from "~/game/blackjack/table-view";
import { getPerudoTableView } from "~/game/perudo/table-view";
import { getHerdTableView } from "~/game/herd/table-view";
import { getFunFactsTableView } from "~/game/fun-facts/table-view";
import { getCheeseThiefTableView } from "~/game/cheese-thief/table-view";

const HIBERNATION_TIMEOUT_MS = 3 * 60 * 60 * 1000;
const MAX_WEBSOCKET_MESSAGE_BYTES = 64 * 1024;

type RoomSession = {
    id: string;
    playerId: string | null;
    authenticated: boolean;
    lastSeen?: number;
};

function isRoomSession(value: unknown): value is RoomSession {
    if (typeof value !== "object" || value === null) {
        return false;
    }

    const session = value as Record<string, unknown>;
    return (
        typeof session.id === "string" &&
        typeof session.authenticated === "boolean" &&
        ((session.authenticated && typeof session.playerId === "string") ||
            (!session.authenticated && session.playerId === null))
    );
}

export class GameRoom extends DurableObject {
    sessions: Map<WebSocket, RoomSession>;
    displaySockets: Set<WebSocket>;
    playerSockets: Map<string, Set<WebSocket>>;
    state: GameState;
    gameStateHolder: { current: unknown };
    clearGameTimer: (() => void) | null;
    ready: Promise<void>;
    cachedAdapter: GameAdapter | null;
    cachedAdapterGameType: string | null;
    messageQueue: Promise<void>;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();
        this.displaySockets = new Set();
        this.playerSockets = new Map();
        this.state = createDefaultState();
        this.gameStateHolder = { current: null };
        this.clearGameTimer = null;
        this.cachedAdapter = null;
        this.cachedAdapterGameType = null;
        this.messageQueue = Promise.resolve();
        for (const ws of this.ctx.getWebSockets()) {
            const attachment = ws.deserializeAttachment();
            if (attachment?.role === "display") {
                this.displaySockets.add(ws);
                continue;
            }
            if (!isRoomSession(attachment)) {
                ws.close(1011, "Invalid room session");
                continue;
            }

            this.sessions.set(ws, attachment);
            if (attachment.authenticated && attachment.playerId) {
                this.bindSessionToPlayer(ws, attachment, attachment.playerId);
            }
        }
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
                return;
            }
            if (
                this.state.phase === "hibernated" &&
                this.state.recovery.cleanupAt === null
            ) {
                this.state.recovery.cleanupAt =
                    (await this.ctx.storage.getAlarm()) ??
                    Date.now() + HIBERNATION_TIMEOUT_MS;
            }
            for (const player of this.state.players) {
                if (!this.playerSockets.has(player.id))
                    this.markPlayerOffline(player.id);
            }
            if (
                this.state.phase === "playing" &&
                !this.hasConnectedParticipants()
            )
                await this.hibernateRoom();
            this.persistAllState();
            await this.scheduleAlarm();
        });
    }

    activeAdapter(adapterCtx?: GameAdapterContext): GameAdapter | null {
        const gameType = this.state.activeGameType;
        if (!gameType || gameType === "quiz") return null;

        if (this.cachedAdapter && this.cachedAdapterGameType === gameType) {
            return this.cachedAdapter;
        }

        const adapter = createGameAdapter(
            gameType,
            this.gameStateHolder,
            adapterCtx,
        );
        this.cachedAdapter = adapter;
        this.cachedAdapterGameType = gameType;
        return adapter;
    }

    clearCachedAdapter() {
        this.clearGameTimer?.();
        this.clearGameTimer = null;
        this.cachedAdapter = null;
        this.cachedAdapterGameType = null;
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
        this.broadcastDisplayState();
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
        this.broadcastDisplayState();
    }

    displayStateMessage() {
        const snapshot = this.getCurrentGameSnapshot();
        let game: DisplayState["game"] = null;
        if (this.state.phase === "playing") {
            switch (snapshot?.gameType) {
                case "cheese_thief":
                    game = { type: "cheese_thief", view: getCheeseThiefTableView(snapshot.state) };
                    break;
                case "herd":
                    game = { type: "herd", view: getHerdTableView(snapshot.state) };
                    break;
                case "fun_facts":
                    game = { type: "fun_facts", view: getFunFactsTableView(snapshot.state) };
                    break;
                case "six_nimmt":
                    game = { type: "six_nimmt", view: getSixNimmtTableView(snapshot.state) };
                    break;
                case "flip_7":
                    game = {
                        type: "flip_7",
                        view: getFlip7TableView(snapshot.state),
                    };
                    break;
                case "blackjack":
                    game = {
                        type: "blackjack",
                        view: getBlackjackTableView(snapshot.state),
                    };
                    break;
                case "perudo":
                    game = {
                        type: "perudo",
                        view: getPerudoTableView(snapshot.state),
                    };
                    break;
            }
        }
        const data: DisplayState = {
            game,
            recovery: this.state.recovery,
            phase: this.state.phase,
            selectedGameType: this.state.selectedGameType,
            activeGameType: this.state.activeGameType,
            players: this.state.players.map(({ id, name }) => ({ id, name })),
            poker:
                this.state.phase === "playing" &&
                (snapshot?.gameType === "poker" ||
                    snapshot?.gameType === "backwards_poker")
                    ? getPokerTableView(snapshot.state)
                    : null,
        };
        return JSON.stringify(
            Schema.encodeSync(displayMessageSchema)({
                type: "display:state",
                data,
            }),
        );
    }

    broadcastDisplayState() {
        if (this.displaySockets.size === 0) return;
        const message = this.displayStateMessage();
        for (const socket of this.displaySockets) {
            try {
                socket.send(message);
            } catch {
                this.displaySockets.delete(socket);
            }
        }
    }

    persistAllState() {
        this.persistRoomState();
        this.persistGameSnapshot();
    }

    async scheduleHibernationCleanup() {
        this.state.recovery.cleanupAt = Date.now() + HIBERNATION_TIMEOUT_MS;
        this.persistRoomState();
        await this.scheduleAlarm();
    }

    async clearHibernationCleanup() {
        this.state.recovery.cleanupAt = null;
        this.persistRoomState();
        await this.scheduleAlarm();
    }

    resetRoom() {
        this.clearCachedAdapter();
        this.gameStateHolder.current = null;
        this.state = createDefaultState();
    }

    async hibernateRoom() {
        if (this.state.phase !== "playing") {
            return;
        }

        this.clearCachedAdapter();
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

    bindSessionToPlayer(ws: WebSocket, session: RoomSession, playerId: string) {
        session.playerId = playerId;
        session.authenticated = true;
        ws.serializeAttachment(session);
        const sockets = this.playerSockets.get(playerId);
        if (sockets) {
            sockets.add(ws);
            return;
        }
        this.playerSockets.set(playerId, new Set([ws]));
    }

    revokePlayerSessions(playerId: string) {
        const sockets = this.playerSockets.get(playerId);
        if (!sockets) return;

        this.playerSockets.delete(playerId);
        for (const ws of sockets) {
            const session = this.sessions.get(ws);
            if (!session) continue;
            session.playerId = null;
            session.authenticated = false;
            ws.serializeAttachment(session);
        }
    }

    removeSession(ws: WebSocket): RoomSession | null {
        const session = this.sessions.get(ws) ?? null;
        this.sessions.delete(ws);

        if (!session?.playerId) {
            return session;
        }

        const sockets = this.playerSockets.get(session.playerId);
        sockets?.delete(ws);
        if (sockets?.size === 0) {
            this.playerSockets.delete(session.playerId);
        }

        return session;
    }

    private sendSocket(ws: WebSocket, message: string) {
        try {
            ws.send(message);
        } catch {
            const work = this.messageQueue.then(() =>
                this.handleSocketDisconnect(ws),
            );
            this.messageQueue = work.catch(() => undefined);
            this.ctx.waitUntil(work);
        }
    }

    broadcast(msg: string) {
        this.sessions.forEach((_, ws) => this.sendSocket(ws, msg));
    }

    sendTo(playerId: string, msg: string) {
        this.playerSockets
            .get(playerId)
            ?.forEach((ws) => this.sendSocket(ws, msg));
    }

    createSocketOperations() {
        const broadcast = (msg: string) => this.broadcast(msg);
        const sendTo = (playerId: string, msg: string) =>
            this.sendTo(playerId, msg);
        const broadcastRoomState = () => {
            broadcast(this.roomStateMessage());
        };
        const sendRoomStateToSocket = (ws: WebSocket) => {
            ws.send(this.roomStateMessage());
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
                if (
                    !participant ||
                    participant.status === "left_game" ||
                    participant.status === "sitting_out"
                ) {
                    return;
                }

                participant.status = "active";
            });
        };

        let getAdapter: () => GameAdapter | null;
        const adapterCtx: GameAdapterContext = {
            endGameAndPersist: (broadcast, sendTo) => {
                const adapter = getAdapter();
                if (adapter) {
                    adapter.endGame(broadcast, sendTo);
                }
                this.persistGameSnapshot();
            },
            persistGameSnapshot: () => {
                this.persistGameSnapshot();
            },
            getHostPlayerId: () => this.state.hostId,
            setGameTimer: (clearFn) => {
                this.clearGameTimer = clearFn;
            },
        };
        getAdapter = () => {
            const adapter = this.activeAdapter(adapterCtx);
            adapter?.resumeGame?.(broadcast, sendTo);
            return adapter;
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

        return {
            activateConnectedParticipants,
            adapterCtx,
            broadcast,
            broadcastRoomState,
            canManageHibernatedRoom,
            getAdapter,
            getStoredPlayerName,
            rehydrateConnectedParticipants,
            sendRoomStateToSocket,
            sendTo,
        };
    }

    async scheduleAlarm() {
        const deadlines =
            this.state.phase === "hibernated"
                ? [this.state.recovery.cleanupAt]
                : this.state.recovery.offline
                      .filter((entry) => entry.status === "waiting")
                      .map((entry) => entry.deadline);
        for (const session of this.sessions.values()) {
            if (session.lastSeen !== undefined)
                deadlines.push(session.lastSeen + 90_000);
        }
        const times = deadlines.filter((time): time is number => time !== null);
        const next = times.length ? Math.min(...times) : null;
        if (next === null) await this.ctx.storage.deleteAlarm();
        else if ((await this.ctx.storage.getAlarm()) !== next)
            await this.ctx.storage.setAlarm(next);
    }

    hasConnectedParticipants() {
        return this.state.gameParticipants.some(
            (participant) =>
                participant.status !== "left_game" &&
                participant.status !== "sitting_out" &&
                this.playerSockets.has(participant.playerId),
        );
    }

    transferOfflineHost() {
        const hostOffline = this.state.recovery.offline.find(
            (entry) => entry.playerId === this.state.hostId,
        );
        const hostExists = this.state.players.some(
            (player) => player.id === this.state.hostId,
        );
        if (hostExists && hostOffline?.status !== "expired") return;
        const connected = this.state.players.filter((player) =>
            this.playerSockets.has(player.id),
        );
        const next =
            connected.find(
                (player) =>
                    this.getGameParticipant(player.id)?.status === "active",
            ) ?? connected[0];
        if (!next) return;
        this.state.hostId = next.id;
        const snapshot = this.getCurrentGameSnapshot();
        if (snapshot && "hostId" in snapshot.state)
            snapshot.state.hostId = next.id;
        const { adapterCtx, sendTo } = this.createSocketOperations();
        const adapter = this.activeAdapter(adapterCtx);
        adapter?.setHost?.(next.id);
        for (const playerId of this.playerSockets.keys())
            adapter?.sendStateToPlayer(playerId, sendTo);
    }

    expireDisconnectedPlayer(playerId: string) {
        const entry = this.state.recovery.offline.find(
            (entry) => entry.playerId === playerId,
        );
        if (
            !entry ||
            entry.status !== "waiting" ||
            this.playerSockets.has(playerId)
        )
            return;
        const participant = this.getGameParticipant(playerId);
        if (
            this.state.phase === "playing" &&
            participant?.status === "disconnected"
        ) {
            const { broadcast, sendTo, getAdapter } =
                this.createSocketOperations();
            const adapter = getAdapter();
            if (isPokerGameType(this.state.activeGameType)) {
                adapter?.expireDisconnect?.(playerId, broadcast, sendTo);
            } else {
                adapter?.removePlayer(playerId, broadcast, sendTo);
                participant.status = "sitting_out";
            }
        }
        this.state.recovery.offline = this.state.recovery.offline.map(
            (current) =>
                current.playerId === playerId
                    ? { ...current, status: "expired", deadline: null }
                    : current,
        );
        this.transferOfflineHost();
    }

    async alarm() {
        await this.ready;
        const work = this.messageQueue.then(() => this.processAlarm());
        this.messageQueue = work.catch(() => undefined);
        await work;
    }

    private async processAlarm() {
        const now = Date.now();
        for (const [socket, session] of this.sessions) {
            if (
                session.lastSeen !== undefined &&
                session.lastSeen + 90_000 <= now
            ) {
                await this.handleSocketDisconnect(socket);
                socket.close(4000, "Connection timed out");
            }
        }
        if (this.state.phase === "hibernated") {
            if (
                this.state.recovery.cleanupAt !== null &&
                this.state.recovery.cleanupAt <= now
            ) {
                if (this.playerSockets.size > 0) {
                    await this.scheduleHibernationCleanup();
                } else {
                    this.resetRoom();
                    await this.ctx.storage.deleteAll();
                    runObservedSync(
                        ensureSchema(this.ctx),
                        "game-room.snapshot.persist",
                        this.roomLogContext(),
                    );
                    this.persistAllState();
                    this.broadcast(this.roomStateMessage());
                }
            }
        } else {
            for (const entry of this.state.recovery.offline) {
                if (
                    entry.status === "waiting" &&
                    entry.deadline !== null &&
                    entry.deadline <= now
                ) {
                    this.expireDisconnectedPlayer(entry.playerId);
                }
            }
            this.persistAllState();
            this.broadcast(this.roomStateMessage());
        }
        await this.scheduleAlarm();
    }

    roomStateMessage() {
        return encodeServerMessage({
            type: "room_state",
            data: server(this.state).getRoomState(),
        });
    }

    private rpsRpc(request: Request): Promise<Response> {
        const playerId = request.headers.get("X-Player-Id") ?? "";
        const token =
            request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
        const room = this;
        const authenticate = Effect.fn("Room.authenticateRps")(function* (
            gameSessionId: string,
        ) {
            const hash = yield* loadPlayerCapabilityHash(
                room.ctx,
                playerId,
            ).pipe(Effect.orDie);
            if (
                !hash ||
                !(yield* Effect.promise(() =>
                    verifyPlayerCapability(token, hash),
                ))
            ) {
                return yield* new RpsRequestError({
                    reason: "unauthorized",
                    message: "Reconnect to the room to play.",
                });
            }
            if (
                room.state.gameSessionId !== gameSessionId ||
                room.state.activeGameType !== "rps" ||
                room.state.phase !== "playing"
            ) {
                return yield* new RpsRequestError({
                    reason: "stale_session",
                    message: "This game has ended. Reconnect to the room.",
                });
            }
            const player = room.state.players.find(
                (entry) => entry.id === playerId,
            );
            if (
                !player ||
                room.getGameParticipant(playerId)?.status !== "active"
            ) {
                return yield* new RpsRequestError({
                    reason: "unauthorized",
                    message: "Join this game before playing.",
                });
            }
            return player;
        });
        const execute = (
            message: RpsClientMessage,
            receipt?: { id: string; payload: string },
        ) =>
            Effect.try({
                try: () => {
                    const sql = room.ctx.storage.sql;
                    sql.exec(
                        "CREATE TABLE IF NOT EXISTS rps_rpc_receipts (session_id TEXT NOT NULL, player_id TEXT NOT NULL, command_id TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(session_id, player_id, command_id))",
                    );
                    if (receipt) {
                        const previous = sql
                            .exec<{
                                payload: string;
                            }>(
                                "SELECT payload FROM rps_rpc_receipts WHERE session_id = ? AND player_id = ? AND command_id = ?",
                                room.state.gameSessionId,
                                playerId,
                                receipt.id,
                            )
                            .toArray()[0];
                        if (previous) {
                            if (previous.payload !== receipt.payload)
                                throw new RpsRequestError({
                                    reason: "rejected",
                                    message:
                                        "Command identifier was already used.",
                                });
                            return [];
                        }
                    }
                    const outgoing: { playerId?: string; raw: string }[] = [];
                    const replies: RpsServerMessage[] = [];
                    const { getAdapter } = room.createSocketOperations();
                    const adapter = getAdapter();
                    if (!adapter) throw new Error("RPS adapter unavailable");
                    room.ctx.storage.transactionSync(() => {
                        adapter.processMessage(
                            message,
                            (raw) => outgoing.push({ raw }),
                            (target, raw) => {
                                const decoded = Schema.decodeUnknownSync(
                                    rpsServerMessageSchema,
                                )(JSON.parse(raw));
                                if (target === playerId) {
                                    if (decoded.type === "rps:error")
                                        throw new RpsRequestError({
                                            reason: "rejected",
                                            message: decoded.data.message,
                                        });
                                    replies.push(decoded);
                                }
                                outgoing.push({ playerId: target, raw });
                            },
                        );
                        Effect.runSync(
                            persistSnapshotToStorage(
                                room.ctx,
                                room.getCurrentGameSnapshot(),
                            ),
                        );
                        if (receipt) {
                            sql.exec(
                                "DELETE FROM rps_rpc_receipts WHERE session_id != ?",
                                room.state.gameSessionId,
                            );
                            sql.exec(
                                "INSERT INTO rps_rpc_receipts VALUES (?, ?, ?, ?)",
                                room.state.gameSessionId,
                                playerId,
                                receipt.id,
                                receipt.payload,
                            );
                        }
                    });
                    for (const entry of outgoing) {
                        if (entry.playerId)
                            room.sendTo(entry.playerId, entry.raw);
                        else room.broadcast(entry.raw);
                    }
                    return replies;
                },
                catch: (error) => {
                    room.clearCachedAdapter();
                    room.loadPersistedState();
                    return error instanceof RpsRequestError
                        ? error
                        : new RpsRequestError({
                              reason: "unavailable",
                              message:
                                  "The move could not be completed. Reconnect to resynchronize.",
                          });
                },
            });
        return makeRpsRpcHandler({
            command: Effect.fn("Room.rpsCommand")(function* (input) {
                const player = yield* authenticate(input.gameSessionId);
                const command = Schema.decodeUnknownSync(rpsCommandSchema)(
                    input.command,
                );
                yield* execute(
                    { ...command, playerId, playerName: player.name },
                    { id: input.commandId, payload: JSON.stringify(command) },
                );
            }),
            sync: Effect.fn("Room.rpsSync")(function* (input) {
                const player = yield* authenticate(input.gameSessionId);
                const replies = yield* execute({
                    type: "rps:sync",
                    data: input,
                    playerId,
                    playerName: player.name,
                });
                const sync = replies.find(
                    (entry) => entry.type === "rps:sync_response",
                );
                if (!sync)
                    return yield* new RpsRequestError({
                        reason: "unavailable",
                        message: "Game state is unavailable.",
                    });
                return sync;
            }),
        })(request);
    }

    async fetch(request: Request): Promise<Response> {
        await this.ready;
        if (/\/rpc\/?$/.test(new URL(request.url).pathname)) {
            if (request.method !== "POST")
                return new Response("Method not allowed", { status: 405 });
            if (request.headers.get("Origin") !== new URL(request.url).origin)
                return new Response("Origin not allowed", { status: 403 });
            if (
                !request.headers
                    .get("Content-Type")
                    ?.startsWith("application/json")
            )
                return new Response("Expected JSON", { status: 415 });
            const work = this.messageQueue.then(() => this.rpsRpc(request));
            this.messageQueue = work.then(
                () => undefined,
                () => undefined,
            );
            return work;
        }

        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);

        this.ctx.acceptWebSocket(serverWs);

        if (new URL(request.url).searchParams.get("view") === "display") {
            serverWs.serializeAttachment({ role: "display" });
            this.displaySockets.add(serverWs);
            serverWs.send(this.displayStateMessage());
            return new Response(null, { status: 101, webSocket: client });
        }

        const session: RoomSession = {
            id: crypto.randomUUID(),
            playerId: null,
            authenticated: false,
        };
        serverWs.serializeAttachment(session);
        this.sessions.set(serverWs, session);

        serverWs.send(this.roomStateMessage());

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async webSocketMessage(serverWs: WebSocket, message: string | ArrayBuffer) {
        const work = this.messageQueue.then(() =>
            this.processWebSocketMessage(serverWs, message),
        );
        this.messageQueue = work.catch(() => undefined);
        await work;
    }

    private async processWebSocketMessage(
        serverWs: WebSocket,
        message: string | ArrayBuffer,
    ) {
        await this.ready;
        if (this.displaySockets.has(serverWs)) {
            serverWs.close(1008, "Party displays are read-only");
            return;
        }
        if (typeof message !== "string") {
            return;
        }

        if (message === '{"type":"room_ping"}') {
            const session = this.sessions.get(serverWs);
            if (session) {
                session.lastSeen = Date.now();
                serverWs.serializeAttachment(session);
                serverWs.send('{"type":"room_pong","data":{}}');
                await this.scheduleAlarm();
            }
            return;
        }
        const raw = message;
        if (
            new TextEncoder().encode(raw).byteLength >
            MAX_WEBSOCKET_MESSAGE_BYTES
        ) {
            serverWs.close(1009, "Message too large");
            return;
        }
        const {
            activateConnectedParticipants,
            adapterCtx,
            broadcast,
            broadcastRoomState,
            canManageHibernatedRoom,
            getAdapter,
            getStoredPlayerName,
            rehydrateConnectedParticipants,
            sendRoomStateToSocket,
            sendTo,
        } = this.createSocketOperations();

        const program = Effect.gen(() =>
            function* (this: GameRoom) {
                const json = yield* Effect.try({
                    try: () =>
                        Schema.decodeUnknownSync(Schema.UnknownFromJsonString)(
                            raw,
                        ) as Record<string, unknown>,
                    catch: (error) =>
                        new RoomMessageDecodeError({
                            issue: formatUnknownError(error),
                        }),
                }).pipe(
                    Effect.catchTag("RoomMessageDecodeError", (error) =>
                        Effect.gen(function* () {
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
                              Effect.logInfo(
                                  "game-room.room-message.decode",
                              ).pipe(
                                  Effect.annotateLogs({
                                      component: "game-room",
                                      operation:
                                          "game-room.room-message.decode",
                                      result: "success",
                                  }),
                              ),
                          ),
                          Effect.catchTag("RoomMessageDecodeError", (error) =>
                              Effect.gen(function* () {
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

                const session = this.sessions.get(serverWs);
                if (!session) {
                    return;
                }

                const isIdentityMessage =
                    sharedMessage?.type === "identify" ||
                    sharedMessage?.type === "join";

                if (isIdentityMessage && sharedMessage) {
                    const requestedPlayerId = sharedMessage.playerId;
                    const storedCapabilityHash =
                        yield* loadPlayerCapabilityHash(
                            this.ctx,
                            requestedPlayerId,
                        );
                    const existingPlayer = this.state.players.some(
                        (player) => player.id === requestedPlayerId,
                    );
                    const alreadyAuthenticated =
                        session.authenticated &&
                        session.playerId === requestedPlayerId;
                    const providedCapability =
                        sharedMessage.sessionToken ?? null;
                    const hasValidCapability =
                        alreadyAuthenticated ||
                        (storedCapabilityHash !== null &&
                            providedCapability !== null &&
                            (yield* Effect.promise(() =>
                                verifyPlayerCapability(
                                    providedCapability,
                                    storedCapabilityHash,
                                ),
                            )));

                    if (sharedMessage.type === "identify") {
                        if (!existingPlayer && storedCapabilityHash === null) {
                            sendRoomStateToSocket(serverWs);
                            serverWs.send(
                                encodeServerMessage({
                                    type: "room_ready",
                                    data: { authenticated: false },
                                }),
                            );
                            return;
                        }

                        if (!hasValidCapability) {
                            serverWs.send(
                                encodeServerMessage({
                                    type: "room_auth_error",
                                    data: {
                                        reason:
                                            storedCapabilityHash === null
                                                ? "session_required"
                                                : "invalid_session",
                                    },
                                }),
                            );
                            return;
                        }
                    } else if (!hasValidCapability) {
                        if (existingPlayer || storedCapabilityHash !== null) {
                            serverWs.send(
                                encodeServerMessage({
                                    type: "room_auth_error",
                                    data: {
                                        reason:
                                            storedCapabilityHash === null
                                                ? "session_required"
                                                : "invalid_session",
                                    },
                                }),
                            );
                            return;
                        }

                        const capability = createPlayerCapability();
                        const capabilityHash = yield* Effect.promise(() =>
                            hashPlayerCapability(capability),
                        );
                        yield* persistPlayerCapabilityHash(
                            this.ctx,
                            requestedPlayerId,
                            capabilityHash,
                        );
                        this.bindSessionToPlayer(
                            serverWs,
                            session,
                            requestedPlayerId,
                        );
                        serverWs.send(
                            encodeServerMessage({
                                type: "room_session",
                                data: {
                                    playerId: requestedPlayerId,
                                    sessionToken: capability,
                                },
                            }),
                        );
                    }

                    if (!session.authenticated) {
                        this.bindSessionToPlayer(
                            serverWs,
                            session,
                            requestedPlayerId,
                        );
                    }
                } else {
                    if (
                        !session.authenticated ||
                        session.playerId === null ||
                        !messagePlayerId
                    ) {
                        yield* Effect.logWarning(
                            "game-room.identity.unbound",
                        ).pipe(
                            Effect.annotateLogs({
                                component: "game-room",
                                operation: "game-room.identity.unbound",
                                messageType: messageType ?? "unknown",
                                playerId: messagePlayerId ?? "",
                            }),
                        );
                        return;
                    }

                    if (session.playerId !== messagePlayerId) {
                        yield* Effect.logWarning(
                            "game-room.identity.mismatch",
                        ).pipe(
                            Effect.annotateLogs({
                                component: "game-room",
                                operation: "game-room.identity.mismatch",
                                messageType: messageType ?? "unknown",
                                boundPlayerId: session.playerId,
                                messagePlayerId,
                            }),
                        );
                        return;
                    }
                }

                if (
                    isIdentityMessage &&
                    sharedMessage &&
                    session.authenticated
                ) {
                    this.state.recovery.offline =
                        this.state.recovery.offline.filter(
                            (entry) =>
                                entry.playerId !== sharedMessage.playerId,
                        );
                    this.transferOfflineHost();
                    this.persistAllState();
                    broadcastRoomState();
                    yield* Effect.promise(() => this.scheduleAlarm());
                }

                if (
                    sharedMessage?.type === "set_disconnect_grace" ||
                    sharedMessage?.type === "manage_disconnect"
                ) {
                    if (this.state.hostId !== sharedMessage.playerId) return;
                    if (sharedMessage.type === "set_disconnect_grace") {
                        this.state.recovery.graceSeconds =
                            sharedMessage.data.seconds;
                    } else {
                        const target = sharedMessage.data.playerId;
                        const action = sharedMessage.data.action;
                        if (
                            action === "continue" &&
                            this.state.phase !== "hibernated"
                        ) {
                            this.expireDisconnectedPlayer(target);
                        } else if (action !== "continue") {
                            this.state.recovery.offline =
                                this.state.recovery.offline.map((entry) =>
                                    entry.playerId === target &&
                                    entry.status === "waiting"
                                        ? {
                                              ...entry,
                                              deadline:
                                                  action === "wait"
                                                      ? null
                                                      : Math.max(
                                                            Date.now(),
                                                            entry.deadline ??
                                                                Date.now(),
                                                        ) + 30_000,
                                          }
                                        : entry,
                                );
                        }
                    }
                    this.persistAllState();
                    broadcastRoomState();
                    yield* Effect.promise(() => this.scheduleAlarm());
                    return;
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
                        serverWs.send(
                            encodeServerMessage({
                                type: "room_ready",
                                data: { authenticated: true },
                            }),
                        );
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
                    serverWs.send(
                        encodeServerMessage({
                            type: "room_ready",
                            data: { authenticated: true },
                        }),
                    );
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
                        this.state.recovery.offline =
                            this.state.recovery.offline.map((entry) => ({
                                ...entry,
                                deadline:
                                    entry.status === "waiting" &&
                                    entry.deadline !== null
                                        ? Date.now() +
                                          (this.state.recovery.graceSeconds ??
                                              60) *
                                              1000
                                        : entry.deadline,
                            }));
                        yield* Effect.promise(() => this.scheduleAlarm());
                        activateConnectedParticipants();
                        this.persistRoomState();
                        broadcastRoomState();
                        rehydrateConnectedParticipants();
                        getAdapter();
                        this.persistGameSnapshot();
                        yield* Effect.logInfo(
                            "game-room.message.processed",
                        ).pipe(
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
                        yield* Effect.logInfo(
                            "game-room.message.processed",
                        ).pipe(
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
                const adapter = getAdapter();
                if (
                    adapter &&
                    typeof messageType === "string" &&
                    messageType.startsWith(adapter.messagePrefix)
                ) {
                    const participant = session.playerId
                        ? this.getGameParticipant(session.playerId)
                        : null;
                    if (
                        participant?.status === "left_game" ||
                        participant?.status === "sitting_out"
                    )
                        return;
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
                const currentPokerState = wasPoker
                    ? (this.gameStateHolder.current as
                          | import("~/game/poker").PokerState
                          | null)
                    : null;
                const wasSeatedPokerPlayer =
                    wasPoker &&
                    !!currentPokerState?.players?.some(
                        (player: { id: string }) =>
                            player.id === sharedMessage.playerId,
                    );

                if (sharedMessage.type === "answer") {
                    const participant = this.getGameParticipant(
                        sharedMessage.playerId,
                    );
                    if (
                        participant?.status === "left_game" ||
                        participant?.status === "sitting_out"
                    )
                        return;
                }
                const processResult = yield* Effect.promise(() =>
                    server(this.state).processClientMessage(
                        sharedMessage,
                        broadcast,
                        {
                            createGameSession: () => ({
                                gameSessionId: crypto.randomUUID(),
                                participants: this.state.players
                                    .filter((player) =>
                                        this.playerSockets.has(player.id),
                                    )
                                    .map((player) => ({
                                        playerId: player.id,
                                        status: "active",
                                    })),
                            }),
                        },
                    ),
                );

                if (
                    sharedMessage.type === "join" ||
                    sharedMessage.type === "leave"
                ) {
                    this.transferOfflineHost();
                    broadcastRoomState();
                }
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

                    const joinAdapter = getAdapter();
                    const isReconnect = !!participant || wasSeatedPokerPlayer;

                    if (
                        participant?.status === "left_game" ||
                        participant?.status === "sitting_out"
                    ) {
                        this.persistAllState();
                        return;
                    }
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
                    yield* Effect.promise(() => this.clearHibernationCleanup());
                    this.clearGameTimer?.();
                    this.clearGameTimer = null;
                    this.gameStateHolder.current = null;

                    const gameAdapter = this.activeAdapter(adapterCtx);

                    if (gameAdapter) {
                        const players = this.state.players
                            .filter((player) =>
                                this.playerSockets.has(player.id),
                            )
                            .map((player) => ({
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
                        const endAdapter = getAdapter();
                        if (endAdapter) {
                            endAdapter.endGame(broadcast, sendTo);
                        }
                    }
                    this.clearCachedAdapter();

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
                    const leaveAdapter = getAdapter();
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
                    this.clearCachedAdapter();
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

                if (sharedMessage.type === "leave") {
                    const participant = this.getGameParticipant(
                        sharedMessage.playerId,
                    );
                    if (
                        participant &&
                        participant.status !== "left_game" &&
                        participant.status !== "sitting_out"
                    ) {
                        participant.status = "left_game";
                        getAdapter()?.removePlayer(
                            sharedMessage.playerId,
                            broadcast,
                            sendTo,
                        );
                    }
                    this.state.recovery.offline =
                        this.state.recovery.offline.filter(
                            (entry) =>
                                entry.playerId !== sharedMessage.playerId,
                        );
                    yield* deletePlayerCapability(
                        this.ctx,
                        sharedMessage.playerId,
                    );
                    this.revokePlayerSessions(sharedMessage.playerId);
                }

                this.persistRoomState();
                if (
                    sharedMessage.type === "join" ||
                    sharedMessage.type === "leave"
                ) {
                    this.persistGameSnapshot();
                }
                yield* Effect.promise(() => this.scheduleAlarm());
                yield* Effect.logInfo("game-room.message.processed").pipe(
                    Effect.annotateLogs({
                        component: "game-room",
                        branch: "shared",
                        result: "ok",
                    }),
                );
            }.call(this),
        );

        await runObservedPromiseExit(
            program as Effect.Effect<void, unknown, never>,
            "game-room.socket.message",
            this.roomLogContext({
                component: "game-room",
            }),
        );
    }

    async webSocketClose(serverWs: WebSocket, code: number, reason: string) {
        await this.ready;
        const work = this.messageQueue.then(() =>
            this.handleSocketDisconnect(serverWs),
        );
        this.messageQueue = work.catch(() => undefined);
        await work;
        serverWs.close(code, reason);
    }

    async webSocketError(serverWs: WebSocket) {
        await this.ready;
        const work = this.messageQueue.then(() =>
            this.handleSocketDisconnect(serverWs),
        );
        this.messageQueue = work.catch(() => undefined);
        await work;
    }

    async handleSocketDisconnect(serverWs: WebSocket) {
        if (this.displaySockets.delete(serverWs)) return;
        const { broadcastRoomState } = this.createSocketOperations();
        const session = this.removeSession(serverWs);
        const closedPlayerId = session?.playerId ?? null;

        if (!closedPlayerId || this.playerSockets.has(closedPlayerId)) return;
        this.markPlayerOffline(closedPlayerId);
        if (
            !this.hasConnectedParticipants() &&
            this.state.phase === "playing"
        ) {
            await this.hibernateRoom();
        }
        this.persistAllState();
        broadcastRoomState();
        await this.scheduleAlarm();
    }

    private markPlayerOffline(playerId: string) {
        const player = this.state.players.find(
            (entry) => entry.id === playerId,
        );
        if (!player) return;
        const participant = this.getGameParticipant(playerId);
        if (participant?.status === "active")
            participant.status = "disconnected";
        if (
            !this.state.recovery.offline.some(
                (entry) => entry.playerId === playerId,
            )
        ) {
            const now = Date.now();
            this.state.recovery.offline.push({
                playerId: player.id,
                since: now,
                deadline:
                    this.state.recovery.graceSeconds === null
                        ? null
                        : now + this.state.recovery.graceSeconds * 1000,
                status: "waiting",
            });
        }
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

        if (
            participant?.status === "left_game" ||
            participant?.status === "sitting_out"
        ) {
            return;
        }

        const adapter = this.activeAdapter(adapterCtx);
        if (!adapter) return;

        if (adapter.onPlayerJoin) {
            const isReconnect = !!participant;
            adapter.onPlayerJoin(
                playerId,
                playerName,
                isReconnect,
                broadcast,
                sendTo,
            );
            return;
        }

        if (participant || isRoomPlayer) {
            adapter.sendStateToPlayer(playerId, sendTo);
        }
    }
}
