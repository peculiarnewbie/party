import { DurableObject } from "cloudflare:workers";
import {
    type GameParticipant,
    type GameParticipantStatus,
    type GameState,
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
    yahtzeeClientMessageSchema,
    yahtzeeServer,
    type YahtzeeState,
} from "~/game/yahtzee";
import {
    perudoClientMessageSchema,
    perudoServer,
    type PerudoState,
} from "~/game/perudo";
import {
    rpsClientMessageSchema,
    rpsServer,
    type RpsState,
} from "~/game/rps";
import {
    herdClientMessageSchema,
    herdServer,
    type HerdState,
} from "~/game/herd";

const ROOM_STATE_KEY = "room_state";
const GAME_SNAPSHOT_KEY = "game_snapshot";

type PersistedValueRow = {
    value: string;
};

type PersistedParticipantRow = {
    player_id: string;
    status: GameParticipantStatus;
};

type PersistedGameSnapshot =
    | {
          gameType: "go_fish";
          state: GoFishState;
      }
    | {
          gameType: "poker" | "backwards_poker";
          state: PokerState;
      }
    | {
          gameType: "blackjack";
          state: BlackjackState;
      }
    | {
          gameType: "yahtzee" | "lying_yahtzee";
          state: YahtzeeState;
      }
    | {
          gameType: "perudo";
          state: PerudoState;
      }
    | {
          gameType: "rps";
          state: RpsState;
      }
    | {
          gameType: "herd";
          state: HerdState;
      };

function createDefaultState(): GameState {
    return {
        players: [],
        hostId: null,
        answers: {},
        phase: "lobby",
        selectedGameType: "quiz",
        activeGameType: null,
        gameSessionId: null,
        gameParticipants: [],
    };
}

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
        this.nextHandTimer = null;
        this.ready = this.ctx.blockConcurrencyWhile(async () => {
            this.ensureSchema();
            this.loadPersistedState();
        });
    }

    ensureSchema() {
        this.ctx.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS kv (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        `);
        this.ctx.storage.sql.exec(`
            CREATE TABLE IF NOT EXISTS game_participants (
                session_id TEXT NOT NULL,
                player_id TEXT NOT NULL,
                status TEXT NOT NULL,
                joined_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                PRIMARY KEY (session_id, player_id)
            )
        `);
    }

    readMeta<T>(key: string): T | null {
        const row = this.ctx.storage.sql
            .exec<PersistedValueRow>("SELECT value FROM kv WHERE key = ?", key)
            .toArray()[0];

        if (!row) return null;
        return JSON.parse(row.value) as T;
    }

    writeMeta(key: string, value: unknown) {
        this.ctx.storage.sql.exec(
            "INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)",
            key,
            JSON.stringify(value),
        );
    }

    deleteMeta(key: string) {
        this.ctx.storage.sql.exec("DELETE FROM kv WHERE key = ?", key);
    }

    readParticipants(sessionId: string): GameParticipant[] {
        return this.ctx.storage.sql
            .exec<PersistedParticipantRow>(
                `
                    SELECT player_id, status
                    FROM game_participants
                    WHERE session_id = ?
                    ORDER BY joined_at ASC
                `,
                sessionId,
            )
            .toArray()
            .map((row) => ({
                playerId: row.player_id,
                status: row.status,
            }));
    }

    writeParticipants(sessionId: string, participants: GameParticipant[]) {
        const now = Date.now();
        this.ctx.storage.sql.exec(
            "DELETE FROM game_participants WHERE session_id = ?",
            sessionId,
        );

        for (const [index, participant] of participants.entries()) {
            this.ctx.storage.sql.exec(
                `
                    INSERT INTO game_participants (
                        session_id,
                        player_id,
                        status,
                        joined_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?)
                `,
                sessionId,
                participant.playerId,
                participant.status,
                now + index,
                now,
            );
        }
    }

    deleteAllParticipants() {
        this.ctx.storage.sql.exec("DELETE FROM game_participants");
    }

    loadPersistedState() {
        const persistedState =
            this.readMeta<Partial<GameState>>(ROOM_STATE_KEY);
        this.state = {
            ...createDefaultState(),
            ...persistedState,
            gameParticipants: [],
        };

        if (this.state.gameSessionId) {
            this.state.gameParticipants = this.readParticipants(
                this.state.gameSessionId,
            );
        }

        const snapshot =
            this.readMeta<PersistedGameSnapshot>(GAME_SNAPSHOT_KEY);
        this.goFishState.current = null;
        this.pokerState.current = null;
        this.blackjackState.current = null;
        this.yahtzeeState.current = null;
        this.perudoState.current = null;
        this.rpsState.current = null;
        this.herdState.current = null;

        if (!snapshot || snapshot.gameType !== this.state.activeGameType) {
            return;
        }

        if (snapshot.gameType === "go_fish") {
            this.goFishState.current = snapshot.state;
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

        if (
            snapshot.gameType === "poker" ||
            snapshot.gameType === "backwards_poker"
        ) {
            this.pokerState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "rps") {
            this.rpsState.current = snapshot.state;
            return;
        }

        if (snapshot.gameType === "herd") {
            this.herdState.current = snapshot.state;
        }
    }

    persistRoomState() {
        this.writeMeta(ROOM_STATE_KEY, this.state);
        if (this.state.gameSessionId) {
            this.writeParticipants(
                this.state.gameSessionId,
                this.state.gameParticipants,
            );
            return;
        }

        this.deleteAllParticipants();
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

        if (
            this.state.activeGameType === "rps" &&
            this.rpsState.current
        ) {
            return {
                gameType: "rps",
                state: this.rpsState.current,
            };
        }

        if (
            this.state.activeGameType === "herd" &&
            this.herdState.current
        ) {
            return {
                gameType: "herd",
                state: this.herdState.current,
            };
        }

        return null;
    }

    persistGameSnapshot() {
        const snapshot = this.getCurrentGameSnapshot();
        if (!snapshot) {
            this.deleteMeta(GAME_SNAPSHOT_KEY);
            return;
        }

        this.writeMeta(GAME_SNAPSHOT_KEY, snapshot);
    }

    persistAllState() {
        this.persistRoomState();
        this.persistGameSnapshot();
    }

    clearInMemoryGameStates() {
        this.goFishState.current = null;
        this.pokerState.current = null;
        this.blackjackState.current = null;
        this.yahtzeeState.current = null;
        this.perudoState.current = null;
        this.rpsState.current = null;
        this.herdState.current = null;
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

    roomStateMessage() {
        return JSON.stringify({
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
                rpsServer(this.rpsState).sendStateToPlayer(
                    playerId,
                    sendTo,
                );
                return;
            }

            if (this.state.activeGameType === "herd") {
                herdServer(this.herdState).sendStateToPlayer(
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
            }
        };

        sendRoomStateToSocket(serverWs);

        serverWs.addEventListener("message", async (event) => {
            const raw = event.data as string;
            let json: any;
            try {
                json = JSON.parse(raw);
            } catch {
                return;
            }

            if (
                (json.type === "identify" || json.type === "join") &&
                json.playerId
            ) {
                const session = this.sessions.get(serverWs);
                if (session) session.playerId = json.playerId;
            }

            if (json.type === "identify" && json.playerId) {
                const participant = this.getGameParticipant(json.playerId);
                const didChange =
                    participant?.status === "disconnected" &&
                    this.setGameParticipantStatus(json.playerId, "active");

                if (didChange) {
                    this.persistRoomState();
                    broadcastRoomState();
                }

                sendRoomStateToSocket(serverWs);
                rehydratePlayerGameState(
                    json.playerId,
                    typeof json.playerName === "string" ? json.playerName : "",
                );
                this.persistGameSnapshot();
                return;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("go_fish:")
            ) {
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
                typeof json.type === "string" &&
                json.type.startsWith("poker:")
            ) {
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
                typeof json.type === "string" &&
                json.type.startsWith("blackjack:")
            ) {
                const parsed = blackjackClientMessageSchema.safeParse(json);
                if (!parsed.success) return;
                blackjackServer(this.blackjackState, {
                    scheduleNextRound: scheduleBlackjackNextRound,
                }).processMessage(parsed.data, broadcast, sendTo);
                this.persistGameSnapshot();
                return;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("yahtzee:")
            ) {
                const parsed = yahtzeeClientMessageSchema.safeParse(json);
                if (!parsed.success) return;
                yahtzeeServer(this.yahtzeeState, {
                    mode: getYahtzeeMode(this.state.activeGameType),
                }).processMessage(parsed.data, broadcast, sendTo);
                this.persistGameSnapshot();
                return;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("perudo:")
            ) {
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
                typeof json.type === "string" &&
                json.type.startsWith("rps:")
            ) {
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
                typeof json.type === "string" &&
                json.type.startsWith("herd:")
            ) {
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

            const wasPoker = isPokerGameType(this.state.activeGameType);
            const currentPokerState = this.pokerState.current;
            const wasSeatedPokerPlayer =
                wasPoker &&
                !!currentPokerState?.players.some(
                    (player) => player.id === json.playerId,
                );

            const processResult = await server(this.state).processMessage(
                raw,
                broadcast,
                {
                    createGameSession: () => ({
                        gameSessionId: crypto.randomUUID(),
                        participants: this.state.players.map((player) => ({
                            playerId: player.id,
                            status: "active",
                        })),
                    }),
                },
            );

            if (
                json.type === "join" &&
                this.state.phase === "playing" &&
                json.playerId
            ) {
                const participant = this.getGameParticipant(json.playerId);
                if (participant?.status === "disconnected") {
                    this.setGameParticipantStatus(json.playerId, "active");
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
                                id: json.playerId,
                                name: json.playerName,
                            },
                            broadcast,
                            sendTo,
                        );
                    } else {
                        poker.addSpectator(
                            {
                                id: json.playerId,
                                name: json.playerName,
                            },
                            broadcast,
                            sendTo,
                        );
                    }
                } else if (participant) {
                    rehydratePlayerGameState(
                        json.playerId,
                        typeof json.playerName === "string"
                            ? json.playerName
                            : "",
                    );
                }
            }

            if (processResult.kind === "start") {
                this.clearNextHandTimer();
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
                } else {
                    this.clearInMemoryGameStates();
                }

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

                this.persistAllState();
                return;
            }

            if (processResult.kind === "leave_game") {
                removePlayerFromActiveGame(processResult.playerId);
                this.persistAllState();
                return;
            }

            if (processResult.kind === "return_to_lobby") {
                this.clearNextHandTimer();
                this.clearInMemoryGameStates();
                this.persistAllState();
                return;
            }

            this.persistRoomState();
            if (json.type === "join" && json.playerId) {
                this.persistGameSnapshot();
            }
        });

        serverWs.addEventListener("close", () => {
            const session = this.sessions.get(serverWs);
            this.sessions.delete(serverWs);

            if (!session?.playerId) return;

            const didChange = this.setGameParticipantStatus(
                session.playerId,
                "disconnected",
            );

            if (!didChange) return;

            if (isPokerGameType(this.state.activeGameType)) {
                pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(
                        this.state.activeGameType,
                    ),
                }).disconnectPlayer(session.playerId, broadcast, sendTo);
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
