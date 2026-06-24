import { createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { nanoid } from "nanoid";
import { getCookie, setCookie } from "~/utils/cookies";
import {
    clearPersistedDevRoom,
    defaultPersistedDevRoom,
    loadPersistedDevRoom,
    savePersistedDevRoom,
} from "./dev-room-persistence";
import { createRoomClient } from "./room-client";
import type { DevPlayerIdentity, PersistedDevRoom, RoomClient, RoomClientPool } from "./types";

const DEV_PLAYER_NAMES = [
    "Alice",
    "Bob",
    "Cara",
    "Dave",
    "Eve",
    "Frank",
    "Grace",
    "Henry",
    "Ivy",
    "Jack",
];

function getOrCreateBrowserPlayerId(): string {
    const existingId = getCookie("playerId");
    if (existingId) return existingId;

    const id = nanoid(10);
    setCookie("playerId", id);
    return id;
}

function nextDevPlayerName(clients: readonly RoomClient[]): string {
    const used = new Set(clients.map((client) => client.identity().name));
    for (const name of DEV_PLAYER_NAMES) {
        if (!used.has(name)) return name;
    }
    return `Player ${clients.length + 1}`;
}

export interface CreateRoomClientPoolOptions {
    roomId: string;
    onPersistedChange?: (state: PersistedDevRoom) => void;
}

export function createRoomClientPool(
    options: CreateRoomClientPoolOptions,
): RoomClientPool {
    const browserPlayerId = getOrCreateBrowserPlayerId();
    const browserName = getCookie("playerName") ?? "";
    const persisted = loadPersistedDevRoom(options.roomId);

    const clientMap = new Map<string, RoomClient>();
    const browserIdentity: DevPlayerIdentity = {
        id: browserPlayerId,
        name: browserName,
        origin: "browser",
    };

    const browserClient = createRoomClient({
        roomId: options.roomId,
        identity: browserIdentity,
        autoConnect: true,
    });
    clientMap.set(browserPlayerId, browserClient);

    for (const player of persisted?.players ?? []) {
        if (player.id === browserPlayerId) continue;
        const client = createRoomClient({
            roomId: options.roomId,
            identity: {
                id: player.id,
                name: player.name,
                origin: "simulated",
            },
            autoConnect: player.autoConnect,
        });
        clientMap.set(player.id, client);
    }

    const initialActiveId =
        persisted?.activePlayerId && clientMap.has(persisted.activePlayerId)
            ? persisted.activePlayerId
            : browserPlayerId;

    const [activePlayerId, setActivePlayerId] = createSignal(initialActiveId);
    const [panelOpen, setPanelOpen] = createSignal(persisted?.panelOpen ?? false);
    const [clientVersion, setClientVersion] = createSignal(0);

    const clients = createMemo(() => {
        clientVersion();
        return [...clientMap.values()];
    });
    const activeClient = createMemo(() => {
        const id = activePlayerId();
        return clientMap.get(id) ?? browserClient;
    });

    const buildPersistedState = (): PersistedDevRoom => ({
        version: 1,
        activePlayerId: activePlayerId(),
        players: clients()
            .filter((client) => client.identity().origin === "simulated")
            .map((client) => ({
                id: client.identity().id,
                name: client.identity().name,
                autoConnect: client.status() !== "disconnected",
            })),
        panelOpen: panelOpen(),
        selectedTab: persisted?.selectedTab ?? "players",
    });

    createEffect(() => {
        const state = buildPersistedState();
        savePersistedDevRoom(options.roomId, state);
        options.onPersistedChange?.(state);
    });

    const setActivePlayer = (playerId: string) => {
        if (!clientMap.has(playerId)) return;
        setActivePlayerId(playerId);
    };

    const addPlayer = (name?: string) => {
        const id = nanoid(10);
        const playerName = name?.trim() || nextDevPlayerName(clients());
        const client = createRoomClient({
            roomId: options.roomId,
            identity: {
                id,
                name: playerName,
                origin: "simulated",
            },
            autoConnect: true,
        });
        clientMap.set(id, client);
        setClientVersion((value) => value + 1);
        return client;
    };

    const addPlayers = (count: number) => {
        const created: RoomClient[] = [];
        for (let i = 0; i < count; i++) {
            created.push(addPlayer());
        }
        return created;
    };

    const removePlayer = (playerId: string) => {
        const client = clientMap.get(playerId);
        if (!client || client.identity().origin === "browser") return;

        client.dispose();
        clientMap.delete(playerId);
        setClientVersion((value) => value + 1);

        if (activePlayerId() === playerId) {
            setActivePlayerId(browserPlayerId);
        }
    };

    const dispose = () => {
        for (const client of clientMap.values()) {
            client.dispose();
        }
        clientMap.clear();
    };

    onMount(() => {
        for (const client of clientMap.values()) {
            if (client.status() === "disconnected") {
                client.connect();
            }
        }
    });

    onCleanup(() => {
        dispose();
    });

    return {
        roomId: options.roomId,
        clients,
        activeClient,
        setActivePlayer,
        addPlayer,
        addPlayers,
        removePlayer,
        dispose,
        panelOpen,
        setPanelOpen,
        clearDevPlayers: () => {
            for (const client of [...clientMap.values()]) {
                if (client.identity().origin === "simulated") {
                    client.dispose();
                    clientMap.delete(client.identity().id);
                }
            }
            setClientVersion((value) => value + 1);
            clearPersistedDevRoom(options.roomId);
            setActivePlayerId(browserPlayerId);
        },
    };
}