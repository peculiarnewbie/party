import {
    createEffect,
    createSignal,
    For,
    Show,
    Switch,
    Match,
    onCleanup,
} from "solid-js";
import {
    AnimatedNumber,
    PlayerAvatar,
    TableButton,
    TablePanel,
} from "~/components/casino";
import { CheeseThiefOutcome, CheeseThiefResults } from "./cheese-thief-results";
import type { CheeseThiefPlayerView } from "~/game/cheese-thief/views";
import type {
    CheeseThiefConnection,
    CheeseThiefClientOutgoing,
} from "~/game/cheese-thief/connection";
import type { PartyLayout } from "~/components/party-layout-controls";

interface CheeseThiefRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: CheeseThiefConnection;
    initialLayout?: PartyLayout;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export function CheeseThiefRoom(props: CheeseThiefRoomProps) {
    const view = () => props.connection.view();
    const [selectedTarget, setSelectedTarget] = createSignal<string | null>(
        null,
    );
    const [error, setError] = createSignal<string | null>(null);
    createEffect(
        () => `${view()?.myId}:${view()?.round}:${view()?.phase}`,
        () => {
            setSelectedTarget(null);
        },
    );
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "cheese_thief:error")
                setError(event.data.message);
            if (event.type === "cheese_thief:action") setError(null);
        }),
    );
    const send = (message: CheeseThiefClientOutgoing) => {
        if (props.playerId) props.connection.send(message);
    };
    const phase = () =>
        ({
            night: "Night",
            day: "Discussion",
            voting: "Voting",
            reveal: "Results",
        })[view()?.phase ?? "night"];
    return (
        <div
            data-testid="cheese-thief-room"
            class="min-h-screen bg-paper text-ink font-karla"
        >
            <Show
                when={view()}
                fallback={
                    <p class="p-8 font-bebas text-xl text-navy">
                        LOADING GAME...
                    </p>
                }
            >
                {(v) => (
                    <div
                        class={`mx-auto px-4 py-5 pb-24 ${props.initialLayout === "controller" ? "max-w-lg" : "max-w-3xl"}`}
                    >
                        <header class="flex items-start justify-between gap-3 mb-5">
                            <div class="min-w-0">
                                <h1 class="font-bebas text-3xl leading-tight">
                                    Cheese Thief
                                </h1>
                                <p class="font-bebas text-sm tracking-wider text-muted break-all">
                                    Room {props.roomId} · Round {v().round} ·{" "}
                                    {phase()}
                                </p>
                            </div>
                            <Show when={v().isHost}>
                                <TableButton
                                    onClick={props.onEndGame}
                                    tone="paper"
                                    size="compact"
                                    class="px-3 shrink-0 min-h-11"
                                >
                                    END
                                </TableButton>
                            </Show>
                        </header>
                        <Show when={error()}>
                            {(message) => (
                                <p
                                    role="alert"
                                    class="border-2 border-ink bg-cream text-tomato p-3 mb-4 shadow-ink-sm"
                                >
                                    {message()}
                                </p>
                            )}
                        </Show>
                        <Show when={v().phase !== "reveal"}>
                            <Show
                                keyed
                                when={`${v().myId}:${v().round}:${v().phase}`}
                            >
                                <PrivateClue view={v()} />
                            </Show>
                        </Show>
                        <Switch>
                            <Match when={v().phase === "night"}>
                                <TablePanel class="mt-4">
                                    <h2 class="font-bebas text-2xl">
                                        Check your role
                                    </h2>
                                    <p class="mt-1 text-muted">
                                        Read your clue, then hide it before
                                        discussing.
                                    </p>
                                    <Show
                                        when={v().isHost}
                                        fallback={
                                            <p
                                                role="status"
                                                class="mt-4 font-bebas text-lg text-navy"
                                            >
                                                WAITING FOR HOST TO START
                                                DISCUSSION
                                            </p>
                                        }
                                    >
                                        <TableButton
                                            onClick={() =>
                                                send({
                                                    type: "cheese_thief:start_day",
                                                    data: {},
                                                })
                                            }
                                            tone="navy"
                                            class="w-full mt-4"
                                        >
                                            BEGIN DISCUSSION
                                        </TableButton>
                                        <p class="mt-2 text-sm text-muted">
                                            Make sure everyone has checked their
                                            role.
                                        </p>
                                    </Show>
                                </TablePanel>
                            </Match>
                            <Match when={v().phase === "day"}>
                                <TablePanel class="mt-4">
                                    <h2 class="font-bebas text-2xl">
                                        Who stole the cheese?
                                    </h2>
                                    <p class="mt-1 text-muted">
                                        Share what you saw and ask questions.
                                        The thief and followers win together.
                                    </p>
                                    <Show
                                        when={v().isHost}
                                        fallback={
                                            <p
                                                role="status"
                                                class="mt-4 font-bebas text-lg text-navy"
                                            >
                                                DISCUSS WHILE THE HOST GETS
                                                VOTING READY
                                            </p>
                                        }
                                    >
                                        <TableButton
                                            onClick={() =>
                                                send({
                                                    type: "cheese_thief:start_voting",
                                                    data: {},
                                                })
                                            }
                                            tone="navy"
                                            class="w-full mt-4"
                                        >
                                            START VOTING
                                        </TableButton>
                                    </Show>
                                </TablePanel>
                            </Match>
                            <Match when={v().phase === "voting"}>
                                <VotingPhase
                                    view={v()}
                                    selectedTarget={selectedTarget()}
                                    onSelectTarget={setSelectedTarget}
                                    onVote={() => {
                                        const target = selectedTarget();
                                        if (target)
                                            send({
                                                type: "cheese_thief:cast_vote",
                                                data: { targetId: target },
                                            });
                                    }}
                                    onReveal={() =>
                                        send({
                                            type: "cheese_thief:reveal_votes",
                                            data: {},
                                        })
                                    }
                                />
                            </Match>
                            <Match when={v().phase === "reveal"}>
                                <Show when={v().voteResult}>
                                    {(result) => (
                                        <Show
                                            when={
                                                props.initialLayout ===
                                                "controller"
                                            }
                                            fallback={
                                                <CheeseThiefResults
                                                    players={v().players}
                                                    result={result()}
                                                />
                                            }
                                        >
                                            <CheeseThiefOutcome
                                                players={v().players}
                                                result={result()}
                                            />
                                            <TablePanel class="mt-4">
                                                <p class="text-muted">
                                                    Votes and roles are on the
                                                    big screen.
                                                </p>
                                                <p class="font-bebas text-2xl mt-2">
                                                    Your score:{" "}
                                                    <AnimatedNumber
                                                        value={
                                                            v().players.find(
                                                                (player) =>
                                                                    player.id ===
                                                                    v().myId,
                                                            )?.score ?? 0
                                                        }
                                                    />
                                                </p>
                                            </TablePanel>
                                        </Show>
                                    )}
                                </Show>
                                <Show
                                    when={v().isHost}
                                    fallback={
                                        <p class="mt-4 text-muted">
                                            Waiting for the host to start
                                            another round.
                                        </p>
                                    }
                                >
                                    <div class="flex gap-3 mt-5">
                                        <TableButton
                                            onClick={() =>
                                                send({
                                                    type: "cheese_thief:next_round",
                                                    data: {},
                                                })
                                            }
                                            tone="navy"
                                            class="flex-1 min-w-0"
                                        >
                                            PLAY AGAIN
                                        </TableButton>
                                        <TableButton
                                            onClick={props.onReturnToLobby}
                                            size="compact"
                                            class="px-4"
                                        >
                                            LOBBY
                                        </TableButton>
                                    </div>
                                </Show>
                            </Match>
                        </Switch>
                    </div>
                )}
            </Show>
        </div>
    );
}

function PrivateClue(props: { view: CheeseThiefPlayerView }) {
    const [open, setOpen] = createSignal(false);
    const role = () =>
        props.view.myRole === "thief"
            ? "Cheese Thief"
            : props.view.isFollower
              ? "Follower"
              : "Sleepyhead";
    return (
        <div class="mb-4">
            <button
                type="button"
                aria-expanded={open() ? "true" : "false"}
                onClick={() => setOpen((value) => !value)}
                class="flex w-full items-center justify-between gap-3 border-2 border-ink bg-cream px-4 py-3 shadow-ink-sm text-left min-h-11 focus-visible:outline-2 focus-visible:outline-navy"
            >
                <span class="font-bebas text-xl">
                    {open() ? "HIDE MY ROLE" : "SHOW MY ROLE"}
                </span>
                <span class="text-xs text-muted">Only for you</span>
            </button>
            <Show when={open()}>
                <div
                    data-testid="cheese-thief-private-clue"
                    class={`border-2 border-ink border-t-0 p-4 shadow-ink-sm ${props.view.myRole === "thief" ? "bg-tomato text-cream" : props.view.isFollower ? "bg-sun text-ink" : "bg-navy text-cream"}`}
                >
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <h2 class="font-bebas text-3xl leading-tight">
                                {role()}
                            </h2>
                            <p class="text-sm">
                                Wake time {props.view.myDieValue}
                            </p>
                        </div>
                        <DieIcon value={props.view.myDieValue} />
                    </div>
                    <p class="mt-3">
                        {props.view.myRole === "thief"
                            ? "You stole the cheese. Don't get caught!"
                            : props.view.isFollower
                              ? "You witnessed the theft. You win with the thief."
                              : "Find the thief and vote them out."}
                    </p>
                    <p class="mt-3 text-sm border-t border-current/30 pt-3">
                        <Show
                            when={props.view.observedPlayerNames.length}
                            fallback="You woke up alone. No one else was awake at your time."
                        >
                            <Show
                                when={props.view.myRole === "thief"}
                                fallback={
                                    <>
                                        {props.view.observedPlayerNames.join(
                                            ", ",
                                        )}{" "}
                                        woke up at the same time as you.
                                    </>
                                }
                            >
                                {props.view.observedPlayerNames.join(", ")}{" "}
                                witnessed you stealing the cheese.
                            </Show>
                        </Show>
                    </p>
                </div>
            </Show>
        </div>
    );
}

function DieIcon(props: { value: number }) {
    const dots: Record<number, [number, number][]> = {
        1: [[18, 18]],
        2: [
            [9, 9],
            [27, 27],
        ],
        3: [
            [9, 9],
            [18, 18],
            [27, 27],
        ],
        4: [
            [9, 9],
            [27, 9],
            [9, 27],
            [27, 27],
        ],
        5: [
            [9, 9],
            [27, 9],
            [18, 18],
            [9, 27],
            [27, 27],
        ],
        6: [
            [9, 9],
            [27, 9],
            [9, 18],
            [27, 18],
            [9, 27],
            [27, 27],
        ],
    };
    return (
        <svg
            role="img"
            aria-label={`Wake time ${props.value}`}
            width="44"
            height="44"
            viewBox="0 0 36 36"
            class="shrink-0"
        >
            <rect
                x="1"
                y="1"
                width="34"
                height="34"
                rx="3"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
            />
            <For each={dots[props.value] ?? []} keyed={false}>
                {(dot) => (
                    <circle
                        cx={dot()[0]}
                        cy={dot()[1]}
                        r="3"
                        fill="currentColor"
                    />
                )}
            </For>
        </svg>
    );
}

function VotingPhase(props: {
    view: CheeseThiefPlayerView;
    selectedTarget: string | null;
    onSelectTarget: (id: string | null) => void;
    onVote: () => void;
    onReveal: () => void;
}) {
    const selected = () => props.selectedTarget ?? props.view.myVote;
    const target = () =>
        props.view.players.find((player) => player.id === props.view.myVote);
    const canVote = () =>
        props.selectedTarget !== null &&
        props.selectedTarget !== props.view.myVote &&
        props.view.players.some(
            (player) =>
                player.id === props.selectedTarget &&
                player.id !== props.view.myId,
        );
    return (
        <div class="mt-4">
            <h2 class="font-bebas text-2xl">Vote for the thief</h2>
            <p role="status" class="text-sm text-muted mt-1 mb-4">
                {props.view.votedCount} of {props.view.totalVoters} voted.
                <Show when={props.view.hasVoted}>
                    {" "}
                    Your vote: {target()?.name ?? "Unknown"}. You can change it
                    until the reveal.
                </Show>
            </p>
            <div class="grid grid-cols-2 gap-2 mb-4">
                <For
                    each={props.view.players.filter(
                        (player) => player.id !== props.view.myId,
                    )}
                    keyed={false}
                >
                    {(player) => (
                        <button
                            type="button"
                            aria-label={player().name}
                            aria-pressed={
                                selected() === player().id ? "true" : "false"
                            }
                            onClick={() =>
                                props.onSelectTarget(
                                    props.selectedTarget === player().id
                                        ? null
                                        : player().id,
                                )
                            }
                            class={`flex items-center gap-2 min-w-0 min-h-14 p-3 border-2 border-ink shadow-ink-sm text-left focus-visible:outline-2 focus-visible:outline-navy ${selected() === player().id ? "bg-teal text-cream" : "bg-cream"}`}
                        >
                            <PlayerAvatar
                                id={player().id}
                                name={player().name}
                                class="size-8 text-lg"
                            />
                            <span class="font-bold text-sm break-words min-w-0">
                                {player().name}
                            </span>
                        </button>
                    )}
                </For>
            </div>
            <TableButton
                onClick={props.onVote}
                disabled={!canVote()}
                tone="navy"
                class="w-full"
            >
                {props.view.hasVoted ? "CHANGE VOTE" : "CAST VOTE"}
            </TableButton>
            <Show when={props.view.isHost}>
                <div class="mt-4 pt-4 border-t-2 border-ink">
                    <TableButton
                        onClick={props.onReveal}
                        disabled={props.view.votedCount === 0}
                        tone="tomato"
                        class="w-full"
                    >
                        REVEAL VOTES
                    </TableButton>
                    <p class="mt-2 text-sm text-muted">
                        <Show
                            when={
                                props.view.votedCount === props.view.totalVoters
                            }
                            fallback="Wait for everyone, or reveal the votes already cast."
                        >
                            Everyone has voted. Ready for the reveal.
                        </Show>
                    </p>
                </div>
            </Show>
        </div>
    );
}
