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

interface Player {
    id: string;
    name: string;
    score?: number;
}

interface ClientMessage {
    playerId: string;
    playerName: string;
    type: string;
    data: Record<string, unknown>;
}

interface ServerMessage {
    type: string;
    data: Record<string, unknown>;
}

export const server = () => ({
    getOrSetHost: async (ctx: DurableObjectState, playerId: string) => {
        const existing = await ctx.storage.get(hostIdStorage);
        if (existing) return existing as string;
        await ctx.storage.put(hostIdStorage, playerId);
        return playerId;
    },

    addPlayer: async (
        ctx: DurableObjectState,
        playerId: string,
        name: string,
    ) => {
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

    removePlayer: async (ctx: DurableObjectState, playerId: string) => {
        let players: Player[] = (await ctx.storage.get(playersStorage)) || [];
        players = players.filter(({ id }) => id !== playerId);
        await ctx.storage.put(playersStorage, players);
        return players;
    },

    getPlayers: async (ctx: DurableObjectState) => {
        return (await ctx.storage.get(playersStorage)) as Player[] | undefined;
    },

    getHostId: async (ctx: DurableObjectState) => {
        return (await ctx.storage.get(hostIdStorage)) as string | undefined;
    },

    processMessage: async (
        message: string,
        send: (msg: string) => void,
        broadcast: (msg: string) => void,
        ctx: DurableObjectState,
    ) => {
        const msg: ClientMessage = JSON.parse(message);
        const { playerId, playerName, type } = msg;

        if (type === "join") {
            const players = await server().addPlayer(ctx, playerId, playerName);
            const hostId = await server().getOrSetHost(ctx, playerId);
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
        }

        if (type === "leave") {
            const players = await server().removePlayer(ctx, playerId);
            broadcast(
                JSON.stringify({
                    type: "player_list",
                    data: { players },
                } as ServerMessage),
            );
        }
    },
});
