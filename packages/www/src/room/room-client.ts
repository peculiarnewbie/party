import { Schema } from "effect";
import { createSignal, type Accessor } from "solid-js";
import {
    type MessageType,
    type RoomStatePayload,
    isGameWireMessageType,
    serverMessageSchema,
} from "~/game";
import { setCookie } from "~/utils/cookies";
import { createWebSocketRoomTransport } from "./room-transport";
import type {
    ConnectionStatus,
    DevPlayerIdentity,
    RoomClient,
} from "./types";

export interface CreateRoomClientOptions {
    roomId: string;
    identity: DevPlayerIdentity;
    autoConnect?: boolean;
}

const defaultRoomState = (): RoomStatePayload => ({
    players: [],
    hostId: null,
    phase: "lobby",
    selectedGameType: "quiz",
    activeGameType: null,
    gameSessionId: null,
    gameParticipants: [],
});

export function createRoomClient(options: CreateRoomClientOptions): RoomClient {
    const origin = options.identity.origin;
    const [identity, setIdentity] = createSignal(options.identity);
    const [roomState, setRoomState] = createSignal<RoomStatePayload | null>(
        null,
    );
    const gameConnections = new Map<string, { connection: unknown }>();

    const transport = createWebSocketRoomTransport({
        roomId: options.roomId,
        playerId: options.identity.id,
        playerName: options.identity.name,
        autoConnect: options.autoConnect ?? true,
    });

    const unsubscribe = transport.subscribe((message) => {
        if (
            typeof message.type === "string" &&
            isGameWireMessageType(message.type)
        ) {
            return;
        }

        try {
            const parsed = Schema.decodeUnknownSync(serverMessageSchema)(message);
            if (parsed.type === "room_state") {
                setRoomState(parsed.data);
                const current = parsed.data.players.find(
                    (player) => player.id === identity().id,
                );
                if (current && current.name !== identity().name) {
                    setIdentity((prev) => ({ ...prev, name: current.name }));
                    if (origin === "browser") {
                        setCookie("playerName", current.name);
                    }
                }
            }
        } catch {
            // ignore malformed room messages
        }
    });

    const sendRoomMessage = (
        type: MessageType,
        data?: Record<string, unknown>,
        nameOverride?: string,
    ) => {
        const current = identity();
        transport.send({
            playerId: current.id,
            playerName: nameOverride ?? current.name,
            type,
            data: data ?? {},
        });
    };

    const getGameConnection = <T>(key: string, factory: () => T): T => {
        const existing = gameConnections.get(key);
        if (existing) {
            return existing.connection as T;
        }
        const connection = factory();
        gameConnections.set(key, { connection });
        return connection;
    };

    const rename = (name: string) => {
        setIdentity((prev) => ({ ...prev, name }));
    };

    const dispose = () => {
        unsubscribe();
        for (const entry of gameConnections.values()) {
            const connection = entry.connection as { dispose?: () => void };
            connection.dispose?.();
        }
        gameConnections.clear();
        transport.dispose();
    };

    return {
        identity,
        transport,
        status: transport.status,
        roomState,
        sendRoomMessage,
        getGameConnection,
        rename,
        connect: () => transport.connect(),
        disconnect: () => transport.disconnect(),
        dispose,
    };
}

export function roomClientPlayerId(client: RoomClient): string {
    return client.identity().id;
}

export function roomClientName(client: RoomClient): string {
    return client.identity().name;
}

export function roomClientRoomState(
    client: RoomClient,
): RoomStatePayload {
    return client.roomState() ?? defaultRoomState();
}

export function roomClientStatus(client: RoomClient): ConnectionStatus {
    return client.status();
}

export type { Accessor };
