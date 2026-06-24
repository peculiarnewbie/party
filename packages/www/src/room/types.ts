import type { Accessor } from "solid-js";
import type { GameParticipantStatus, MessageType, RoomStatePayload } from "~/game";
import type { RoomTransport } from "./room-transport";

export type ConnectionStatus =
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected"
    | "error";

export type DevPlayerOrigin = "browser" | "simulated";

export interface DevPlayerIdentity {
    id: string;
    name: string;
    origin: DevPlayerOrigin;
}

export interface TransportMessage {
    id: number;
    direction: "in" | "out";
    timestamp: number;
    type: string;
    payload: unknown;
    byteSize: number;
    decodeError?: string;
}

export interface RoomClient {
    identity: Accessor<DevPlayerIdentity>;
    transport: RoomTransport;
    status: Accessor<ConnectionStatus>;
    roomState: Accessor<RoomStatePayload | null>;
    sendRoomMessage(
        type: MessageType,
        data?: Record<string, unknown>,
        nameOverride?: string,
    ): void;
    getGameConnection<T>(key: string, factory: () => T): T;
    rename(name: string): void;
    connect(): void;
    disconnect(): void;
    dispose(): void;
}

export interface RoomClientPool {
    roomId: string;
    clients: Accessor<readonly RoomClient[]>;
    activeClient: Accessor<RoomClient>;
    setActivePlayer(playerId: string): void;
    addPlayer(name?: string): RoomClient;
    addPlayers(count: number): RoomClient[];
    removePlayer(playerId: string): void;
    dispose(): void;
    panelOpen: Accessor<boolean>;
    setPanelOpen(open: boolean): void;
    clearDevPlayers(): void;
}

export type DevToolsTab = "players" | "events" | "room";

export interface PersistedDevPlayer {
    id: string;
    name: string;
    autoConnect: boolean;
}

export interface PersistedDevRoom {
    version: 1;
    activePlayerId: string;
    players: PersistedDevPlayer[];
    panelOpen: boolean;
    selectedTab: DevToolsTab;
}
