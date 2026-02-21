import z from "zod";

export const messageTypes = [
    "join",
    "leave",
    "start",
    "end",
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
}

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
        "game_started",
        "player_answered",
    ]),
    data: z.record(z.string(), z.unknown()),
});

export type ServerMessage = z.output<typeof serverMessageSchema>;

export const server = (state: GameState) => ({
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
        return state.players;
    },

    getPlayers: () => state.players,

    getHostId: () => state.hostId,

    saveAnswer: (playerId: string, answer: string) => {
        state.answers[playerId] = answer;
        return state.answers;
    },

    getAnswers: () => state.answers,

    processMessage: async (
        message: string,
        broadcast: (msg: string) => void,
    ) => {
        const json = JSON.parse(message);

        const safeParsed = clientMessageSchema.safeParse(json);

        if (!safeParsed.success)
            return { error: "failed parsing client message" };

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

            if (hostId === playerId) {
                broadcast(
                    JSON.stringify({
                        type: "host_assigned",
                        data: { hostId },
                    } as ServerMessage),
                );
            }
        } else if (type === "leave") {
            const players = s.removePlayer(playerId);
            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players },
                } as ServerMessage),
            );
        } else if (type === "start") {
            broadcast(
                JSON.stringify({
                    type: "game_started",
                    data: { gameType: "quiz" },
                } as ServerMessage),
            );
        } else if (type === "answer") {
            const answer = parsed.data.answer as string;
            s.saveAnswer(playerId, answer);
            broadcast(
                JSON.stringify({
                    type: "player_answered",
                    data: { players: s.getPlayers(), answers: s.getAnswers() },
                } as ServerMessage),
            );
        }
    },
});
