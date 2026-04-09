import { createFileRoute } from "@tanstack/solid-router";
import {
    createMemo,
    createSignal,
    onMount,
    Switch,
    Match,
    Show,
} from "solid-js";
import { nanoid } from "nanoid";
import z from "zod";
import { RoomLobby } from "~/components/room-lobby";
import { SampleQuizRoom } from "~/components/sample-quiz-room";
import { GoFishRoom } from "~/components/go-fish/go-fish-room";
import { PokerRoom } from "~/components/poker/poker-room";
import { BlackjackRoom } from "~/components/blackjack/blackjack-room";
import { YahtzeeRoom } from "~/components/yahtzee/yahtzee-room";
import { PerudoRoom } from "~/components/perudo/perudo-room";
import {
    type GameType,
    type GameParticipant,
    type GameParticipantStatus,
    type MessageType,
    type Player,
    isPokerGameType,
    serverMessageSchema,
} from "~/game";
import { getCookie, setCookie } from "~/utils/cookies";
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
    const [activeGameType, setActiveGameType] = createSignal<GameType | null>(
        null,
    );
    const [gameParticipants, setGameParticipants] = createSignal<
        GameParticipant[]
    >([]);

    const refreshPlayerId = () => {
        const existingId = getCookie("playerId");
        if (existingId) return existingId;

        const id = nanoid(10);
        setCookie("playerId", id);
        return id;
    };

    const persistName = (nextName: string) => {
        setCookie("playerName", nextName);
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

    const join = (nextName: string) => {
        persistName(nextName);
        send("join", nextName);
    };
    const leave = () => send("leave");
    const selectGame = (gameType: GameType) =>
        send("select_game", undefined, { gameType });
    const startGame = () => send("start");
    const endGame = () => send("end");
    const returnToLobby = () => send("return_to_lobby");
    const leaveGame = () => send("leave_game");

    const isJoined = () => players().some((player) => player.id === playerId());
    const getWs = () => ws;
    const isActivePokerGame = () => isPokerGameType(activeGameType());
    const myGameParticipant = createMemo(
        () =>
            gameParticipants().find(
                (participant) => participant.playerId === playerId(),
            ) ?? null,
    );
    const myGameStatus = createMemo<GameParticipantStatus | null>(
        () => myGameParticipant()?.status ?? null,
    );
    const canAccessCurrentGame = createMemo(
        () =>
            roomPhase() !== "playing" ||
            (myGameParticipant() !== null && myGameStatus() !== "left_game"),
    );

    onMount(() => {
        if (roomId() !== params().roomId) {
            window.location.replace(`/room/${roomId()}`);
            return;
        }

        const pid = refreshPlayerId();
        setPlayerId(pid);
        setName(getCookie("playerName") ?? "");

        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${roomId()}`;

        ws = new WebSocket(wsUrl);
        ws.onopen = () => {
            ws.send(
                JSON.stringify({
                    playerId: pid,
                    playerName: getCookie("playerName") ?? "",
                    type: "identify",
                    data: {},
                }),
            );
        };
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);

            if (
                typeof json.type === "string" &&
                (json.type.startsWith("go_fish:") ||
                    json.type.startsWith("poker:") ||
                    json.type.startsWith("blackjack:") ||
                    json.type.startsWith("yahtzee:") ||
                    json.type.startsWith("perudo:"))
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
                const nextGameParticipants = parsed.data
                    .gameParticipants as GameParticipant[];

                setPlayers(nextPlayers);
                setIsHost(hostId === playerId());
                setRoomPhase(phase);
                setSelectedGameType(nextSelectedGameType);
                setActiveGameType(nextActiveGameType);
                setGameParticipants(nextGameParticipants);

                const currentPlayer = nextPlayers.find(
                    (player) => player.id === playerId(),
                );
                if (currentPlayer) {
                    setName(currentPlayer.name);
                    persistName(currentPlayer.name);
                }
            }

            if (parsed.type === "player_list") {
                const nextPlayers = parsed.data.players as Player[];
                setPlayers(nextPlayers);

                const currentPlayer = nextPlayers.find(
                    (player) => player.id === playerId(),
                );
                if (currentPlayer) {
                    setName(currentPlayer.name);
                    persistName(currentPlayer.name);
                }
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
        <>
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
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "go_fish"
                    }
                >
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
                        <GoFishRoom
                            roomId={roomId()}
                            playerId={playerId()}
                            isHost={isHost()}
                            ws={getWs()}
                        />
                    </Show>
                </Match>
                <Match when={roomPhase() === "playing" && isActivePokerGame()}>
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
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
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "blackjack"
                    }
                >
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
                        <BlackjackRoom
                            roomId={roomId()}
                            playerId={playerId()}
                            isHost={isHost()}
                            ws={getWs()}
                            onEndGame={endGame}
                            onReturnToLobby={returnToLobby}
                        />
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "yahtzee"
                    }
                >
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
                        <YahtzeeRoom
                            roomId={roomId()}
                            playerId={playerId()}
                            isHost={isHost()}
                            ws={getWs()}
                            title="Yahtzee"
                            onEndGame={endGame}
                            onReturnToLobby={returnToLobby}
                        />
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "lying_yahtzee"
                    }
                >
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
                        <YahtzeeRoom
                            roomId={roomId()}
                            playerId={playerId()}
                            isHost={isHost()}
                            ws={getWs()}
                            title="Lying Yahtzee"
                            onEndGame={endGame}
                            onReturnToLobby={returnToLobby}
                        />
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "perudo"
                    }
                >
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
                        <PerudoRoom
                            roomId={roomId()}
                            playerId={playerId()}
                            isHost={isHost()}
                            ws={getWs()}
                            onEndGame={endGame}
                            onReturnToLobby={returnToLobby}
                        />
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" && activeGameType() === "quiz"
                    }
                >
                    <Show
                        when={canAccessCurrentGame()}
                        fallback={
                            <GameSessionState
                                roomId={roomId()}
                                status={myGameStatus()}
                            />
                        }
                    >
                        <SampleQuizRoom
                            roomId={roomId()}
                            playerId={playerId()}
                            isHost={isHost()}
                            ws={getWs()}
                        />
                    </Show>
                </Match>
            </Switch>
            <Show
                when={
                    roomPhase() === "playing" &&
                    myGameParticipant() &&
                    myGameStatus() !== "left_game"
                }
            >
                <button
                    type="button"
                    onClick={leaveGame}
                    class="fixed right-4 bottom-4 z-50 font-bebas text-[.85rem] tracking-[.16em] bg-[#ddd5c4] text-[#c0261a] border-2 border-[#1a1a1a] px-4 py-2 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    LEAVE GAME
                </button>
            </Show>
        </>
    );
}

function GameSessionState(props: {
    roomId: string;
    status: GameParticipantStatus | null;
}) {
    const title = () =>
        props.status === "left_game"
            ? "YOU LEFT THIS GAME"
            : "THIS GAME STARTED WITHOUT YOU";
    const label = () =>
        props.status === "left_game" ? "SESSION CLOSED" : "SESSION IN PROGRESS";
    const message = () =>
        props.status === "left_game"
            ? "You cannot rejoin the current session. Stay in the room for the next game or leave the room entirely."
            : "Wait for the next game to start, or leave the room if you want to join a different one.";

    return (
        <div class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla flex items-center justify-center px-6">
            <div class="max-w-md w-full border-2 border-[#1a1a1a] bg-[#c9c0b0] px-6 py-8 shadow-[6px_6px_0_#1a1a1a] text-center">
                <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                    {label()}
                </div>
                <h1 class="font-bebas text-[2.2rem] leading-[.92] tracking-[.06em] mb-3">
                    {title()}
                </h1>
                <p class="text-[.95rem] leading-relaxed text-[#5a5040] mb-6">
                    {message()}
                </p>
                <a
                    href={`/room/${props.roomId}`}
                    class="inline-block font-bebas text-[1rem] tracking-[.14em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                >
                    STAY IN ROOM
                </a>
            </div>
        </div>
    );
}
