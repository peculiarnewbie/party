import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, onMount, Show } from "solid-js";
import { nanoid } from "nanoid";
import { RoomLobby } from "~/components/room-lobby";
import { MessageType, Player, serverMessageSchema } from "~/game";
import z from "zod";

export const Route = createFileRoute("/room/$roomId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const params = Route.useParams();
    let ws: WebSocket;

    const [playerId, setPlayerId] = createSignal<string | null>(null);
    const [name, setName] = createSignal("");
    const [players, setPlayers] = createSignal<Player[]>([]);
    const [isHost, setIsHost] = createSignal(false);
    const [gameState, setGameState] = createSignal<
        "lobby" | "playing" | "ended"
    >("lobby");

    const refreshPlayerId = () => {
        const match = document.cookie.match(/playerId=([^;]+)/);
        if (match) return match[1];
        const id = nanoid(10);
        document.cookie = `playerId=${id}; path=/; max-age=31536000; SameSite=Strict`;
        return id;
    };

    const send = (
        type: MessageType,
        name?: string,
        data?: Record<string, unknown>,
    ) => {
        const pid = playerId();
        if (!ws || !pid) return;
        ws.send(
            JSON.stringify({
                playerId: pid,
                playerName: name || "",
                type,
                data: data ?? {},
            }),
        );
    };

    const join = (name: string) => send("join", name);
    const leave = () => send("leave");
    const startGame = () => send("start");

    const isJoined = () => players().some((p) => p.id === playerId());

    onMount(() => {
        const pid = refreshPlayerId();
        setPlayerId(pid);

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${params().roomId}`;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);
            const parseRes = z.safeParse(serverMessageSchema, json);

            if (!parseRes.success) return;

            const parsed = parseRes.data;

            if (parsed.type === "room_state") {
                const players = parsed.data.players as Player[];
                setPlayers(players);
                setIsHost(parsed.data.hostId === playerId());
                const currentPlayer = players.find(
                    (p: Player) => p.id === playerId(),
                );
                if (currentPlayer) {
                    setName(currentPlayer.name);
                }
            }
            if (parsed.type === "player_list") {
                const players = parsed.data.players as Player[];
                setPlayers(players);
            }
            if (parsed.type === "host_assigned") {
                setIsHost(parsed.data.hostId === playerId());
            }
            if (parsed.type === "game_started") {
                setGameState("playing");
            }
        };
    });

    return (
        <Show
            when={gameState() === "lobby"}
            fallback={<div>Game in progress...</div>}
        >
            <RoomLobby
                roomId={params().roomId}
                playerId={playerId()}
                name={name()}
                setName={setName}
                players={players()}
                isHost={isHost()}
                isJoined={isJoined()}
                onJoin={join}
                onLeave={leave}
                onStart={startGame}
            />
        </Show>
    );
}
