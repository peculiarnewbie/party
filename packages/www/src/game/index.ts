const messageTypes = ["join", "leave", "start", "end", "info"] as const;
export type MessageType = (typeof messageTypes)[number];

const roomType = ["lobby", "quiz", "rps"] as const;
type RoomType = (typeof roomType)[number];

const playersStorage = "players";

export const server = () => ({
    processMessage: (message: string) => {},
    addPlayer: async (ctx: DurableObjectState, name: string) => {
        let value: { id: string; name: string }[] =
            (await ctx.storage.get(playersStorage)) || [];
        const id = crypto.randomUUID();
        value.push({ id, name });
        await ctx.storage.put(playersStorage, value);
        return value;
    },
    removePlayer: async (ctx: DurableObjectState, id: string) => {
        let value: { id: string; name: string }[] =
            (await ctx.storage.get(playersStorage)) || [];
        value = value.filter(({ id: playerId }) => playerId !== id);
        await ctx.storage.put(playersStorage, value);
        return value;
    },
    getPlayers: async (ctx: DurableObjectState) => {
        return (await ctx.storage.get(playersStorage)) || [];
    },
});
