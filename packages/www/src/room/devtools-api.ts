import type {
    GameParticipantStatus,
    GameType,
    MessageType,
    RoomStatePayload,
} from "~/game";
import { GAME_RULES } from "~/game";
import type { RoomClientPool } from "./types";
import type { ConnectionStatus, DevPlayerIdentity, TransportMessage } from "./types";

export const PARTY_DEVTOOLS_API_VERSION = 1;

export type PartyDevtoolsEvent =
    | "snapshot"
    | "active_player_changed"
    | "connection_status"
    | "room_state"
    | "message";

export interface DevToolsPlayerSnapshot {
    id: string;
    name: string;
    origin: DevPlayerIdentity["origin"];
    connectionStatus: ConnectionStatus;
    isHost: boolean;
    isJoined: boolean;
    gameStatus: GameParticipantStatus | null;
    gameViewSummary: string;
    supportedForSwitching: boolean;
}

export interface DevToolsSnapshot {
    version: number;
    roomId: string;
    activePlayerId: string;
    inviteUrl: string;
    players: DevToolsPlayerSnapshot[];
    room: {
        phase: string;
        selectedGame: GameType;
        activeGame: GameType | null;
        gameSessionId: string | null;
        connectedSockets: number;
    };
}

export interface EventLogFilter {
    playerId?: string;
    direction?: "in" | "out";
    typePrefix?: string;
    since?: number;
    limit?: number;
}

export interface PartyDevtoolsApi {
    version: number;
    snapshot(): DevToolsSnapshot;
    addPlayer(opts?: { name?: string }): string;
    addPlayers(count: number): string[];
    joinPlayer(playerId?: string): void;
    addPlayerAndJoin(opts?: { name?: string }): string;
    addPlayersAndJoin(count: number): string[];
    removePlayer(playerId: string): void;
    setActivePlayer(playerId: string): void;
    renamePlayer(playerId: string, name: string): void;
    connect(playerId: string): void;
    disconnect(playerId: string): void;
    sendRoomMessage(type: MessageType, data?: Record<string, unknown>): void;
    sendGameMessage(type: string, data?: Record<string, unknown>): void;
    getEventLog(filter?: EventLogFilter): TransportMessage[];
    getRoomState(playerId?: string): RoomStatePayload | null;
    getGameView(playerId?: string): unknown | null;
    on(event: PartyDevtoolsEvent, handler: (payload: unknown) => void): () => void;
    clearDevPlayers(): void;
}

const UNSUPPORTED_SWITCH_GAMES = new Set<GameType>(["quiz"]);

function summarizeGameView(view: unknown): string {
    if (!view || typeof view !== "object") return "—";
    const record = view as Record<string, unknown>;
    if (record.needsToThrow === true) return "YOUR TURN";
    if (record.isMyTurn === true) return "YOUR TURN";
    if (record.hasAnswered === true) return "ANSWERED";
    if (record.phase === "game_over") return "GAME OVER";
    if (typeof record.phase === "string") return record.phase.toUpperCase();
    return "ACTIVE";
}

function findClient(pool: RoomClientPool, playerId?: string) {
    if (!playerId) return pool.activeClient();
    return (
        pool.clients().find((client) => client.identity().id === playerId) ??
        pool.activeClient()
    );
}

function joinClientWhenConnected(
    client: ReturnType<RoomClientPool["addPlayer"]>,
    onComplete?: () => void,
) {
    const attempt = () => {
        if (client.status() === "connected") {
            client.sendRoomMessage("join", {}, client.identity().name);
            onComplete?.();
            return;
        }
        window.setTimeout(attempt, 50);
    };
    attempt();
}

export function createPartyDevtoolsApi(
    pool: RoomClientPool,
): PartyDevtoolsApi {
    const listeners = new Map<PartyDevtoolsEvent, Set<(payload: unknown) => void>>();

    const emit = (event: PartyDevtoolsEvent, payload: unknown) => {
        for (const handler of listeners.get(event) ?? []) {
            handler(payload);
        }
    };

    const on = (event: PartyDevtoolsEvent, handler: (payload: unknown) => void) => {
        if (!listeners.has(event)) {
            listeners.set(event, new Set());
        }
        listeners.get(event)!.add(handler);
        return () => {
            listeners.get(event)?.delete(handler);
        };
    };

    const snapshot = (): DevToolsSnapshot => {
        const active = pool.activeClient();
        const activeRoom = active.roomState();
        const phase = activeRoom?.phase ?? "lobby";
        const activeGame = activeRoom?.activeGameType ?? null;

        const players = pool.clients().map((client) => {
            const identity = client.identity();
            const roomState = client.roomState();
            const participant =
                roomState?.gameParticipants.find(
                    (entry) => entry.playerId === identity.id,
                ) ?? null;

            return {
                id: identity.id,
                name: identity.name,
                origin: identity.origin,
                connectionStatus: client.status(),
                isHost: roomState?.hostId === identity.id,
                isJoined:
                    roomState?.players.some((player) => player.id === identity.id) ??
                    false,
                gameStatus: participant?.status ?? null,
                gameViewSummary: summarizeGameView(
                    client.transport.latest(
                        activeGame ? `${activeGame}:state` : "",
                    ),
                ),
                supportedForSwitching:
                    activeGame === null || !UNSUPPORTED_SWITCH_GAMES.has(activeGame),
            };
        });

        return {
            version: PARTY_DEVTOOLS_API_VERSION,
            roomId: pool.roomId,
            activePlayerId: active.identity().id,
            inviteUrl:
                typeof window !== "undefined"
                    ? `${window.location.origin}/room/${pool.roomId}`
                    : `/room/${pool.roomId}`,
            players,
            room: {
                phase,
                selectedGame: activeRoom?.selectedGameType ?? "quiz",
                activeGame,
                gameSessionId: activeRoom?.gameSessionId ?? null,
                connectedSockets: players.filter(
                    (player) => player.connectionStatus === "connected",
                ).length,
            },
        };
    };

    for (const client of pool.clients()) {
        client.transport.subscribe(() => {
            emit("message", { playerId: client.identity().id });
            emit("snapshot", snapshot());
        });
        const status = client.status;
        let lastStatus = status();
        const checkStatus = () => {
            const next = status();
            if (next !== lastStatus) {
                lastStatus = next;
                emit("connection_status", {
                    playerId: client.identity().id,
                    status: next,
                });
                emit("snapshot", snapshot());
            }
        };
        const interval = setInterval(checkStatus, 250);
        if (typeof window !== "undefined") {
            window.addEventListener("beforeunload", () => clearInterval(interval));
        }
    }

    return {
        version: PARTY_DEVTOOLS_API_VERSION,
        snapshot,
        addPlayer: (opts) => {
            const client = pool.addPlayer(opts?.name);
            emit("snapshot", snapshot());
            return client.identity().id;
        },
        addPlayers: (count) => {
            const created = pool.addPlayers(count);
            emit("snapshot", snapshot());
            return created.map((client) => client.identity().id);
        },
        joinPlayer: (playerId) => {
            joinClientWhenConnected(findClient(pool, playerId), () => {
                emit("snapshot", snapshot());
            });
        },
        addPlayerAndJoin: (opts) => {
            const client = pool.addPlayer(opts?.name);
            joinClientWhenConnected(client, () => {
                emit("snapshot", snapshot());
            });
            return client.identity().id;
        },
        addPlayersAndJoin: (count) => {
            const ids: string[] = [];
            for (let i = 0; i < count; i++) {
                const client = pool.addPlayer();
                ids.push(client.identity().id);
                joinClientWhenConnected(client, () => {
                    emit("snapshot", snapshot());
                });
            }
            return ids;
        },
        removePlayer: (playerId) => {
            pool.removePlayer(playerId);
            emit("snapshot", snapshot());
        },
        setActivePlayer: (playerId) => {
            pool.setActivePlayer(playerId);
            emit("active_player_changed", { playerId });
            emit("snapshot", snapshot());
        },
        renamePlayer: (playerId, name) => {
            const client = findClient(pool, playerId);
            client.rename(name);
            emit("snapshot", snapshot());
        },
        connect: (playerId) => {
            findClient(pool, playerId).connect();
            emit("snapshot", snapshot());
        },
        disconnect: (playerId) => {
            findClient(pool, playerId).disconnect();
            emit("snapshot", snapshot());
        },
        sendRoomMessage: (type, data) => {
            pool.activeClient().sendRoomMessage(type, data);
        },
        sendGameMessage: (type, data) => {
            pool.activeClient().transport.send({
                type,
                data: data ?? {},
                playerId: pool.activeClient().identity().id,
                playerName: pool.activeClient().identity().name,
            });
        },
        getEventLog: (filter) => {
            const limit = filter?.limit ?? 500;
            const merged = pool
                .clients()
                .flatMap((client) =>
                    client.transport.messageLog().map((entry) => ({
                        ...entry,
                        playerId: client.identity().id,
                    })),
                )
                .filter((entry) => {
                    if (filter?.playerId && entry.playerId !== filter.playerId) {
                        return false;
                    }
                    if (filter?.direction && entry.direction !== filter.direction) {
                        return false;
                    }
                    if (
                        filter?.typePrefix &&
                        !entry.type.startsWith(filter.typePrefix)
                    ) {
                        return false;
                    }
                    if (filter?.since !== undefined && entry.id <= filter.since) {
                        return false;
                    }
                    return true;
                })
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(-limit);
            return merged;
        },
        getRoomState: (playerId) => findClient(pool, playerId).roomState(),
        getGameView: (playerId) => {
            const client = findClient(pool, playerId);
            const roomState = client.roomState();
            const activeGame = roomState?.activeGameType;
            if (!activeGame) return null;
            const stateType =
                activeGame === "quiz"
                    ? "__quiz_no_state__"
                    : `${activeGame.replace(/_/g, activeGame.includes(":") ? "" : "_")}:state`;
            const prefixMap: Record<string, string> = {
                go_fish: "go_fish:state",
                poker: "poker:state",
                backwards_poker: "poker:state",
                blackjack: "blackjack:state",
                yahtzee: "yahtzee:state",
                lying_yahtzee: "yahtzee:state",
                perudo: "perudo:state",
                rps: "rps:state",
                herd: "herd:state",
                fun_facts: "fun_facts:state",
                cheese_thief: "cheese_thief:state",
                cockroach_poker: "cockroach_poker:state",
                flip_7: "flip_7:state",
                skull: "skull:state",
                spicy: "spicy:state",
            };
            const type = prefixMap[activeGame];
            if (!type) return null;
            const latest = client.transport.latest(type) as { data?: unknown } | null;
            return latest?.data ?? null;
        },
        on,
        clearDevPlayers: () => {
            pool.clearDevPlayers();
            emit("snapshot", snapshot());
        },
    };
}

export function fillGamePlayerCount(pool: RoomClientPool): number {
    const roomState = pool.activeClient().roomState();
    const gameType = roomState?.selectedGameType ?? "quiz";
    const rules = GAME_RULES[gameType];
    const joined = roomState?.players.length ?? 0;
    const target = rules.maxPlayers ?? rules.minPlayers;
    const needed = Math.max(0, target - joined);
    if (needed > 0) {
        pool.addPlayers(needed);
    }
    return needed;
}

declare global {
    interface Window {
        __PARTY_DEVTOOLS__?: PartyDevtoolsApi;
    }
}

export function installPartyDevtoolsApi(pool: RoomClientPool) {
    if (!import.meta.env.DEV || typeof window === "undefined") return;
    window.__PARTY_DEVTOOLS__ = createPartyDevtoolsApi(pool);
}
