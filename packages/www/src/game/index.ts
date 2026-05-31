import { Effect, Schema } from "effect";

import {
    decodeWithSchema,
    encodeJsonMessage,
    extractMessageType,
    RoomMessageDecodeError,
} from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { emptyDataSchema } from "~/game/shared/wire-schemas";
import {
    nullablePlayerIdSchema,
    playerIdSchema,
    type PlayerId,
} from "~/game/shared/branded-ids";

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

export const roomPhaseSchema = Schema.Literals([
    "lobby",
    "playing",
    "hibernated",
] as const);
export const gameTypeSchema = Schema.Literals(gameTypes);

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

export const gameWirePrefixes = [
    "go_fish:",
    "poker:",
    "blackjack:",
    "yahtzee:",
    "perudo:",
    "rps:",
    "herd:",
    "fun_facts:",
    "cheese_thief:",
    "cockroach_poker:",
    "flip_7:",
    "skull:",
    "spicy:",
] as const;

export function isGameWireMessageType(type: string): boolean {
    return gameWirePrefixes.some((prefix) => type.startsWith(prefix));
}

export type RoomPhase = SchemaType<typeof roomPhaseSchema>;

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

export const playerSchema = Schema.Struct({
    id: Schema.mutableKey(playerIdSchema),
    name: Schema.mutableKey(Schema.String),
    score: Schema.optionalKey(Schema.mutableKey(Schema.Number)),
});

export const gameParticipantSchema = Schema.Struct({
    playerId: Schema.mutableKey(playerIdSchema),
    status: Schema.mutableKey(
        Schema.Literals(["active", "disconnected", "left_game"] as const),
    ),
});

export const gameStateSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(playerSchema))),
    hostId: Schema.mutableKey(nullablePlayerIdSchema),
    answers: Schema.mutableKey(Schema.Record(Schema.String, Schema.String)),
    phase: Schema.mutableKey(roomPhaseSchema),
    selectedGameType: Schema.mutableKey(gameTypeSchema),
    activeGameType: Schema.mutableKey(Schema.NullOr(gameTypeSchema)),
    gameSessionId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    gameParticipants: Schema.mutableKey(
        Schema.mutable(Schema.Array(gameParticipantSchema)),
    ),
});

export const roomStatePayloadSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(playerSchema))),
    hostId: Schema.mutableKey(nullablePlayerIdSchema),
    phase: Schema.mutableKey(roomPhaseSchema),
    selectedGameType: Schema.mutableKey(gameTypeSchema),
    activeGameType: Schema.mutableKey(Schema.NullOr(gameTypeSchema)),
    gameSessionId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    gameParticipants: Schema.mutableKey(
        Schema.mutable(Schema.Array(gameParticipantSchema)),
    ),
});

export type Player = SchemaType<typeof playerSchema>;
export type GameParticipant = SchemaType<typeof gameParticipantSchema>;
export type GameState = SchemaType<typeof gameStateSchema>;
export type RoomStatePayload = SchemaType<typeof roomStatePayloadSchema>;

export { playerIdSchema, nullablePlayerIdSchema, parsePlayerId } from "~/game/shared/branded-ids";
export type { PlayerId } from "~/game/shared/branded-ids";

export type RoomProcessResult =
    | { kind: "none" }
    | { kind: "start"; gameType: GameType }
    | { kind: "end"; gameType: GameType | null }
    | { kind: "return_to_lobby" }
    | { kind: "leave_game"; gameType: GameType; playerId: PlayerId };

const selectGameClientDataSchema = Schema.Struct({
    gameType: Schema.mutableKey(gameTypeSchema),
});

const answerClientDataSchema = Schema.Struct({
    answer: Schema.mutableKey(Schema.String),
});

export const clientMessageSchema = Schema.Union([
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("identify")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("join")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("leave")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("leave_game")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("resume_room")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("restart_room")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("select_game")),
        data: Schema.mutableKey(selectGameClientDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("start")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("end")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("return_to_lobby")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("info")),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        playerId: Schema.mutableKey(playerIdSchema),
        playerName: Schema.mutableKey(Schema.String),
        type: Schema.mutableKey(Schema.Literal("answer")),
        data: Schema.mutableKey(answerClientDataSchema),
    }),
]);

const playerAnsweredPayloadSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(playerSchema))),
    answers: Schema.mutableKey(Schema.Record(Schema.String, Schema.String)),
});

export const serverMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("room_state")),
        data: Schema.mutableKey(roomStatePayloadSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("player_answered")),
        data: Schema.mutableKey(playerAnsweredPayloadSchema),
    }),
]);

export type ClientMessage = SchemaType<typeof clientMessageSchema>;
export type ServerMessage = SchemaType<typeof serverMessageSchema>;

const clientMessageJsonSchema = Schema.fromJsonString(clientMessageSchema);

export function decodeClientMessage(
    raw: unknown,
): Effect.Effect<ClientMessage, RoomMessageDecodeError, never> {
    return decodeWithSchema(clientMessageSchema, raw, (issue, value) => {
        return new RoomMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function decodeServerMessage(
    raw: unknown,
): Effect.Effect<ServerMessage, RoomMessageDecodeError, never> {
    return decodeWithSchema(serverMessageSchema, raw, (issue, value) => {
        return new RoomMessageDecodeError({
            issue,
            messageType: extractMessageType(value),
        });
    });
}

export function encodeServerMessage(message: ServerMessage): string {
    return encodeJsonMessage(serverMessageSchema, message);
}

function buildRoomStatePayload(state: GameState): RoomStatePayload {
    return {
        players: state.players,
        hostId: state.hostId,
        phase: state.phase,
        selectedGameType: state.selectedGameType,
        activeGameType: state.activeGameType,
        gameSessionId: state.gameSessionId,
        gameParticipants: state.gameParticipants,
    };
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
                data: buildRoomStatePayload(state),
            }),
        );
    };

    const assignNextHost = () => {
        state.hostId = state.players[0]?.id ?? null;
        return state.hostId;
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
            s.addPlayer(playerId, playerName);
            s.getOrSetHost(playerId);
            broadcastRoomState(broadcast);
            return { kind: "none" };
        }

        if (type === "leave") {
            s.removePlayer(playerId);
            broadcastRoomState(broadcast);
            return { kind: "none" };
        }

        if (type === "select_game") {
            if (state.phase !== "lobby" || state.hostId !== playerId) {
                return { kind: "none" };
            }

            state.selectedGameType = parsed.data.gameType;
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
            broadcastRoomState(broadcast);
            return { kind: "start", gameType: state.activeGameType };
        }

        if (type === "end") {
            if (state.phase !== "playing" || state.hostId !== playerId) {
                return { kind: "none" };
            }

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
            s.saveAnswer(playerId, parsed.data.answer);
            broadcast(
                encodeServerMessage({
                    type: "player_answered",
                    data: {
                        players: s.getPlayers(),
                        answers: s.getAnswers(),
                    },
                }),
            );
        }

        return { kind: "none" };
    };

    return {
        getOrSetHost: (playerId: PlayerId): PlayerId => {
            if (state.hostId) return state.hostId;
            state.hostId = playerId;
            return playerId;
        },

        addPlayer: (playerId: PlayerId, name: string) => {
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

        removePlayer: (playerId: PlayerId) => {
            state.players = state.players.filter(({ id }) => id !== playerId);

            if (state.phase === "lobby" && state.hostId === playerId) {
                assignNextHost();
            }

            return state.players;
        },

        getPlayers: () => state.players,

        getHostId: (): PlayerId | null => state.hostId,

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

        getGameParticipant: (playerId: PlayerId) =>
            state.gameParticipants.find(
                (participant) => participant.playerId === playerId,
            ) ?? null,

        setGameParticipantStatus: (
            playerId: PlayerId,
            status: GameParticipantStatus,
        ) => {
            const participant = state.gameParticipants.find(
                (item) => item.playerId === playerId,
            );
            if (!participant) return null;
            participant.status = status;
            return participant;
        },

        saveAnswer: (playerId: PlayerId, answer: string) => {
            state.answers = {
                ...state.answers,
                [playerId]: answer,
            };
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
            const parsed: ClientMessage | null = await Effect.runPromise(
                decodeWithSchema(clientMessageJsonSchema, message, (issue) => {
                    return new RoomMessageDecodeError({
                        issue,
                    });
                }).pipe(
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
