import { createFileRoute } from "@tanstack/solid-router";
import {
    createMemo,
    onMount,
    Switch,
    Match,
    Show,
    lazy,
} from "solid-js";
import { RoomLobby } from "~/components/room-lobby";
import { SampleQuizRoom } from "~/components/sample-quiz-room";
import { GoFishRoom } from "~/components/go-fish/go-fish-room";
import { PokerRoom } from "~/components/poker/poker-room";
import { createGameConnectionFromTransport } from "~/game/connection-from-transport";
import type { PokerConnection } from "~/game/poker/connection";
import {
    pokerPlayerViewSchema,
    pokerServerMessageSchema,
} from "~/game/poker";
import {
    goFishPlayerViewSchema,
    goFishServerMessageSchema,
} from "~/game/go-fish";
import {
    blackjackPlayerViewSchema,
    blackjackServerMessageSchema,
} from "~/game/blackjack";
import {
    yahtzeePlayerViewSchema,
    yahtzeeServerMessageSchema,
} from "~/game/yahtzee";
import {
    perudoPlayerViewSchema,
    perudoServerMessageSchema,
} from "~/game/perudo";
import {
    herdPlayerViewSchema,
    herdServerMessageSchema,
} from "~/game/herd";
import {
    funFactsPlayerViewSchema,
    funFactsServerMessageSchema,
} from "~/game/fun-facts";
import {
    cheeseThiefPlayerViewSchema,
    cheeseThiefServerMessageSchema,
} from "~/game/cheese-thief";
import {
    cockroachPokerPlayerViewSchema,
    cockroachPokerServerMessageSchema,
} from "~/game/cockroach-poker";
import {
    flip7PlayerViewSchema,
    flip7ServerMessageSchema,
} from "~/game/flip-7";
import {
    skullPlayerViewSchema,
    skullServerMessageSchema,
} from "~/game/skull";
import {
    spicyPlayerViewSchema,
    spicyServerMessageSchema,
} from "~/game/spicy";
import type { YahtzeeConnection } from "~/game/yahtzee/connection";
import type { GoFishConnection } from "~/game/go-fish/connection";
import type { BlackjackConnection } from "~/game/blackjack/connection";
import type { Flip7Connection } from "~/game/flip-7/connection";
import type { PerudoConnection } from "~/game/perudo/connection";
import type { CheeseThiefConnection } from "~/game/cheese-thief/connection";
import type { CockroachPokerConnection } from "~/game/cockroach-poker/connection";
import type { SkullConnection } from "~/game/skull/connection";
import type { SpicyConnection } from "~/game/spicy/connection";
import type { FunFactsConnection } from "~/game/fun-facts/connection";
import type { RpsConnection } from "~/game/rps/connection";
import type { HerdConnection } from "~/game/herd/connection";
import type { QuizConnection } from "~/game/quiz/connection";
import {
    quizPlayerViewSchema,
    quizServerMessageSchema,
} from "~/game/quiz/schemas";
import { BlackjackRoom } from "~/components/blackjack/blackjack-room";
import { YahtzeeRoom } from "~/components/yahtzee/yahtzee-room";
import { PerudoRoom } from "~/components/perudo/perudo-room";
import { RpsRoom } from "~/components/rps/rps-room";
import { HerdRoom } from "~/components/herd/herd-room";
import { FunFactsRoom } from "~/components/fun-facts/fun-facts-room";
import { CheeseThiefRoom } from "~/components/cheese-thief/cheese-thief-room";
import { CockroachPokerRoom } from "~/components/cockroach-poker/cockroach-poker-room";
import { Flip7Room } from "~/components/flip-7/flip-7-room";
import { SkullRoom } from "~/components/skull/skull-room";
import { SpicyRoom } from "~/components/spicy/spicy-room";
import {
    type GameType,
    type GameParticipantStatus,
    type MessageType,
    type RoomStatePayload,
    isPokerGameType,
} from "~/game";
import { setCookie } from "~/utils/cookies";
import { normalizeRoomId } from "~/utils/room-id";
import { createRpsGameConnection } from "~/game/rps/create-game-connection";
import {
    createRoomClientPool,
} from "~/room/room-client-pool";
import { installPartyDevtoolsApi } from "~/room/devtools-api";

const MultiplayerDevtools = lazy(() =>
    import("~/components/dev/multiplayer-devtools").then((module) => ({
        default: module.MultiplayerDevtools,
    })),
);

const defaultRoomState = (): RoomStatePayload => ({
    players: [],
    hostId: null,
    phase: "lobby",
    selectedGameType: "quiz",
    activeGameType: null,
    gameSessionId: null,
    gameParticipants: [],
});

export const Route = createFileRoute("/room/$roomId/")({
    component: RouteComponent,
});

function RouteComponent() {
    const params = Route.useParams();
    const roomId = () => normalizeRoomId(params().roomId);

    onMount(() => {
        if (roomId() !== params().roomId) {
            window.location.replace(`/room/${roomId()}`);
        }
    });

    const pool = createRoomClientPool({ roomId: roomId() });

    onMount(() => {
        installPartyDevtoolsApi(pool);
    });

    const client = () => pool.activeClient();
    const playerId = () => client().identity().id;
    const name = () => client().identity().name;
    const roomState = () => client().roomState() ?? defaultRoomState();
    const players = createMemo(() => roomState().players);
    const isHost = createMemo(() => roomState().hostId === playerId());
    const roomPhase = createMemo(() => roomState().phase);
    const selectedGameType = createMemo(() => roomState().selectedGameType);
    const activeGameType = createMemo(() => roomState().activeGameType);
    const gameParticipants = createMemo(() => roomState().gameParticipants);

    const persistName = (nextName: string) => {
        if (client().identity().origin === "browser") {
            setCookie("playerName", nextName);
        }
    };

    const setName = (nextName: string) => {
        client().rename(nextName);
    };

    const send = (
        type: MessageType,
        nextName?: string,
        data?: Record<string, unknown>,
    ) => {
        client().sendRoomMessage(type, data, nextName);
    };

    const join = (nextName: string) => {
        persistName(nextName);
        client().rename(nextName);
        send("join", nextName);
    };
    const leave = () => send("leave");
    const selectGame = (gameType: GameType) =>
        send("select_game", undefined, { gameType });
    const startGame = () => send("start");
    const endGame = () => send("end");
    const returnToLobby = () => send("return_to_lobby");
    const leaveGame = () => send("leave_game");
    const resumeRoom = () => send("resume_room");
    const restartRoom = () => send("restart_room");

    const isJoined = () => players().some((player) => player.id === playerId());
    const envelope = () => ({
        playerId: playerId(),
        playerName: name(),
    });
    const gameConnection = <T,>(
        key: string,
        options: Parameters<typeof createGameConnectionFromTransport>[1],
    ) =>
        client().getGameConnection(key, () =>
            createGameConnectionFromTransport(client().transport, options),
        ) as T;
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
            (myGameParticipant() !== null && myGameStatus() !== "left_game") ||
            (isActivePokerGame() && isJoined() && myGameStatus() !== "left_game"),
    );

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
                        isActivePokerGame() &&
                        !isJoined()
                    }
                >
                    <RoomLobby
                        roomId={roomId()}
                        playerId={playerId()}
                        name={name()}
                        setName={setName}
                        players={players()}
                        isHost={false}
                        isJoined={false}
                        selectedGameType={
                            (activeGameType() ?? selectedGameType()) as GameType
                        }
                        onJoin={join}
                        onLeave={leave}
                        onSelectGame={selectGame}
                        onStart={startGame}
                    />
                </Match>
                <Match when={roomPhase() === "hibernated"}>
                    <HibernatedRoomState
                        roomId={roomId()}
                        canManage={
                            myGameParticipant() !== null &&
                            myGameStatus() !== "left_game"
                        }
                        onResume={resumeRoom}
                        onRestart={restartRoom}
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
                        {(() => {
                            const connection: GoFishConnection = gameConnection(
                                "go_fish",
                                {
                                    stateType: "go_fish:state",
                                    prefix: "go_fish:",
                                    envelope,
                                    playerViewSchema: goFishPlayerViewSchema,
                                    serverMessageSchema: goFishServerMessageSchema,
                                },
                            );
                            return (
                                <GoFishRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                />
                            );
                        })()}
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
                        {(() => {
                            const connection: PokerConnection = gameConnection(
                                "poker",
                                {
                                    stateType: "poker:state",
                                    prefix: "poker:",
                                    envelope,
                                    playerViewSchema: pokerPlayerViewSchema,
                                    serverMessageSchema: pokerServerMessageSchema,
                                },
                            );
                            return (
                                <PokerRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    title={
                                        activeGameType() === "backwards_poker"
                                            ? "Backwards Poker"
                                            : "Texas Hold'em"
                                    }
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
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
                        {(() => {
                            const connection: BlackjackConnection = gameConnection(
                                "blackjack",
                                {
                                    stateType: "blackjack:state",
                                    prefix: "blackjack:",
                                    envelope,
                                    playerViewSchema: blackjackPlayerViewSchema,
                                    serverMessageSchema: blackjackServerMessageSchema,
                                },
                            );
                            return (
                                <BlackjackRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
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
                        {(() => {
                            const connection: YahtzeeConnection = gameConnection(
                                "yahtzee",
                                {
                                    stateType: "yahtzee:state",
                                    prefix: "yahtzee:",
                                    envelope,
                                    playerViewSchema: yahtzeePlayerViewSchema,
                                    serverMessageSchema: yahtzeeServerMessageSchema,
                                },
                            );
                            return (
                                <YahtzeeRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    title="Yahtzee"
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
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
                        {(() => {
                            const connection: YahtzeeConnection = gameConnection(
                                "yahtzee",
                                {
                                    stateType: "yahtzee:state",
                                    prefix: "yahtzee:",
                                    envelope,
                                    playerViewSchema: yahtzeePlayerViewSchema,
                                    serverMessageSchema: yahtzeeServerMessageSchema,
                                },
                            );
                            return (
                                <YahtzeeRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    title="Lying Yahtzee"
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
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
                        {(() => {
                            const connection: PerudoConnection = gameConnection(
                                "perudo",
                                {
                                    stateType: "perudo:state",
                                    prefix: "perudo:",
                                    envelope,
                                    playerViewSchema: perudoPlayerViewSchema,
                                    serverMessageSchema: perudoServerMessageSchema,
                                },
                            );
                            return (
                                <PerudoRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" && activeGameType() === "rps"
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
                        {(() => {
                            const connection: RpsConnection = client().getGameConnection(
                                "rps",
                                () => createRpsGameConnection(client().transport, envelope),
                            );
                            return (
                                <RpsRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" && activeGameType() === "herd"
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
                        {(() => {
                            const connection: HerdConnection = gameConnection(
                                "herd",
                                {
                                    stateType: "herd:state",
                                    prefix: "herd:",
                                    envelope,
                                    playerViewSchema: herdPlayerViewSchema,
                                    serverMessageSchema: herdServerMessageSchema,
                                },
                            );
                            return (
                                <HerdRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "fun_facts"
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
                        {(() => {
                            const connection: FunFactsConnection = gameConnection(
                                "fun_facts",
                                {
                                    stateType: "fun_facts:state",
                                    prefix: "fun_facts:",
                                    envelope,
                                    playerViewSchema: funFactsPlayerViewSchema,
                                    serverMessageSchema: funFactsServerMessageSchema,
                                },
                            );
                            return (
                                <FunFactsRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "cheese_thief"
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
                        {(() => {
                            const connection: CheeseThiefConnection = gameConnection(
                                "cheese_thief",
                                {
                                    stateType: "cheese_thief:state",
                                    prefix: "cheese_thief:",
                                    envelope,
                                    playerViewSchema: cheeseThiefPlayerViewSchema,
                                    serverMessageSchema: cheeseThiefServerMessageSchema,
                                },
                            );
                            return (
                                <CheeseThiefRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "cockroach_poker"
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
                        {(() => {
                            const connection: CockroachPokerConnection = gameConnection(
                                "cockroach_poker",
                                {
                                    stateType: "cockroach_poker:state",
                                    prefix: "cockroach_poker:",
                                    envelope,
                                    playerViewSchema: cockroachPokerPlayerViewSchema,
                                    serverMessageSchema: cockroachPokerServerMessageSchema,
                                },
                            );
                            return (
                                <CockroachPokerRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "flip_7"
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
                        {(() => {
                            const connection: Flip7Connection = gameConnection(
                                "flip_7",
                                {
                                    stateType: "flip_7:state",
                                    prefix: "flip_7:",
                                    envelope,
                                    playerViewSchema: flip7PlayerViewSchema,
                                    serverMessageSchema: flip7ServerMessageSchema,
                                },
                            );
                            return (
                                <Flip7Room
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "skull"
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
                        {(() => {
                            const connection: SkullConnection = gameConnection(
                                "skull",
                                {
                                    stateType: "skull:state",
                                    prefix: "skull:",
                                    envelope,
                                    playerViewSchema: skullPlayerViewSchema,
                                    serverMessageSchema: skullServerMessageSchema,
                                },
                            );
                            return (
                                <SkullRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
                    </Show>
                </Match>
                <Match
                    when={
                        roomPhase() === "playing" &&
                        activeGameType() === "spicy"
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
                        {(() => {
                            const connection: SpicyConnection = gameConnection(
                                "spicy",
                                {
                                    stateType: "spicy:state",
                                    prefix: "spicy:",
                                    envelope,
                                    playerViewSchema: spicyPlayerViewSchema,
                                    serverMessageSchema: spicyServerMessageSchema,
                                },
                            );
                            return (
                                <SpicyRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                    onEndGame={endGame}
                                    onReturnToLobby={returnToLobby}
                                />
                            );
                        })()}
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
                        {(() => {
                            const connection: QuizConnection = gameConnection(
                                "quiz",
                                {
                                    stateType: "__quiz_no_state__",
                                    prefix: "player_answered",
                                    envelope,
                                    playerViewSchema: quizPlayerViewSchema,
                                    serverMessageSchema: quizServerMessageSchema,
                                },
                            );
                            return (
                                <SampleQuizRoom
                                    roomId={roomId()}
                                    playerId={playerId()}
                                    isHost={isHost()}
                                    connection={connection}
                                />
                            );
                        })()}
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
            <Show when={import.meta.env.DEV}>
                <MultiplayerDevtools pool={pool} />
            </Show>
        </>
    );
}

function HibernatedRoomState(props: {
    roomId: string;
    canManage: boolean;
    onResume: () => void;
    onRestart: () => void;
}) {
    const eyebrow = () =>
        props.canManage ? "ROOM HIBERNATED" : "ROOM SUSPENDED";
    const title = () =>
        props.canManage
            ? "PICK UP WHERE YOU LEFT OFF"
            : "WAITING FOR A RETURNING PLAYER";
    const message = () =>
        props.canManage
            ? "Everyone disconnected, so this game was put into hibernation. You can resume it where it stopped or restart the room from scratch."
            : "This room is hibernated for now. One of the previous participants needs to come back before the game can continue or be restarted.";

    return (
        <div class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla flex items-center justify-center px-6">
            <div class="max-w-xl w-full border-2 border-[#1a1a1a] bg-[#c9c0b0] px-6 py-8 shadow-[6px_6px_0_#1a1a1a] text-center">
                <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                    {eyebrow()}
                </div>
                <h1 class="font-bebas text-[2.2rem] leading-[.92] tracking-[.06em] mb-3">
                    {title()}
                </h1>
                <p class="text-[.95rem] leading-relaxed text-[#5a5040] mb-6">
                    {message()}
                </p>
                <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#9a9080] mb-6">
                    ROOM {props.roomId.toUpperCase()} WILL CLEAR ITSELF AFTER 3
                    HOURS
                </div>
                <Show
                    when={props.canManage}
                    fallback={
                        <a
                            href={`/room/${props.roomId}`}
                            class="inline-block font-bebas text-[1rem] tracking-[.14em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                        >
                            REFRESH
                        </a>
                    }
                >
                    <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <button
                            type="button"
                            onClick={props.onResume}
                            class="font-bebas text-[1rem] tracking-[.14em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                        >
                            RESUME GAME
                        </button>
                        <button
                            type="button"
                            onClick={props.onRestart}
                            class="font-bebas text-[1rem] tracking-[.14em] bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                        >
                            RESTART ROOM
                        </button>
                    </div>
                </Show>
            </div>
        </div>
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
