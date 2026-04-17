import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    extractMessageType,
    RoomMessageDecodeError,
} from "~/effect/schema-helpers";

export const gameTypes = [
    "quiz",
    "go_fish",
    "poker",
    "backwards_poker",
    "blackjack",
    "yahtzee",
    "lying_yahtzee",
    "perudo",
    "rps",
    "herd",
    "fun_facts",
    "cheese_thief",
    "cockroach_poker",
    "flip_7",
    "skull",
    "spicy",
] as const;
export type GameType = (typeof gameTypes)[number];
export type GameParticipantStatus = "active" | "disconnected" | "left_game";

export interface GameParticipant {
    playerId: string;
    status: GameParticipantStatus;
}

export const GAME_RULES: Record<
    GameType,
    { label: string; minPlayers: number; maxPlayers: number | null }
> = {
    quiz: {
        label: "Quiz",
        minPlayers: 2,
        maxPlayers: null,
    },
    go_fish: {
        label: "Go Fish",
        minPlayers: 2,
        maxPlayers: 6,
    },
    poker: {
        label: "Texas Hold'em",
        minPlayers: 2,
        maxPlayers: 8,
    },
    backwards_poker: {
        label: "Backwards Poker",
        minPlayers: 2,
        maxPlayers: 8,
    },
    blackjack: {
        label: "Blackjack",
        minPlayers: 1,
        maxPlayers: 7,
    },
    yahtzee: {
        label: "Yahtzee",
        minPlayers: 2,
        maxPlayers: 10,
    },
    lying_yahtzee: {
        label: "Lying Yahtzee",
        minPlayers: 2,
        maxPlayers: 2,
    },
    perudo: {
        label: "Perudo",
        minPlayers: 2,
        maxPlayers: 8,
    },
    rps: {
        label: "RPS Tournament",
        minPlayers: 2,
        maxPlayers: null,
    },
    herd: {
        label: "Herd Mentality",
        minPlayers: 3,
        maxPlayers: null,
    },
    fun_facts: {
        label: "Fun Facts",
        minPlayers: 3,
        maxPlayers: null,
    },
    cheese_thief: {
        label: "Cheese Thief",
        minPlayers: 4,
        maxPlayers: 8,
    },
    cockroach_poker: {
        label: "Cockroach Poker",
        minPlayers: 3,
        maxPlayers: 6,
    },
    flip_7: {
        label: "Flip 7",
        minPlayers: 3,
        maxPlayers: null,
    },
    skull: {
        label: "Skull",
        minPlayers: 3,
        maxPlayers: 6,
    },
    spicy: {
        label: "Spicy",
        minPlayers: 3,
        maxPlayers: 6,
    },
};

export function isPokerGameType(
    gameType: GameType | null,
): gameType is "poker" | "backwards_poker" {
    return gameType === "poker" || gameType === "backwards_poker";
}

export type RoomPhase = "lobby" | "playing" | "hibernated";

export const messageTypes = [
    "identify",
    "join",
    "leave",
    "leave_game",
    "resume_room",
    "restart_room",
    "select_game",
    "start",
    "end",
    "return_to_lobby",
    "info",
    "answer",
] as const;
export type MessageType = (typeof messageTypes)[number];

export interface Player {
    id: string;
    name: string;
    score?: number;
}

export interface GameState {
    players: Player[];
    hostId: string | null;
    answers: Record<string, string>;
    phase: RoomPhase;
    selectedGameType: GameType;
    activeGameType: GameType | null;
    gameSessionId: string | null;
    gameParticipants: GameParticipant[];
}

export interface RoomStatePayload {
    players: Player[];
    hostId: string | null;
    phase: RoomPhase;
    selectedGameType: GameType;
    activeGameType: GameType | null;
    gameSessionId: string | null;
    gameParticipants: GameParticipant[];
}

export type RoomProcessResult =
    | { kind: "none" }
    | { kind: "start"; gameType: GameType }
    | { kind: "end"; gameType: GameType | null }
    | { kind: "return_to_lobby" }
    | { kind: "leave_game"; gameType: GameType; playerId: string };

export type ClientMessage = {
    playerId: string;
    playerName: string;
    type: MessageType;
    data: Record<string, unknown>;
};

export type ServerMessage = {
    type:
        | "player_list"
        | "host_assigned"
        | "room_state"
        | "game_selected"
        | "game_started"
        | "game_ended"
        | "player_answered";
    data: Record<string, unknown>;
};

const playerSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    score: Schema.optionalKey(Schema.mutableKey(Schema.Number)),
});

const gameParticipantSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    status: Schema.mutableKey(
        Schema.Literals(["active", "disconnected", "left_game"] as const),
    ),
});

export const clientMessageSchema = Schema.Struct({
    playerId: Schema.mutableKey(Schema.String),
    playerName: Schema.mutableKey(Schema.String),
    type: Schema.mutableKey(Schema.Literals(messageTypes)),
    data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
});

export const serverMessageSchema = Schema.Struct({
    type: Schema.mutableKey(
        Schema.Literals([
            "player_list",
            "host_assigned",
            "room_state",
            "game_selected",
            "game_started",
            "game_ended",
            "player_answered",
        ] as const),
    ),
    data: Schema.mutableKey(Schema.Record(Schema.String, Schema.Unknown)),
});

const roomStatePayloadSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(playerSchema))),
    hostId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    phase: Schema.mutableKey(
        Schema.Literals(["lobby", "playing", "hibernated"] as const),
    ),
    selectedGameType: Schema.mutableKey(Schema.Literals(gameTypes)),
    activeGameType: Schema.mutableKey(Schema.NullOr(Schema.Literals(gameTypes))),
    gameSessionId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    gameParticipants: Schema.mutableKey(
        Schema.mutable(Schema.Array(gameParticipantSchema)),
    ),
});

export function decodeClientMessage(
    raw: unknown,
): Effect.Effect<ClientMessage, RoomMessageDecodeError, never> {
    return decodeWithSchema(clientMessageSchema, raw, (issue, value) => {
        return new RoomMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<ClientMessage, RoomMessageDecodeError, never>;
}

export function decodeServerMessage(
    raw: unknown,
): Effect.Effect<ServerMessage, RoomMessageDecodeError, never> {
    return decodeWithSchema(serverMessageSchema, raw, (issue, value) => {
        return new RoomMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    }) as Effect.Effect<ServerMessage, RoomMessageDecodeError, never>;
}

export function encodeServerMessage(message: ServerMessage): string {
    return JSON.stringify(
        Schema.encodeUnknownSync(serverMessageSchema)(message),
    );
}

function buildRoomStatePayload(state: GameState): RoomStatePayload {
    return Schema.decodeUnknownSync(roomStatePayloadSchema)({
        players: state.players,
        hostId: state.hostId,
        phase: state.phase,
        selectedGameType: state.selectedGameType,
        activeGameType: state.activeGameType,
        gameSessionId: state.gameSessionId,
        gameParticipants: state.gameParticipants,
    }) as RoomStatePayload;
}

function canStartGame(
    gameType: GameType,
    playerCount: number,
): { ok: true } | { ok: false; reason: string } {
    const rules = GAME_RULES[gameType];
    if (playerCount < rules.minPlayers) {
        return {
            ok: false,
            reason: `Need at least ${rules.minPlayers} players for ${rules.label}`,
        };
    }

    if (rules.maxPlayers !== null && playerCount > rules.maxPlayers) {
        return {
            ok: false,
            reason: `${rules.label} supports up to ${rules.maxPlayers} players`,
        };
    }

    return { ok: true };
}

export const server = (state: GameState) => {
    const broadcastRoomState = (broadcast: (msg: string) => void) => {
        broadcast(
            encodeServerMessage({
                type: "room_state",
                data: buildRoomStatePayload(state) as unknown as Record<
                    string,
                    unknown
                >,
            }),
        );
    };

    const assignNextHost = () => {
        state.hostId = state.players[0]?.id ?? null;
        return state.hostId;
    };

    const broadcastServerMessage = (
        broadcast: (msg: string) => void,
        message: ServerMessage,
    ) => {
        broadcast(encodeServerMessage(message));
    };

    const processClientMessage = async (
        parsed: ClientMessage,
        broadcast: (msg: string) => void,
        opts?: {
            createGameSession?: (gameType: GameType) => {
                gameSessionId: string;
                participants: GameParticipant[];
            };
        },
    ): Promise<RoomProcessResult> => {
        const { playerId, playerName, type } = parsed;
        const s = server(state);

        if (type === "identify") {
            return { kind: "none" };
        }

        if (type === "join") {
            const players = s.addPlayer(playerId, playerName);
            const hostId = s.getOrSetHost(playerId);

            broadcastServerMessage(broadcast, {
                type: "player_list",
                data: { players },
            });

            broadcastServerMessage(broadcast, {
                type: "host_assigned",
                data: { hostId },
            });

            broadcastRoomState(broadcast);
            return { kind: "none" };
        }

        if (type === "leave") {
            const players = s.removePlayer(playerId);
            broadcastServerMessage(broadcast, {
                type: "player_list",
                data: { players },
            });
            broadcastServerMessage(broadcast, {
                type: "host_assigned",
                data: { hostId: state.hostId },
            });
            broadcastRoomState(broadcast);
            return { kind: "none" };
        }

        if (type === "select_game") {
            if (state.phase !== "lobby" || state.hostId !== playerId) {
                return { kind: "none" };
            }

            const gameType = parsed.data.gameType;
            if (!gameTypes.includes(gameType as GameType)) {
                return { kind: "none" };
            }

            state.selectedGameType = gameType as GameType;
            broadcastServerMessage(broadcast, {
                type: "game_selected",
                data: { gameType: state.selectedGameType },
            });
            broadcastRoomState(broadcast);
            return { kind: "none" };
        }

        if (type === "start") {
            if (state.phase !== "lobby" || state.hostId !== playerId) {
                return { kind: "none" };
            }

            const validation = canStartGame(
                state.selectedGameType,
                state.players.length,
            );
            if (!validation.ok) {
                return { kind: "none" };
            }

            state.phase = "playing";
            state.activeGameType = state.selectedGameType;
            const session = opts?.createGameSession?.(state.activeGameType);
            if (session) {
                s.setGameSession(session.gameSessionId, session.participants);
            }
            broadcastServerMessage(broadcast, {
                type: "game_started",
                data: { gameType: state.activeGameType },
            });
            broadcastRoomState(broadcast);
            return { kind: "start", gameType: state.activeGameType };
        }

        if (type === "end") {
            if (state.phase !== "playing" || state.hostId !== playerId) {
                return { kind: "none" };
            }

            broadcastServerMessage(broadcast, {
                type: "game_ended",
                data: { gameType: state.activeGameType },
            });
            return { kind: "end", gameType: state.activeGameType };
        }

        if (type === "return_to_lobby") {
            if (state.hostId !== playerId) {
                return { kind: "none" };
            }

            state.phase = "lobby";
            state.activeGameType = null;
            state.answers = {};
            s.clearGameSession();
            broadcastRoomState(broadcast);
            return { kind: "return_to_lobby" };
        }

        if (type === "leave_game") {
            if (state.phase !== "playing" || !state.activeGameType) {
                return { kind: "none" };
            }

            const participant = s.getGameParticipant(playerId);
            if (!participant || participant.status === "left_game") {
                return { kind: "none" };
            }

            participant.status = "left_game";
            broadcastRoomState(broadcast);
            return {
                kind: "leave_game",
                gameType: state.activeGameType,
                playerId,
            };
        }

        if (type === "answer") {
            const answer = parsed.data.answer as string;
            s.saveAnswer(playerId, answer);
            broadcastServerMessage(broadcast, {
                type: "player_answered",
                data: {
                    players: s.getPlayers(),
                    answers: s.getAnswers(),
                },
            });
        }

        return { kind: "none" };
    };

    return {
        getOrSetHost: (playerId: string) => {
            if (state.hostId) return state.hostId;
            state.hostId = playerId;
            return playerId;
        },

        addPlayer: (playerId: string, name: string) => {
            const existingIndex = state.players.findIndex(
                (p) => p.id === playerId,
            );
            if (existingIndex >= 0) {
                state.players[existingIndex].name = name;
                return state.players;
            }
            state.players.push({ id: playerId, name, score: 0 });
            return state.players;
        },

        removePlayer: (playerId: string) => {
            state.players = state.players.filter(({ id }) => id !== playerId);

            if (state.phase === "lobby" && state.hostId === playerId) {
                assignNextHost();
            }

            return state.players;
        },

        getPlayers: () => state.players,

        getHostId: () => state.hostId,

        getRoomState: () => buildRoomStatePayload(state),

        setGameSession: (
            gameSessionId: string,
            participants: GameParticipant[],
        ) => {
            state.gameSessionId = gameSessionId;
            state.gameParticipants = participants;
        },

        clearGameSession: () => {
            state.gameSessionId = null;
            state.gameParticipants = [];
        },

        getGameParticipant: (playerId: string) =>
            state.gameParticipants.find(
                (participant) => participant.playerId === playerId,
            ) ?? null,

        setGameParticipantStatus: (
            playerId: string,
            status: GameParticipantStatus,
        ) => {
            const participant = state.gameParticipants.find(
                (item) => item.playerId === playerId,
            );
            if (!participant) return null;
            participant.status = status;
            return participant;
        },

        saveAnswer: (playerId: string, answer: string) => {
            state.answers[playerId] = answer;
            return state.answers;
        },

        getAnswers: () => state.answers,

        processClientMessage,

        processMessage: async (
            message: string,
            broadcast: (msg: string) => void,
            opts?: {
                createGameSession?: (gameType: GameType) => {
                    gameSessionId: string;
                    participants: GameParticipant[];
                };
            },
        ): Promise<RoomProcessResult> => {
            let json: unknown;
            try {
                json = JSON.parse(message);
            } catch {
                return { kind: "none" };
            }

            const parsed: ClientMessage | null = await Effect.runPromise(
                decodeClientMessage(json).pipe(
                    Effect.catchTag("RoomMessageDecodeError", () =>
                        Effect.succeed(null),
                    ),
                ),
            );

            if (!parsed) {
                return { kind: "none" };
            }

            return processClientMessage(parsed, broadcast, opts);
        },
    };
};

export function getGameStartValidation(
    gameType: GameType,
    playerCount: number,
): { canStart: boolean; reason: string | null } {
    const result = canStartGame(gameType, playerCount);
    if (result.ok) {
        return { canStart: true, reason: null };
    }

    return { canStart: false, reason: result.reason };
}
