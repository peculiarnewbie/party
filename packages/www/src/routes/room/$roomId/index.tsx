import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, onMount, Switch, Match } from "solid-js";
import { nanoid } from "nanoid";
import z from "zod";
import { RoomLobby } from "~/components/room-lobby";
import { SampleQuizRoom } from "~/components/sample-quiz-room";
import { GoFishRoom } from "~/components/go-fish/go-fish-room";
import { PokerRoom } from "~/components/poker/poker-room";
import { BlackjackRoom } from "~/components/blackjack/blackjack-room";
import { YahtzeeRoom } from "~/components/yahtzee/yahtzee-room";
import {
    type GameType,
    type MessageType,
    type Player,
    isPokerGameType,
    serverMessageSchema,
} from "~/game";
import { normalizeRoomId } from "~/utils/room-id";

export const Route = createFileRoute("/room/$roomId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const params = Route.useParams();
    const roomId = () => normalizeRoomId(params().roomId);
    let ws: WebSocket;

    const [playerId, setPlayerId] = createSignal<string | null>(null);
    const [name, setName] = createSignal("");
    const [players, setPlayers] = createSignal<Player[]>([]);
    const [isHost, setIsHost] = createSignal(false);
    const [roomPhase, setRoomPhase] = createSignal<"lobby" | "playing">(
        "lobby",
    );
    const [selectedGameType, setSelectedGameType] =
        createSignal<GameType>("quiz");
    const [activeGameType, setActiveGameType] =
        createSignal<GameType | null>(null);

    const refreshPlayerId = () => {
        const match = document.cookie.match(/playerId=([^;]+)/);
        if (match) return match[1];
        const id = nanoid(10);
        document.cookie = `playerId=${id}; path=/; max-age=31536000; SameSite=Strict`;
        return id;
    };

    const send = (
        type: MessageType,
        nextName?: string,
        data?: Record<string, unknown>,
    ) => {
        const pid = playerId();
        if (!ws || !pid) return;
        ws.send(
            JSON.stringify({
                playerId: pid,
                playerName: nextName ?? name(),
                type,
                data: data ?? {},
            }),
        );
    };

    const join = (nextName: string) => send("join", nextName);
    const leave = () => send("leave");
    const selectGame = (gameType: GameType) =>
        send("select_game", undefined, { gameType });
    const startGame = () => send("start");
    const endGame = () => send("end");
    const returnToLobby = () => send("return_to_lobby");

    const isJoined = () => players().some((player) => player.id === playerId());
    const getWs = () => ws;
    const isActivePokerGame = () => isPokerGameType(activeGameType());

    onMount(() => {
        if (roomId() !== params().roomId) {
            window.location.replace(`/room/${roomId()}`);
            return;
        }

        const pid = refreshPlayerId();
        setPlayerId(pid);

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${roomId()}`;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);

            if (
                typeof json.type === "string" &&
                (json.type.startsWith("go_fish:") ||
                    json.type.startsWith("poker:") ||
                    json.type.startsWith("blackjack:") ||
                    json.type.startsWith("yahtzee:"))
            ) {
                return;
            }

            const parseRes = z.safeParse(serverMessageSchema, json);
            if (!parseRes.success) {
                return;
            }

            const parsed = parseRes.data;

            if (parsed.type === "room_state") {
                const nextPlayers = parsed.data.players as Player[];
                const hostId = parsed.data.hostId as string | null;
                const phase = parsed.data.phase as "lobby" | "playing";
                const nextSelectedGameType = parsed.data
                    .selectedGameType as GameType;
                const nextActiveGameType = parsed.data
                    .activeGameType as GameType | null;

                setPlayers(nextPlayers);
                setIsHost(hostId === playerId());
                setRoomPhase(phase);
                setSelectedGameType(nextSelectedGameType);
                setActiveGameType(nextActiveGameType);

                const currentPlayer = nextPlayers.find(
                    (player) => player.id === playerId(),
                );
                if (currentPlayer) {
                    setName(currentPlayer.name);
                }
            }

            if (parsed.type === "player_list") {
                setPlayers(parsed.data.players as Player[]);
            }

            if (parsed.type === "host_assigned") {
                setIsHost(parsed.data.hostId === playerId());
            }

            if (parsed.type === "game_selected") {
                setSelectedGameType(parsed.data.gameType as GameType);
            }

            if (parsed.type === "game_started") {
                setActiveGameType(parsed.data.gameType as GameType);
                setRoomPhase("playing");
            }

            if (parsed.type === "game_ended") {
                setActiveGameType(parsed.data.gameType as GameType);
                setRoomPhase("playing");
            }
        };
    });

    return (
        <Switch>
            <Match when={roomPhase() === "lobby"}>
                <RoomLobby
                    roomId={roomId()}
                    playerId={playerId()}
                    name={name()}
                    setName={setName}
                    players={players()}
                    isHost={isHost()}
                    isJoined={isJoined()}
                    selectedGameType={selectedGameType()}
                    onJoin={join}
                    onLeave={leave}
                    onSelectGame={selectGame}
                    onStart={startGame}
                />
            </Match>
            <Match when={roomPhase() === "playing" && activeGameType() === "go_fish"}>
                <GoFishRoom
                    roomId={roomId()}
                    playerId={playerId()}
                    isHost={isHost()}
                    ws={getWs()}
                />
            </Match>
            <Match when={roomPhase() === "playing" && isActivePokerGame()}>
                <PokerRoom
                    roomId={roomId()}
                    playerId={playerId()}
                    isHost={isHost()}
                    ws={getWs()}
                    title={
                        activeGameType() === "backwards_poker"
                            ? "Backwards Poker"
                            : "Texas Hold'em"
                    }
                    onEndGame={endGame}
                    onReturnToLobby={returnToLobby}
                />
            </Match>
            <Match when={roomPhase() === "playing" && activeGameType() === "blackjack"}>
                <BlackjackRoom
                    roomId={roomId()}
                    playerId={playerId()}
                    isHost={isHost()}
                    ws={getWs()}
                    onEndGame={endGame}
                    onReturnToLobby={returnToLobby}
                />
            </Match>
            <Match when={roomPhase() === "playing" && activeGameType() === "yahtzee"}>
                <YahtzeeRoom
                    roomId={roomId()}
                    playerId={playerId()}
                    isHost={isHost()}
                    ws={getWs()}
                    title="Yahtzee"
                    onEndGame={endGame}
                    onReturnToLobby={returnToLobby}
                />
            </Match>
            <Match when={roomPhase() === "playing" && activeGameType() === "lying_yahtzee"}>
                <YahtzeeRoom
                    roomId={roomId()}
                    playerId={playerId()}
                    isHost={isHost()}
                    ws={getWs()}
                    title="Lying Yahtzee"
                    onEndGame={endGame}
                    onReturnToLobby={returnToLobby}
                />
            </Match>
            <Match when={roomPhase() === "playing" && activeGameType() === "quiz"}>
                <SampleQuizRoom
                    roomId={roomId()}
                    playerId={playerId()}
                    isHost={isHost()}
                    ws={getWs()}
                />
            </Match>
        </Switch>
    );
}
