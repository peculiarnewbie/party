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

const roomType = ["lobby", "quiz", "rps"] as const;
type RoomType = (typeof roomType)[number];

const playersStorage = "players";
const hostIdStorage = "hostId";

export interface Player {
    id: string;
    name: string;
    score?: number;
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
    ]),
    data: z.record(z.string(), z.unknown()),
});

export type ServerMessage = z.output<typeof serverMessageSchema>;

export const server = (ctx: DurableObjectState) => ({
    getOrSetHost: async (playerId: string) => {
        const existing = await ctx.storage.get(hostIdStorage);
        if (existing) return existing as string;
        await ctx.storage.put(hostIdStorage, playerId);
        return playerId;
    },

    addPlayer: async (playerId: string, name: string) => {
        let players: Player[] = (await ctx.storage.get(playersStorage)) || [];

        const existingIndex = players.findIndex((p) => p.id === playerId);
        if (existingIndex >= 0) {
            players[existingIndex].name = name;
            await ctx.storage.put(playersStorage, players);
            return players;
        }

        players.push({ id: playerId, name, score: 0 });
        await ctx.storage.put(playersStorage, players);
        return players;
    },

    removePlayer: async (playerId: string) => {
        let players: Player[] = (await ctx.storage.get(playersStorage)) || [];
        players = players.filter(({ id }) => id !== playerId);
        await ctx.storage.put(playersStorage, players);
        return players;
    },

    getPlayers: async () => {
        return (await ctx.storage.get(playersStorage)) as Player[] | undefined;
    },

    getHostId: async () => {
        return (await ctx.storage.get(hostIdStorage)) as string | undefined;
    },

    processMessage: async (
        message: string,
        broadcast: (msg: string) => void,
    ) => {
        const json = JSON.parse(message);

        const safeParsed = z.safeParse(clientMessageSchema, json);

        if (!safeParsed.success)
            return { error: "failed parsing client message" };

        const parsed = safeParsed.data;

        const { playerId, playerName, type } = parsed;

        if (type === "join") {
            const players = await server(ctx).addPlayer(playerId, playerName);
            const hostId = await server(ctx).getOrSetHost(playerId);
            const isHost = hostId === playerId;

            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players },
                } as ServerMessage),
            );

            if (isHost) {
                broadcast(
                    JSON.stringify({
                        type: "host_assigned",
                        data: { hostId },
                    } as ServerMessage),
                );
            }
        } else if (type === "leave") {
            const players = await server(ctx).removePlayer(playerId);
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
                } as ServerMessage),
            );
        }
    },
});
