import { DurableObject } from "cloudflare:workers";
import { Effect } from "effect";
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
    goFishClientMessageSchema,
    goFishServer,
    type GoFishState,
} from "~/game/go-fish";
import {
    blackjackClientMessageSchema,
    blackjackServer,
    type BlackjackState,
} from "~/game/blackjack";
import {
    pokerClientMessageSchema,
    pokerServer,
    type PokerState,
} from "~/game/poker";
import {
    decodeYahtzeeClientMessage,
    yahtzeeServer,
    type YahtzeeState,
} from "~/game/yahtzee";
import {
    perudoClientMessageSchema,
    perudoServer,
    type PerudoState,
} from "~/game/perudo";
import { rpsClientMessageSchema, rpsServer, type RpsState } from "~/game/rps";
import {
    herdClientMessageSchema,
    herdServer,
    type HerdState,
} from "~/game/herd";
import {
    funFactsClientMessageSchema,
    funFactsServer,
    type FunFactsState,
} from "~/game/fun-facts";
import {
    cheeseThiefClientMessageSchema,
    cheeseThiefServer,
    type CheeseThiefState,
} from "~/game/cheese-thief";
import {
    cockroachPokerClientMessageSchema,
    cockroachPokerServer,
    type CockroachPokerState,
} from "~/game/cockroach-poker";
import {
    flip7ClientMessageSchema,
    flip7Server,
    type Flip7State,
} from "~/game/flip-7";
import {
    skullClientMessageSchema,
    skullServer,
    type SkullState,
} from "~/game/skull";
import {
    spicyClientMessageSchema,
    spicyServer,
    type SpicyState,
} from "~/game/spicy";
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
    RoomMessageDecodeError,
    formatUnknownError,
} from "~/effect/schema-helpers";
import {
    runObservedPromiseExit,
    runObservedSync,
} from "~/effect/runtime";

const HIBERNATION_TIMEOUT_MS = 3 * 60 * 60 * 1000;

function getPokerVisibilityMode(gameType: GameState["activeGameType"]) {
    return gameType === "backwards_poker" ? "backwards" : "standard";
}

function getYahtzeeMode(gameType: GameState["activeGameType"]) {
    return gameType === "lying_yahtzee" ? "lying" : "standard";
}

export class GameRoom extends DurableObject {
    sessions: Map<WebSocket, { id: string; playerId: string | null }>;
    state: GameState;
    goFishState: { current: GoFishState | null };
    pokerState: { current: PokerState | null };
    blackjackState: { current: BlackjackState | null };
    yahtzeeState: { current: YahtzeeState | null };
    perudoState: { current: PerudoState | null };
    rpsState: { current: RpsState | null };
    herdState: { current: HerdState | null };
    funFactsState: { current: FunFactsState | null };
    cheeseThiefState: { current: CheeseThiefState | null };
    cockroachPokerState: { current: CockroachPokerState | null };
    flip7State: { current: Flip7State | null };
    skullState: { current: SkullState | null };
    spicyState: { current: SpicyState | null };
    nextHandTimer: ReturnType<typeof setTimeout> | null;
    ready: Promise<void>;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();
        this.state = createDefaultState();
        this.goFishState = { current: null };
        this.pokerState = { current: null };
        this.blackjackState = { current: null };
        this.yahtzeeState = { current: null };
        this.perudoState = { current: null };
        this.rpsState = { current: null };
        this.herdState = { current: null };
        this.funFactsState = { current: null };
        this.cheeseThiefState = { current: null };
        this.cockroachPokerState = { current: null };
        this.flip7State = { current: null };
        this.skullState = { current: null };
        this.spicyState = { current: null };
        this.nextHandTimer = null;
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
                this.clearInMemoryGameStates();
            }
        });
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
        this.clearInMemoryGameStates();

        if (!snapshot) {
            return;
        }

        if (snapshot.gameType === "go_fish") {
            this.goFishState.current = snapshot.state;
            return;
        }

        if (
            snapshot.gameType === "poker" ||
            snapshot.gameType === "backwards_poker"
        ) {
            this.pokerState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "blackjack") {
            this.blackjackState.current = snapshot.state;
            return;
        }

        if (
            snapshot.gameType === "yahtzee" ||
            snapshot.gameType === "lying_yahtzee"
        ) {
            this.yahtzeeState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "perudo") {
            this.perudoState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "rps") {
            this.rpsState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "herd") {
            this.herdState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "fun_facts") {
            this.funFactsState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "cheese_thief") {
            this.cheeseThiefState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "cockroach_poker") {
            this.cockroachPokerState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "flip_7") {
            this.flip7State.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "skull") {
            this.skullState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "spicy") {
            this.spicyState.current = snapshot.state;
        }
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
        if (
            this.state.activeGameType === "go_fish" &&
            this.goFishState.current
        ) {
            return {
                gameType: "go_fish",
                state: this.goFishState.current,
            };
        }

        if (
            isPokerGameType(this.state.activeGameType) &&
            this.pokerState.current
        ) {
            return {
                gameType: this.state.activeGameType,
                state: this.pokerState.current,
            };
        }

        if (
            this.state.activeGameType === "blackjack" &&
            this.blackjackState.current
        ) {
            return {
                gameType: "blackjack",
                state: this.blackjackState.current,
            };
        }

        if (
            (this.state.activeGameType === "yahtzee" ||
                this.state.activeGameType === "lying_yahtzee") &&
            this.yahtzeeState.current
        ) {
            return {
                gameType: this.state.activeGameType,
                state: this.yahtzeeState.current,
            };
        }

        if (
            this.state.activeGameType === "perudo" &&
            this.perudoState.current
        ) {
            return {
                gameType: "perudo",
                state: this.perudoState.current,
            };
        }

        if (this.state.activeGameType === "rps" && this.rpsState.current) {
            return {
                gameType: "rps",
                state: this.rpsState.current,
            };
        }

        if (this.state.activeGameType === "herd" && this.herdState.current) {
            return {
                gameType: "herd",
                state: this.herdState.current,
            };
        }

        if (
            this.state.activeGameType === "fun_facts" &&
            this.funFactsState.current
        ) {
            return {
                gameType: "fun_facts",
                state: this.funFactsState.current,
            };
        }

        if (
            this.state.activeGameType === "cheese_thief" &&
            this.cheeseThiefState.current
        ) {
            return {
                gameType: "cheese_thief",
                state: this.cheeseThiefState.current,
            };
        }

        if (
            this.state.activeGameType === "cockroach_poker" &&
            this.cockroachPokerState.current
        ) {
            return {
                gameType: "cockroach_poker",
                state: this.cockroachPokerState.current,
            };
        }

        if (this.state.activeGameType === "flip_7" && this.flip7State.current) {
            return {
                gameType: "flip_7",
                state: this.flip7State.current,
            };
        }

        if (this.state.activeGameType === "skull" && this.skullState.current) {
            return {
                gameType: "skull",
                state: this.skullState.current,
            };
        }

        if (this.state.activeGameType === "spicy" && this.spicyState.current) {
            return {
                gameType: "spicy",
                state: this.spicyState.current,
            };
        }

        return null;
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
        this.clearNextHandTimer();
        this.clearInMemoryGameStates();
        this.state = createDefaultState();
    }

    async hibernateRoom() {
        if (this.state.phase !== "playing") {
            return;
        }

        this.clearNextHandTimer();
        this.state.phase = "hibernated";
        this.persistAllState();
        await this.scheduleHibernationCleanup();
    }

    async restartRoom() {
        this.resetRoom();
        await this.clearHibernationCleanup();
        this.persistAllState();
    }

    clearInMemoryGameStates() {
        this.goFishState.current = null;
        this.pokerState.current = null;
        this.blackjackState.current = null;
        this.yahtzeeState.current = null;
        this.perudoState.current = null;
        this.rpsState.current = null;
        this.herdState.current = null;
        this.funFactsState.current = null;
        this.cheeseThiefState.current = null;
        this.cockroachPokerState.current = null;
        this.flip7State.current = null;
        this.skullState.current = null;
        this.spicyState.current = null;
    }

    clearNextHandTimer() {
        if (this.nextHandTimer) {
            clearTimeout(this.nextHandTimer);
            this.nextHandTimer = null;
        }
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
            data: server(this.state).getRoomState() as unknown as Record<
                string,
                unknown
            >,
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

                rehydratePlayerGameState(
                    session.playerId,
                    getStoredPlayerName(session.playerId),
                );
            });
        };

        const schedulePokerNextHand = () => {
            this.clearNextHandTimer();
            this.nextHandTimer = setTimeout(() => {
                this.nextHandTimer = null;
                pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(
                        this.state.activeGameType,
                    ),
                }).startNextHand(broadcast, sendTo);
                this.persistGameSnapshot();
            }, 4500);
        };

        const scheduleBlackjackNextRound = () => {
            this.clearNextHandTimer();
            this.nextHandTimer = setTimeout(() => {
                this.nextHandTimer = null;
                blackjackServer(this.blackjackState, {
                    scheduleNextRound: scheduleBlackjackNextRound,
                }).startNextRound(broadcast, sendTo);
                this.persistGameSnapshot();
            }, 5000);
        };

        const rehydratePlayerGameState = (
            playerId: string,
            playerName: string,
        ) => {
            const participant = this.getGameParticipant(playerId);
            const isRoomPlayer = this.state.players.some(
                (player) => player.id === playerId,
            );

            if (participant?.status === "left_game") {
                return;
            }

            if (this.state.activeGameType === "go_fish" && participant) {
                goFishServer(this.goFishState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }

            if (isPokerGameType(this.state.activeGameType)) {
                const poker = pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(
                        this.state.activeGameType,
                    ),
                });

                if (participant) {
                    poker.reconnectPlayer(
                        { id: playerId, name: playerName },
                        broadcast,
                        sendTo,
                    );
                    return;
                }

                if (isRoomPlayer) {
                    poker.addSpectator(
                        { id: playerId, name: playerName },
                        broadcast,
                        sendTo,
                    );
                }
                return;
            }

            if (this.state.activeGameType === "blackjack" && participant) {
                blackjackServer(this.blackjackState, {
                    scheduleNextRound: scheduleBlackjackNextRound,
                }).sendStateToPlayer(playerId, sendTo);
                return;
            }

            if (
                (this.state.activeGameType === "yahtzee" ||
                    this.state.activeGameType === "lying_yahtzee") &&
                participant
            ) {
                yahtzeeServer(this.yahtzeeState, {
                    mode: getYahtzeeMode(this.state.activeGameType),
                }).sendStateToPlayer(playerId, sendTo);
                return;
            }

            if (this.state.activeGameType === "perudo" && participant) {
                perudoServer(this.perudoState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "rps" && participant) {
                rpsServer(this.rpsState).sendStateToPlayer(playerId, sendTo);
                return;
            }

            if (this.state.activeGameType === "herd") {
                herdServer(this.herdState).sendStateToPlayer(playerId, sendTo);
                return;
            }

            if (this.state.activeGameType === "fun_facts") {
                funFactsServer(this.funFactsState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "cheese_thief") {
                cheeseThiefServer(this.cheeseThiefState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "cockroach_poker") {
                cockroachPokerServer(
                    this.cockroachPokerState,
                ).sendStateToPlayer(playerId, sendTo);
                return;
            }

            if (this.state.activeGameType === "flip_7") {
                flip7Server(this.flip7State).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "skull") {
                skullServer(this.skullState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }
            if (this.state.activeGameType === "spicy") {
                spicyServer(this.spicyState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
            }
        };

        const removePlayerFromActiveGame = (playerId: string) => {
            if (this.state.activeGameType === "go_fish") {
                goFishServer(this.goFishState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (isPokerGameType(this.state.activeGameType)) {
                pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(
                        this.state.activeGameType,
                    ),
                }).disconnectPlayer(playerId, broadcast, sendTo);
                return;
            }

            if (this.state.activeGameType === "blackjack") {
                blackjackServer(this.blackjackState, {
                    scheduleNextRound: scheduleBlackjackNextRound,
                }).removePlayer(playerId, broadcast, sendTo);
                return;
            }

            if (
                this.state.activeGameType === "yahtzee" ||
                this.state.activeGameType === "lying_yahtzee"
            ) {
                yahtzeeServer(this.yahtzeeState, {
                    mode: getYahtzeeMode(this.state.activeGameType),
                }).removePlayer(playerId, broadcast, sendTo);
                return;
            }

            if (this.state.activeGameType === "perudo") {
                perudoServer(this.perudoState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "rps") {
                rpsServer(this.rpsState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "herd") {
                herdServer(this.herdState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "fun_facts") {
                funFactsServer(this.funFactsState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "cheese_thief") {
                cheeseThiefServer(this.cheeseThiefState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "cockroach_poker") {
                cockroachPokerServer(this.cockroachPokerState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "flip_7") {
                flip7Server(this.flip7State).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "skull") {
                skullServer(this.skullState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
                return;
            }
            if (this.state.activeGameType === "spicy") {
                spicyServer(this.spicyState).removePlayer(
                    playerId,
                    broadcast,
                    sendTo,
                );
            }
        };

        sendRoomStateToSocket(serverWs);

        serverWs.addEventListener("message", (event) => {
            const raw = event.data as string;

            const program = Effect.gen(() =>
                (function* (this: GameRoom) {
                const json = yield* Effect.try({
                    try: () => JSON.parse(raw) as Record<string, unknown>,
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

                    rehydratePlayerGameState(
                        sharedMessage.playerId,
                        sharedMessage.playerName ||
                            getStoredPlayerName(sharedMessage.playerId),
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

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("go_fish:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "go_fish",
                            result: "legacy",
                        }),
                    );
                    const parsed = goFishClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    goFishServer(this.goFishState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("poker:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "poker",
                            result: "legacy",
                        }),
                    );
                    const parsed = pokerClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    pokerServer(this.pokerState, {
                        scheduleNextHand: schedulePokerNextHand,
                        visibilityMode: getPokerVisibilityMode(
                            this.state.activeGameType,
                        ),
                    }).processMessage(parsed.data, broadcast, sendTo);
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("blackjack:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "blackjack",
                            result: "legacy",
                        }),
                    );
                    const parsed = blackjackClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    blackjackServer(this.blackjackState, {
                        scheduleNextRound: scheduleBlackjackNextRound,
                    }).processMessage(parsed.data, broadcast, sendTo);
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("yahtzee:")
                ) {
                    const parsed = yield* decodeYahtzeeClientMessage(json).pipe(
                        Effect.tap(() =>
                            Effect.logInfo("game-room.yahtzee-message.decode").pipe(
                                Effect.annotateLogs({
                                    component: "yahtzee-transport",
                                    operation:
                                        "game-room.yahtzee-message.decode",
                                    result: "success",
                                }),
                            ),
                        ),
                        Effect.catchTag("YahtzeeMessageDecodeError", (error) =>
                            Effect.gen(function*() {
                                yield* Effect.logWarning(
                                    "game-room.yahtzee-message.decode",
                                ).pipe(
                                    Effect.annotateLogs({
                                        component: "yahtzee-transport",
                                        operation:
                                            "game-room.yahtzee-message.decode",
                                        result: "ignored",
                                        errorTag: error._tag,
                                    }),
                                );
                                return null;
                            }),
                        ),
                    );

                    if (!parsed) {
                        return;
                    }

                    yahtzeeServer(this.yahtzeeState, {
                        mode: getYahtzeeMode(this.state.activeGameType),
                    }).processMessage(parsed, broadcast, sendTo);
                    this.persistGameSnapshot();
                    yield* Effect.logInfo("game-room.message.processed").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "yahtzee",
                            result: "ok",
                        }),
                    );
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("perudo:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "perudo",
                            result: "legacy",
                        }),
                    );
                    const parsed = perudoClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    perudoServer(this.perudoState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("rps:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "rps",
                            result: "legacy",
                        }),
                    );
                    const parsed = rpsClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    rpsServer(this.rpsState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("herd:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "herd",
                            result: "legacy",
                        }),
                    );
                    const parsed = herdClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    herdServer(this.herdState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("fun_facts:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "fun_facts",
                            result: "legacy",
                        }),
                    );
                    const parsed = funFactsClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    funFactsServer(this.funFactsState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("cheese_thief:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "cheese_thief",
                            result: "legacy",
                        }),
                    );
                    const parsed = cheeseThiefClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    cheeseThiefServer(this.cheeseThiefState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("cockroach_poker:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "cockroach_poker",
                            result: "legacy",
                        }),
                    );
                    const parsed =
                        cockroachPokerClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    cockroachPokerServer(this.cockroachPokerState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("flip_7:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "flip_7",
                            result: "legacy",
                        }),
                    );
                    const parsed = flip7ClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    flip7Server(this.flip7State).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("skull:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "skull",
                            result: "legacy",
                        }),
                    );
                    const parsed = skullClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    skullServer(this.skullState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (
                    typeof messageType === "string" &&
                    messageType.startsWith("spicy:")
                ) {
                    yield* Effect.logInfo("game-room.message.legacy-branch").pipe(
                        Effect.annotateLogs({
                            component: "game-room",
                            branch: "spicy",
                            result: "legacy",
                        }),
                    );
                    const parsed = spicyClientMessageSchema.safeParse(json);
                    if (!parsed.success) return;
                    spicyServer(this.spicyState).processMessage(
                        parsed.data,
                        broadcast,
                        sendTo,
                    );
                    this.persistGameSnapshot();
                    return;
                }

                if (!sharedMessage) {
                    return;
                }

                const wasPoker = isPokerGameType(this.state.activeGameType);
                const currentPokerState = this.pokerState.current;
                const wasSeatedPokerPlayer =
                    wasPoker &&
                    !!currentPokerState?.players.some(
                        (player) => player.id === sharedMessage.playerId,
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

                    if (isPokerGameType(this.state.activeGameType)) {
                        const poker = pokerServer(this.pokerState, {
                            scheduleNextHand: schedulePokerNextHand,
                            visibilityMode: getPokerVisibilityMode(
                                this.state.activeGameType,
                            ),
                        });
                        if (participant || wasSeatedPokerPlayer) {
                            poker.reconnectPlayer(
                                {
                                    id: sharedMessage.playerId,
                                    name: sharedMessage.playerName,
                                },
                                broadcast,
                                sendTo,
                            );
                        } else {
                            poker.addSpectator(
                                {
                                    id: sharedMessage.playerId,
                                    name: sharedMessage.playerName,
                                },
                                broadcast,
                                sendTo,
                            );
                        }
                    } else if (participant) {
                        rehydratePlayerGameState(
                            sharedMessage.playerId,
                            sharedMessage.playerName,
                        );
                    }
                }

                if (processResult.kind === "start") {
                    yield* Effect.promise(() =>
                        this.clearHibernationCleanup(),
                    );
                    this.clearNextHandTimer();
                    this.clearInMemoryGameStates();
                    if (processResult.gameType === "go_fish") {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        goFishServer(this.goFishState).initGame(
                            players,
                            broadcast,
                            sendTo,
                        );
                    } else if (isPokerGameType(processResult.gameType)) {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        pokerServer(this.pokerState, {
                            scheduleNextHand: schedulePokerNextHand,
                            visibilityMode: getPokerVisibilityMode(
                                processResult.gameType,
                            ),
                        }).initGame(players, broadcast, sendTo);
                    } else if (processResult.gameType === "blackjack") {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.yahtzeeState.current = null;
                        blackjackServer(this.blackjackState, {
                            scheduleNextRound: scheduleBlackjackNextRound,
                        }).initGame(players, broadcast, sendTo);
                    } else if (
                        processResult.gameType === "yahtzee" ||
                        processResult.gameType === "lying_yahtzee"
                    ) {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.perudoState.current = null;
                        yahtzeeServer(this.yahtzeeState, {
                            mode: getYahtzeeMode(processResult.gameType),
                        }).initGame(players, broadcast, sendTo);
                    } else if (processResult.gameType === "perudo") {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.rpsState.current = null;
                        perudoServer(this.perudoState).initGame(
                            players,
                            broadcast,
                            sendTo,
                        );
                    } else if (processResult.gameType === "rps") {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        rpsServer(this.rpsState).initGame(
                            players,
                            broadcast,
                            sendTo,
                        );
                    } else if (processResult.gameType === "herd") {
                        const hostId = this.state.hostId;
                        const players = this.state.players
                            .filter((player) => player.id !== hostId)
                            .map((player) => ({
                                id: player.id,
                                name: player.name,
                            }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        herdServer(this.herdState).initGame(
                            players,
                            hostId!,
                            broadcast,
                            sendTo,
                        );
                    } else if (processResult.gameType === "fun_facts") {
                        const hostId = this.state.hostId;
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        this.herdState.current = null;
                        funFactsServer(this.funFactsState).initGame(
                            players,
                            hostId!,
                            broadcast,
                            sendTo,
                        );
                    } else if (processResult.gameType === "cheese_thief") {
                        const hostId = this.state.hostId;
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        this.herdState.current = null;
                        this.funFactsState.current = null;
                        cheeseThiefServer(this.cheeseThiefState).initGame(
                            players,
                            hostId!,
                            broadcast,
                            sendTo,
                        );
                    } else if (
                        processResult.gameType === "cockroach_poker"
                    ) {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        this.herdState.current = null;
                        this.funFactsState.current = null;
                        this.cheeseThiefState.current = null;
                        cockroachPokerServer(
                            this.cockroachPokerState,
                        ).initGame(players, broadcast, sendTo);
                    } else if (processResult.gameType === "flip_7") {
                        const hostId = this.state.hostId;
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        this.herdState.current = null;
                        this.funFactsState.current = null;
                        this.cheeseThiefState.current = null;
                        this.cockroachPokerState.current = null;
                        this.skullState.current = null;
                        flip7Server(this.flip7State).initGame(
                            players,
                            hostId!,
                            broadcast,
                            sendTo,
                        );
                    } else if (processResult.gameType === "skull") {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        this.herdState.current = null;
                        this.funFactsState.current = null;
                        this.cheeseThiefState.current = null;
                        this.cockroachPokerState.current = null;
                        this.flip7State.current = null;
                        skullServer(this.skullState).initGame(
                            players,
                            broadcast,
                            sendTo,
                        );
                    } else if (processResult.gameType === "spicy") {
                        const players = this.state.players.map((player) => ({
                            id: player.id,
                            name: player.name,
                        }));
                        this.goFishState.current = null;
                        this.pokerState.current = null;
                        this.blackjackState.current = null;
                        this.yahtzeeState.current = null;
                        this.perudoState.current = null;
                        this.rpsState.current = null;
                        this.herdState.current = null;
                        this.funFactsState.current = null;
                        this.cheeseThiefState.current = null;
                        this.cockroachPokerState.current = null;
                        this.flip7State.current = null;
                        this.skullState.current = null;
                        spicyServer(this.spicyState).initGame(
                            players,
                            broadcast,
                            sendTo,
                        );
                    } else {
                        this.clearInMemoryGameStates();
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
                if (isPokerGameType(processResult.gameType)) {
                    this.clearNextHandTimer();
                    pokerServer(this.pokerState, {
                        scheduleNextHand: schedulePokerNextHand,
                        visibilityMode: getPokerVisibilityMode(
                            processResult.gameType,
                        ),
                    }).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "blackjack") {
                    this.clearNextHandTimer();
                }
                if (
                    processResult.gameType === "yahtzee" ||
                    processResult.gameType === "lying_yahtzee"
                ) {
                    yahtzeeServer(this.yahtzeeState, {
                        mode: getYahtzeeMode(processResult.gameType),
                    }).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "perudo") {
                    perudoServer(this.perudoState).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "rps") {
                    rpsServer(this.rpsState).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "herd") {
                    herdServer(this.herdState).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "fun_facts") {
                    funFactsServer(this.funFactsState).endGame(
                        broadcast,
                        sendTo,
                    );
                }
                if (processResult.gameType === "cheese_thief") {
                    cheeseThiefServer(this.cheeseThiefState).endGame(
                        broadcast,
                        sendTo,
                    );
                }
                if (processResult.gameType === "cockroach_poker") {
                    cockroachPokerServer(this.cockroachPokerState).endGame(
                        broadcast,
                        sendTo,
                    );
                }
                if (processResult.gameType === "flip_7") {
                    flip7Server(this.flip7State).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "skull") {
                    skullServer(this.skullState).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "spicy") {
                    spicyServer(this.spicyState).endGame(broadcast, sendTo);
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
                removePlayerFromActiveGame(processResult.playerId);
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
                this.clearNextHandTimer();
                this.clearInMemoryGameStates();
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
                program,
                "game-room.socket.message",
                this.roomLogContext({
                    component: "game-room",
                }),
            );
        });

        serverWs.addEventListener("close", async () => {
            const session = this.sessions.get(serverWs);
            this.sessions.delete(serverWs);

            let didChange = false;
            if (session?.playerId) {
                didChange = this.setGameParticipantStatus(
                    session.playerId,
                    "disconnected",
                );

                if (didChange && isPokerGameType(this.state.activeGameType)) {
                    pokerServer(this.pokerState, {
                        scheduleNextHand: schedulePokerNextHand,
                        visibilityMode: getPokerVisibilityMode(
                            this.state.activeGameType,
                        ),
                    }).disconnectPlayer(session.playerId, broadcast, sendTo);
                }
            }

            if (this.sessions.size === 0 && this.state.phase === "playing") {
                await this.hibernateRoom();
                return;
            }

            if (!didChange) {
                return;
            }

            this.persistAllState();
            broadcastRoomState();
        });

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }
}
