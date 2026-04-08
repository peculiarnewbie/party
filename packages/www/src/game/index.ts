import z from "zod";

export const gameTypes = [
    "quiz",
    "go_fish",
    "poker",
    "backwards_poker",
    "blackjack",
    "yahtzee",
    "lying_yahtzee",
] as const;
export type GameType = (typeof gameTypes)[number];

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
};

export function isPokerGameType(
    gameType: GameType | null,
): gameType is "poker" | "backwards_poker" {
    return gameType === "poker" || gameType === "backwards_poker";
}

export type RoomPhase = "lobby" | "playing";

export const messageTypes = [
    "join",
    "leave",
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
}

export interface RoomStatePayload {
    players: Player[];
    hostId: string | null;
    phase: RoomPhase;
    selectedGameType: GameType;
    activeGameType: GameType | null;
}

export type RoomProcessResult =
    | { kind: "none" }
    | { kind: "start"; gameType: GameType }
    | { kind: "end"; gameType: GameType | null }
    | { kind: "return_to_lobby" };

export const clientMessageSchema = z.object({
    playerId: z.string(),
    playerName: z.string(),
    type: z.enum(messageTypes),
    data: z.record(z.string(), z.unknown()),
});

export type ClientMessage = z.output<typeof clientMessageSchema>;

export const serverMessageSchema = z.object({
    type: z.enum([
        "player_list",
        "host_assigned",
        "room_state",
        "game_selected",
        "game_started",
        "game_ended",
        "player_answered",
    ]),
    data: z.record(z.string(), z.unknown()),
});

export type ServerMessage = z.output<typeof serverMessageSchema>;

function buildRoomStatePayload(state: GameState): RoomStatePayload {
    return {
        players: state.players,
        hostId: state.hostId,
        phase: state.phase,
        selectedGameType: state.selectedGameType,
        activeGameType: state.activeGameType,
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
            JSON.stringify({
                type: "room_state",
                data: buildRoomStatePayload(state) as unknown as Record<
                    string,
                    unknown
                >,
            } as ServerMessage),
        );
    };

    const assignNextHost = () => {
        state.hostId = state.players[0]?.id ?? null;
        return state.hostId;
    };

    return {
        getOrSetHost: (playerId: string) => {
            if (state.hostId) return state.hostId;
            state.hostId = playerId;
            return playerId;
        },

        addPlayer: (playerId: string, name: string) => {
            const existingIndex = state.players.findIndex((p) => p.id === playerId);
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

        saveAnswer: (playerId: string, answer: string) => {
            state.answers[playerId] = answer;
            return state.answers;
        },

        getAnswers: () => state.answers,

        processMessage: async (
            message: string,
            broadcast: (msg: string) => void,
        ): Promise<RoomProcessResult> => {
            const json = JSON.parse(message);

            const safeParsed = clientMessageSchema.safeParse(json);

            if (!safeParsed.success) {
                return { kind: "none" };
            }

            const parsed = safeParsed.data;
            const { playerId, playerName, type } = parsed;
            const s = server(state);

            if (type === "join") {
                const players = s.addPlayer(playerId, playerName);
                const hostId = s.getOrSetHost(playerId);

                broadcast(
                    JSON.stringify({
                        type: "player_list",
                        data: { players },
                    } as ServerMessage),
                );

                broadcast(
                    JSON.stringify({
                        type: "host_assigned",
                        data: { hostId },
                    } as ServerMessage),
                );

                broadcastRoomState(broadcast);
                return { kind: "none" };
            }

            if (type === "leave") {
                const players = s.removePlayer(playerId);
                broadcast(
                    JSON.stringify({
                        type: "player_list",
                        data: { players },
                    } as ServerMessage),
                );
                broadcast(
                    JSON.stringify({
                        type: "host_assigned",
                        data: { hostId: state.hostId },
                    } as ServerMessage),
                );
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
                broadcast(
                    JSON.stringify({
                        type: "game_selected",
                        data: { gameType: state.selectedGameType },
                    } as ServerMessage),
                );
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
                broadcast(
                    JSON.stringify({
                        type: "game_started",
                        data: { gameType: state.activeGameType },
                    } as ServerMessage),
                );
                broadcastRoomState(broadcast);
                return { kind: "start", gameType: state.activeGameType };
            }

            if (type === "end") {
                if (state.phase !== "playing" || state.hostId !== playerId) {
                    return { kind: "none" };
                }

                broadcast(
                    JSON.stringify({
                        type: "game_ended",
                        data: { gameType: state.activeGameType },
                    } as ServerMessage),
                );
                return { kind: "end", gameType: state.activeGameType };
            }

            if (type === "return_to_lobby") {
                if (state.hostId !== playerId) {
                    return { kind: "none" };
                }

                state.phase = "lobby";
                state.activeGameType = null;
                state.answers = {};
                broadcastRoomState(broadcast);
                return { kind: "return_to_lobby" };
            }

            if (type === "answer") {
                const answer = parsed.data.answer as string;
                s.saveAnswer(playerId, answer);
                broadcast(
                    JSON.stringify({
                        type: "player_answered",
                        data: { players: s.getPlayers(), answers: s.getAnswers() },
                    } as ServerMessage),
                );
            }

            return { kind: "none" };
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
