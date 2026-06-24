import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { Component } from "solid-js";
import { GAME_RULES } from "~/game";
import { fillGamePlayerCount } from "~/room/devtools-api";
import type { RoomClient } from "~/room/types";
import type { RoomClientPool } from "~/room/types";
import type { ConnectionStatus } from "~/room/types";

interface MultiplayerDevtoolsProps {
    pool: RoomClientPool;
}

function statusColor(status: ConnectionStatus): string {
    switch (status) {
        case "connected":
            return "bg-green-400";
        case "connecting":
        case "reconnecting":
            return "bg-amber-400";
        case "error":
            return "bg-red-500";
        default:
            return "bg-white/30";
    }
}

function statusLabel(status: ConnectionStatus): string {
    switch (status) {
        case "connected":
            return "CONNECTED";
        case "connecting":
            return "CONNECTING";
        case "reconnecting":
            return "RECONNECTING";
        case "error":
            return "ERROR";
        default:
            return "DISCONNECTED";
    }
}

export const MultiplayerDevtools: Component<MultiplayerDevtoolsProps> = (
    props,
) => {
    const [expanded, setExpanded] = createSignal(props.pool.panelOpen());

    const activeClient = () => props.pool.activeClient();
    const roomState = () => activeClient().roomState();
    const connectedCount = () =>
        props.pool
            .clients()
            .filter((client) => client.status() === "connected").length;
    const totalCount = () => props.pool.clients().length;
    const activeGame = () =>
        roomState()?.activeGameType ?? roomState()?.selectedGameType ?? "—";
    const viewingName = () => activeClient().identity().name || "—";

    const cyclePlayer = (direction: 1 | -1) => {
        const list = props.pool.clients();
        if (list.length === 0) return;
        const activeId = activeClient().identity().id;
        const idx = list.findIndex((client) => client.identity().id === activeId);
        const base = idx === -1 ? 0 : idx;
        const next = list[(base + direction + list.length) % list.length]!;
        props.pool.setActivePlayer(next.identity().id);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (
            target &&
            (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable)
        ) {
            return;
        }
        if (event.key === ",") {
            event.preventDefault();
            cyclePlayer(-1);
            return;
        }
        if (event.key === ".") {
            event.preventDefault();
            cyclePlayer(1);
            return;
        }
        if (event.key === "Escape") {
            event.preventDefault();
            setExpanded(false);
            props.pool.setPanelOpen(false);
            return;
        }
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "m") {
            event.preventDefault();
            setExpanded((value) => {
                const next = !value;
                props.pool.setPanelOpen(next);
                return next;
            });
        }
    };

    onMount(() => {
        window.addEventListener("keydown", onKeyDown);
        onCleanup(() => window.removeEventListener("keydown", onKeyDown));
    });

    const toggleExpanded = () => {
        setExpanded((value) => {
            const next = !value;
            props.pool.setPanelOpen(next);
            return next;
        });
    };

    const addAndJoin = (client: RoomClient) => {
        const attempt = () => {
            if (client.status() === "connected") {
                client.sendRoomMessage("join", {}, client.identity().name);
                return;
            }
            window.setTimeout(attempt, 50);
        };
        attempt();
    };

    return (
        <div
            data-testid="multiplayer-devtools"
            class="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none"
            style={{ "font-family": "'DM Mono', 'Fira Mono', monospace" }}
        >
            <div class="pointer-events-auto mx-auto max-w-5xl px-3 pb-3">
                <Show
                    when={expanded()}
                    fallback={
                        <button
                            type="button"
                            data-testid="devtools-dock"
                            onClick={toggleExpanded}
                            class="w-full rounded-t-lg bg-[#111]/95 backdrop-blur border border-white/15 border-b-0 shadow-[0_-8px_24px_rgba(0,0,0,.45)] text-white/90 px-4 py-2 text-[11px] tracking-widest flex items-center justify-between"
                        >
                            <div class="flex items-center gap-3 min-w-0">
                                <span
                                    class={`w-1.5 h-1.5 rounded-full shrink-0 ${connectedCount() === totalCount() ? "bg-green-400" : "bg-amber-400"}`}
                                />
                                <span class="text-white/50 shrink-0">
                                    {connectedCount()}/{totalCount()} connected
                                </span>
                                <span class="text-white/30 shrink-0">·</span>
                                <span class="text-white/70 shrink-0">
                                    ROOM {props.pool.roomId.toUpperCase()}
                                </span>
                                <span class="text-white/30 shrink-0">·</span>
                                <span class="text-white/90 truncate">
                                    {String(activeGame()).replace(/_/g, " ").toUpperCase()}
                                </span>
                                <span class="text-white/30 shrink-0">·</span>
                                <span class="text-white/70 truncate">
                                    Viewing: {viewingName()}
                                </span>
                            </div>
                            <span class="text-white/40 shrink-0 ml-3">▴</span>
                        </button>
                    }
                >
                    <div
                        data-testid="devtools-panel"
                        class="rounded-t-xl bg-[#111]/95 backdrop-blur border border-white/15 border-b-0 shadow-[0_-12px_32px_rgba(0,0,0,.5)] text-white/90 overflow-hidden"
                    >
                        <div class="flex items-center justify-between px-4 py-2 border-b border-white/10 text-[11px] tracking-widest">
                            <div class="flex items-center gap-3 min-w-0">
                                <span class="text-white/50">MULTIPLAYER DEVTOOLS</span>
                                <span class="text-white/30">·</span>
                                <span class="text-white/70">
                                    ROOM {props.pool.roomId.toUpperCase()}
                                </span>
                                <span class="text-white/30">·</span>
                                <span class="text-white/90">
                                    {(roomState()?.phase ?? "lobby").toUpperCase()}
                                </span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="text-white/40">
                                    {connectedCount()} sockets
                                </span>
                                <button
                                    type="button"
                                    onClick={toggleExpanded}
                                    class="text-white/50 hover:text-white/90 px-2"
                                >
                                    ─
                                </button>
                            </div>
                        </div>

                        <div class="px-4 py-3 max-h-[45vh] overflow-y-auto">
                            <For each={props.pool.clients()}>
                                {(client) => {
                                    const identity = () => client.identity();
                                    const isActive = () =>
                                        identity().id ===
                                        activeClient().identity().id;
                                    const rs = () => client.roomState();
                                    const participant = () =>
                                        rs()?.gameParticipants.find(
                                            (entry) =>
                                                entry.playerId === identity().id,
                                        ) ?? null;
                                    return (
                                        <div
                                            data-testid={`devtools-player-row-${identity().id}`}
                                            class={`flex items-center gap-3 py-2 border-b border-white/5 text-[11px] ${
                                                isActive() ? "bg-white/5" : ""
                                            }`}
                                        >
                                            <span
                                                class={`w-1.5 h-1.5 rounded-full shrink-0 ${statusColor(client.status())}`}
                                            />
                                            <div class="min-w-0 flex-1">
                                                <div class="flex items-center gap-2">
                                                    <span class="text-white/95 truncate">
                                                        {identity().name || "—"}
                                                    </span>
                                                    <span class="text-white/30 truncate">
                                                        {identity().id.slice(0, 6)}
                                                    </span>
                                                    <Show when={identity().origin === "browser"}>
                                                        <span class="text-white/40">
                                                            BROWSER
                                                        </span>
                                                    </Show>
                                                    <Show when={rs()?.hostId === identity().id}>
                                                        <span class="text-amber-400">
                                                            HOST
                                                        </span>
                                                    </Show>
                                                </div>
                                                <div class="text-white/40 tracking-wide">
                                                    {statusLabel(client.status())}
                                                    <Show when={participant()}>
                                                        {" "}
                                                        · {participant()!.status.toUpperCase()}
                                                    </Show>
                                                </div>
                                            </div>
                                            <Show when={!isActive()}>
                                                <button
                                                    type="button"
                                                    data-testid={`devtools-switch-${identity().id}`}
                                                    onClick={() =>
                                                        props.pool.setActivePlayer(
                                                            identity().id,
                                                        )
                                                    }
                                                    class="text-white/60 hover:text-white/95 px-2 py-1 border border-white/15"
                                                >
                                                    Switch
                                                </button>
                                            </Show>
                                            <Show when={isActive()}>
                                                <span class="text-green-400 px-2">
                                                    VIEWING
                                                </span>
                                            </Show>
                                            <Show
                                                when={client.status() === "disconnected"}
                                            >
                                                <button
                                                    type="button"
                                                    data-testid={`devtools-reconnect-${identity().id}`}
                                                    onClick={() => client.connect()}
                                                    class="text-amber-400 px-2 py-1 border border-amber-400/30"
                                                >
                                                    Reconnect
                                                </button>
                                            </Show>
                                            <Show
                                                when={
                                                    client.status() === "connected" &&
                                                    identity().origin === "simulated"
                                                }
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        client.disconnect()
                                                    }
                                                    class="text-white/40 hover:text-white/70 px-2"
                                                >
                                                    Disc
                                                </button>
                                            </Show>
                                        </div>
                                    );
                                }}
                            </For>
                        </div>

                        <div class="flex flex-wrap gap-2 px-4 py-3 border-t border-white/10 text-[10px] tracking-widest">
                            <button
                                type="button"
                                data-testid="devtools-add-player"
                                onClick={() => {
                                    const client = props.pool.addPlayer();
                                    addAndJoin(client);
                                }}
                                class="px-3 py-1.5 border border-white/20 hover:bg-white/5"
                            >
                                + Add player
                            </button>
                            <button
                                type="button"
                                data-testid="devtools-add-4"
                                onClick={() => {
                                    for (const client of props.pool.addPlayers(4)) {
                                        addAndJoin(client);
                                    }
                                }}
                                class="px-3 py-1.5 border border-white/20 hover:bg-white/5"
                            >
                                + Add 4
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    const gameType =
                                        roomState()?.selectedGameType ?? "quiz";
                                    const min = GAME_RULES[gameType].minPlayers;
                                    const joined = roomState()?.players.length ?? 0;
                                    const needed = Math.max(0, min - joined);
                                    for (const client of props.pool.addPlayers(needed)) {
                                        addAndJoin(client);
                                    }
                                }}
                                class="px-3 py-1.5 border border-white/20 hover:bg-white/5"
                            >
                                Fill min
                            </button>
                            <button
                                type="button"
                                onClick={() => fillGamePlayerCount(props.pool)}
                                class="px-3 py-1.5 border border-white/20 hover:bg-white/5"
                            >
                                Fill game
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    for (const client of props.pool.clients()) {
                                        client.disconnect();
                                    }
                                }}
                                class="px-3 py-1.5 border border-white/20 hover:bg-white/5 text-red-300"
                            >
                                Disconnect all
                            </button>
                            <button
                                type="button"
                                onClick={() => props.pool.clearDevPlayers()}
                                class="px-3 py-1.5 border border-white/20 hover:bg-white/5 text-white/50"
                            >
                                Clear dev players
                            </button>
                        </div>

                        <div class="px-4 py-2 border-t border-white/10 text-[10px] text-white/35 tracking-widest">
                            , previous · . next · ⇧⌘M toggle · Esc collapse
                        </div>
                    </div>
                </Show>
            </div>
        </div>
    );
};
