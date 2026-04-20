import {
    createSignal,
    For,
    Show,
    Switch,
    Match,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type { CheeseThiefPlayerView } from "~/game/cheese-thief/views";
import type { CheeseThiefConnection } from "~/game/cheese-thief/connection";

interface CheeseThiefRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: CheeseThiefConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export const CheeseThiefRoom: Component<CheeseThiefRoomProps> = (props) => {
    const view = () => props.connection.view();
    const [selectedTarget, setSelectedTarget] = createSignal<string | null>(
        null,
    );

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "cheese_thief:action") {
                const action = event.data as Record<string, unknown>;
                if (
                    action.type === "round_started" ||
                    action.type === "voting_started"
                ) {
                    setSelectedTarget(null);
                }
            }
        }),
    );

    const handleVote = () => {
        const target = selectedTarget();
        if (!target || !props.playerId) return;
        props.connection.send({
            type: "cheese_thief:cast_vote",
            data: { targetId: target },
        });
    };

    const startDay = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "cheese_thief:start_day",
            data: {},
        });
    };

    const startVoting = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "cheese_thief:start_voting",
            data: {},
        });
    };

    const revealVotes = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "cheese_thief:reveal_votes",
            data: {},
        });
    };

    const nextRound = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "cheese_thief:next_round",
            data: {},
        });
    };

    return (
        <div class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla">
            <Show when={view()} fallback={<LoadingScreen />}>
                {(v) => (
                    <>
                        <Header
                            roomId={props.roomId}
                            round={v().round}
                            phase={v().phase}
                            isHost={v().isHost}
                            onEndGame={props.onEndGame}
                            onReturnToLobby={props.onReturnToLobby}
                        />
                        <div class="max-w-2xl mx-auto px-6 pb-24">
                            <Switch>
                                <Match when={v().phase === "night"}>
                                    <NightPhase
                                        view={v()}
                                        onStartDay={startDay}
                                    />
                                </Match>
                                <Match when={v().phase === "day"}>
                                    <DayPhase
                                        view={v()}
                                        onStartVoting={startVoting}
                                    />
                                </Match>
                                <Match when={v().phase === "voting"}>
                                    <VotingPhase
                                        view={v()}
                                        selectedTarget={selectedTarget()}
                                        onSelectTarget={setSelectedTarget}
                                        onVote={handleVote}
                                        onReveal={revealVotes}
                                    />
                                </Match>
                                <Match when={v().phase === "reveal"}>
                                    <RevealPhase
                                        view={v()}
                                        onNextRound={nextRound}
                                        onReturnToLobby={props.onReturnToLobby}
                                    />
                                </Match>
                            </Switch>
                            <Show when={v().leaderboard.length > 0 && v().round > 1}>
                                <Leaderboard
                                    players={v().leaderboard}
                                    myId={v().myId}
                                />
                            </Show>
                        </div>
                    </>
                )}
            </Show>
        </div>
    );
};

function LoadingScreen() {
    return (
        <div class="min-h-screen flex items-center justify-center bg-[#ddd5c4]">
            <div class="font-bebas text-[1.2rem] tracking-[.18em] text-[#9a9080]">
                LOADING GAME...
            </div>
        </div>
    );
}

function Header(props: {
    roomId: string;
    round: number;
    phase: string;
    isHost: boolean;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}) {
    const phaseLabel = () => {
        switch (props.phase) {
            case "night":
                return "NIGHT PHASE";
            case "day":
                return "DISCUSSION";
            case "voting":
                return "VOTE";
            case "reveal":
                return "RESULTS";
            default:
                return "";
        }
    };

    return (
        <div class="border-b-2 border-[#1a1a1a] bg-[#c9c0b0] px-6 py-4">
            <div class="max-w-2xl mx-auto flex items-center justify-between">
                <div>
                    <div class="font-bebas text-[.65rem] tracking-[.28em] text-[#9a9080]">
                        CHEESE THIEF
                    </div>
                    <div class="font-bebas text-[1.6rem] tracking-[.06em] leading-none">
                        {phaseLabel()}
                    </div>
                </div>
                <div class="flex items-center gap-3">
                    <div class="font-bebas text-[.7rem] tracking-[.18em] text-[#9a9080]">
                        ROUND {props.round}
                    </div>
                    <Show when={props.isHost}>
                        <button
                            type="button"
                            onClick={props.onEndGame}
                            class="font-bebas text-[.8rem] tracking-[.14em] bg-[#ddd5c4] text-[#c0261a] border-2 border-[#1a1a1a] px-3 py-1 shadow-[2px_2px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                        >
                            END
                        </button>
                    </Show>
                </div>
            </div>
        </div>
    );
}

function RoleCard(props: {
    role: "thief" | "sleepyhead";
    dieValue: number;
    isFollower: boolean;
}) {
    const roleLabel = () => {
        if (props.role === "thief") return "CHEESE THIEF";
        if (props.isFollower) return "FOLLOWER";
        return "SLEEPYHEAD";
    };

    const roleColor = () => {
        if (props.role === "thief") return "bg-[#c0261a] text-[#ddd5c4]";
        if (props.isFollower) return "bg-[#8b6914] text-[#ddd5c4]";
        return "bg-[#1a3a6e] text-[#ddd5c4]";
    };

    const roleDescription = () => {
        if (props.role === "thief")
            return "You stole the cheese at time 3! Don't get caught.";
        if (props.isFollower)
            return "You witnessed the theft! You win with the Thief.";
        return "Find the Cheese Thief and vote them out!";
    };

    return (
        <div
            class={`border-2 border-[#1a1a1a] px-6 py-5 shadow-[4px_4px_0_#1a1a1a] mb-5 ${roleColor()}`}
        >
            <div class="flex items-center justify-between mb-2">
                <div class="font-bebas text-[1.8rem] tracking-[.08em] leading-none">
                    {roleLabel()}
                </div>
                <div class="flex items-center gap-2">
                    <DieIcon value={props.dieValue} />
                </div>
            </div>
            <div class="text-[.9rem] leading-relaxed opacity-80">
                {roleDescription()}
            </div>
        </div>
    );
}

function DieIcon(props: { value: number }) {
    const dotPositions: Record<number, [number, number][]> = {
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

    const dots = () => dotPositions[props.value] ?? [];

    return (
        <svg width="36" height="36" viewBox="0 0 36 36">
            <rect
                x="1"
                y="1"
                width="34"
                height="34"
                rx="4"
                fill="currentColor"
                fill-opacity="0.2"
                stroke="currentColor"
                stroke-width="2"
            />
            <For each={dots()}>
                {([cx, cy]) => (
                    <circle cx={cx} cy={cy} r="3" fill="currentColor" />
                )}
            </For>
        </svg>
    );
}

function ObservationPanel(props: {
    view: CheeseThiefPlayerView;
}) {
    return (
        <div class="border-2 border-[#b8ae9e] bg-[#c9c0b0] px-5 py-4 mb-5">
            <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-2">
                WHAT YOU SAW AT TIME {props.view.myDieValue}
            </div>
            <Show
                when={props.view.observedPlayerNames.length > 0}
                fallback={
                    <div class="text-[.95rem] text-[#5a5040]">
                        You woke up alone. No one else stirred at this hour.
                    </div>
                }
            >
                <div class="text-[.95rem] text-[#1a1a1a]">
                    <Show
                        when={props.view.myRole === "thief"}
                        fallback={
                            <span>
                                You saw{" "}
                                <strong>
                                    {props.view.observedPlayerNames.join(", ")}
                                </strong>{" "}
                                awake at the same time as you.
                            </span>
                        }
                    >
                        <span>
                            You stole the cheese!{" "}
                            <Show when={props.view.observedPlayerNames.length > 0}>
                                <strong>
                                    {props.view.observedPlayerNames.join(", ")}
                                </strong>{" "}
                                witnessed you.
                            </Show>
                        </span>
                    </Show>
                </div>
                <Show
                    when={
                        props.view.isFollower && props.view.myRole === "sleepyhead"
                    }
                >
                    <div class="mt-2 font-bebas text-[.75rem] tracking-[.18em] text-[#8b6914]">
                        YOU ARE A FOLLOWER - YOU WIN WITH THE THIEF
                    </div>
                </Show>
            </Show>
        </div>
    );
}

function NightPhase(props: {
    view: CheeseThiefPlayerView;
    onStartDay: () => void;
}) {
    return (
        <div class="pt-8">
            <div class="text-center mb-6">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-1">
                    THE NIGHT BEGINS
                </div>
                <div class="font-bebas text-[2rem] tracking-[.06em] leading-none">
                    Check your role
                </div>
            </div>

            <RoleCard
                role={props.view.myRole}
                dieValue={props.view.myDieValue}
                isFollower={props.view.isFollower}
            />

            <ObservationPanel view={props.view} />

            <Show when={props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onStartDay}
                    class="w-full font-bebas text-[1.2rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-4 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080] mt-4"
                >
                    BEGIN DISCUSSION
                </button>
                <div class="mt-2 font-bebas text-[.7rem] tracking-[.18em] text-[#9a9080] text-center">
                    MAKE SURE EVERYONE HAS CHECKED THEIR ROLE
                </div>
            </Show>

            <Show when={!props.view.isHost}>
                <div class="mt-6 text-center font-bebas text-[.85rem] tracking-[.14em] text-[#9a9080]">
                    WAITING FOR HOST TO START DISCUSSION...
                </div>
            </Show>
        </div>
    );
}

function DayPhase(props: {
    view: CheeseThiefPlayerView;
    onStartVoting: () => void;
}) {
    return (
        <div class="pt-8">
            <div class="text-center mb-6">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#c0261a] mb-1">
                    THE CHEESE IS MISSING
                </div>
                <div class="font-bebas text-[2rem] tracking-[.06em] leading-none">
                    Discuss and find the thief
                </div>
            </div>

            <RoleCard
                role={props.view.myRole}
                dieValue={props.view.myDieValue}
                isFollower={props.view.isFollower}
            />

            <ObservationPanel view={props.view} />

            <div class="border-2 border-[#b8ae9e] bg-[#c9c0b0] px-5 py-4 mb-5">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-2">
                    PLAYERS
                </div>
                <div class="flex flex-wrap gap-2">
                    <For each={props.view.players}>
                        {(p) => (
                            <div
                                class={`px-3 py-1 border-2 text-[.85rem] ${
                                    p.id === props.view.myId
                                        ? "border-[#1a3a6e] bg-[#1a3a6e] text-[#ddd5c4]"
                                        : "border-[#b8ae9e] bg-[#ddd5c4] text-[#1a1a1a]"
                                }`}
                            >
                                {p.name}
                                <Show when={p.id === props.view.myId}>
                                    <span class="ml-1 text-[.7rem] opacity-70">
                                        (you)
                                    </span>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
            </div>

            <Show when={props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onStartVoting}
                    class="w-full font-bebas text-[1.2rem] tracking-[.12em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-4 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] mt-4"
                >
                    START VOTING
                </button>
            </Show>

            <Show when={!props.view.isHost}>
                <div class="mt-6 text-center font-bebas text-[.85rem] tracking-[.14em] text-[#9a9080]">
                    DISCUSS WHO YOU THINK IS THE THIEF...
                </div>
            </Show>
        </div>
    );
}

function VotingPhase(props: {
    view: CheeseThiefPlayerView;
    selectedTarget: string | null;
    onSelectTarget: (id: string | null) => void;
    onVote: () => void;
    onReveal: () => void;
}) {
    const otherPlayers = () =>
        props.view.players.filter((p) => p.id !== props.view.myId);

    const currentVoteTarget = () => {
        if (!props.view.myVote) return null;
        return props.view.players.find((p) => p.id === props.view.myVote) ?? null;
    };

    return (
        <div class="pt-8">
            <div class="text-center mb-6">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#c0261a] mb-1">
                    POINT YOUR FINGER
                </div>
                <div class="font-bebas text-[2rem] tracking-[.06em] leading-none">
                    Vote for the thief
                </div>
            </div>

            <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-3">
                {props.view.votedCount} OF {props.view.totalVoters} VOTED
            </div>

            <div class="h-2 bg-[#b8ae9e] mb-5 border border-[#9a9080]">
                <div
                    class="h-full bg-[#1a3a6e] transition-all duration-300"
                    style={{
                        width: `${(props.view.votedCount / props.view.totalVoters) * 100}%`,
                    }}
                />
            </div>

            <Show when={props.view.hasVoted}>
                <div class="border-2 border-[#1a3a6e] bg-[#1a3a6e] text-[#ddd5c4] px-5 py-4 mb-5 shadow-[3px_3px_0_#1a1a1a]">
                    <div class="font-bebas text-[.7rem] tracking-[.24em] opacity-70 mb-1">
                        YOUR VOTE
                    </div>
                    <div class="font-bebas text-[1.4rem] tracking-[.06em]">
                        {currentVoteTarget()?.name ?? "Unknown"}
                    </div>
                    <div class="text-[.8rem] opacity-60 mt-1">
                        You can change your vote below
                    </div>
                </div>
            </Show>

            <div class="space-y-2 mb-5">
                <For each={otherPlayers()}>
                    {(p) => {
                        const isSelected = () =>
                            props.selectedTarget === p.id ||
                            (!props.selectedTarget && props.view.myVote === p.id);

                        return (
                            <button
                                type="button"
                                onClick={() =>
                                    props.onSelectTarget(
                                        props.selectedTarget === p.id
                                            ? null
                                            : p.id,
                                    )
                                }
                                class={`w-full text-left px-5 py-3 border-2 transition-all duration-[120ms] ${
                                    isSelected()
                                        ? "border-[#c0261a] bg-[#c0261a] text-[#ddd5c4] shadow-[3px_3px_0_#1a1a1a]"
                                        : "border-[#b8ae9e] bg-[#c9c0b0] text-[#1a1a1a] hover:border-[#1a1a1a]"
                                }`}
                            >
                                <div class="font-bebas text-[1.1rem] tracking-[.08em]">
                                    {p.name}
                                </div>
                            </button>
                        );
                    }}
                </For>
            </div>

            <Show when={!props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onVote}
                    disabled={!props.selectedTarget}
                    class="w-full font-bebas text-[1.2rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-4 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#9a9080]"
                >
                    <Show when={props.view.hasVoted} fallback="CAST VOTE">
                        CHANGE VOTE
                    </Show>
                </button>
            </Show>

            <Show when={props.view.isHost}>
                <div class="flex gap-3">
                    <button
                        type="button"
                        onClick={props.onVote}
                        disabled={!props.selectedTarget}
                        class="flex-1 font-bebas text-[1.1rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-4 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#9a9080]"
                    >
                        <Show when={props.view.hasVoted} fallback="CAST VOTE">
                            CHANGE VOTE
                        </Show>
                    </button>
                    <button
                        type="button"
                        onClick={props.onReveal}
                        class="flex-1 font-bebas text-[1.1rem] tracking-[.12em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-4 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                    >
                        REVEAL VOTES
                    </button>
                </div>
            </Show>
        </div>
    );
}

function RevealPhase(props: {
    view: CheeseThiefPlayerView;
    onNextRound: () => void;
    onReturnToLobby: () => void;
}) {
    const result = () => props.view.voteResult;
    const winBanner = () => {
        const r = result();
        if (!r) return { title: "", subtitle: "" };
        if (r.winningTeam === "sleepyheads") {
            return {
                title: "SLEEPYHEADS WIN",
                subtitle: `${props.view.thiefName} was caught red-handed!`,
                color: "bg-[#1a3a6e]",
            };
        }
        return {
            title: "THE THIEF ESCAPES",
            subtitle: `${props.view.thiefName} got away with the cheese!`,
            color: "bg-[#c0261a]",
        };
    };

    return (
        <div class="pt-8">
            <Show when={result()}>
                {(r) => (
                    <>
                        <div
                            class={`${winBanner().color} text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-6 shadow-[4px_4px_0_#1a1a1a] mb-5 text-center`}
                        >
                            <div class="font-bebas text-[2.4rem] tracking-[.08em] leading-none mb-2">
                                {winBanner().title}
                            </div>
                            <div class="text-[1rem] opacity-80">
                                {winBanner().subtitle}
                            </div>
                        </div>

                        <Show when={props.view.followerNames.length > 0}>
                            <div class="border-2 border-[#8b6914] bg-[#8b6914]/10 px-5 py-3 mb-5">
                                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#8b6914] mb-1">
                                    FOLLOWERS
                                </div>
                                <div class="text-[.95rem] text-[#1a1a1a]">
                                    {props.view.followerNames.join(", ")} witnessed
                                    the theft and{" "}
                                    {r().winningTeam === "thief"
                                        ? "won with the Thief"
                                        : "lost with the Thief"}
                                    .
                                </div>
                            </div>
                        </Show>

                        <div class="border-2 border-[#b8ae9e] bg-[#c9c0b0] px-5 py-4 mb-5">
                            <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-3">
                                VOTE RESULTS
                            </div>
                            <div class="space-y-2">
                                <For
                                    each={props.view.players.sort(
                                        (a, b) =>
                                            (r().voteCounts[b.id] ?? 0) -
                                            (r().voteCounts[a.id] ?? 0),
                                    )}
                                >
                                    {(p) => {
                                        const voteCount = () =>
                                            r().voteCounts[p.id] ?? 0;
                                        const isThief = () =>
                                            p.id === r().thiefId;
                                        const isFollower = () =>
                                            r().followerIds.includes(p.id);
                                        const isMostVoted = () =>
                                            r().mostVotedIds.includes(p.id);
                                        const voterNames = () =>
                                            Object.entries(r().votes)
                                                .filter(
                                                    ([, target]) =>
                                                        target === p.id,
                                                )
                                                .map(([voterId]) => {
                                                    const voter =
                                                        props.view.players.find(
                                                            (pl) =>
                                                                pl.id ===
                                                                voterId,
                                                        );
                                                    return (
                                                        voter?.name ??
                                                        "Unknown"
                                                    );
                                                });

                                        return (
                                            <div
                                                class={`flex items-center gap-3 px-4 py-3 border-2 ${
                                                    isMostVoted()
                                                        ? "border-[#c0261a] bg-[#c0261a]/10"
                                                        : "border-[#b8ae9e] bg-[#ddd5c4]"
                                                }`}
                                            >
                                                <div class="flex-1">
                                                    <div class="flex items-center gap-2">
                                                        <span class="font-bebas text-[1.1rem] tracking-[.06em]">
                                                            {p.name}
                                                        </span>
                                                        <Show when={isThief()}>
                                                            <span class="font-bebas text-[.65rem] tracking-[.18em] text-[#c0261a] bg-[#c0261a]/10 px-2 py-0.5">
                                                                THIEF
                                                            </span>
                                                        </Show>
                                                        <Show
                                                            when={
                                                                isFollower() &&
                                                                !isThief()
                                                            }
                                                        >
                                                            <span class="font-bebas text-[.65rem] tracking-[.18em] text-[#8b6914] bg-[#8b6914]/10 px-2 py-0.5">
                                                                FOLLOWER
                                                            </span>
                                                        </Show>
                                                    </div>
                                                    <Show
                                                        when={
                                                            voterNames().length >
                                                            0
                                                        }
                                                    >
                                                        <div class="text-[.75rem] text-[#9a9080] mt-0.5">
                                                            voted by:{" "}
                                                            {voterNames().join(
                                                                ", ",
                                                            )}
                                                        </div>
                                                    </Show>
                                                </div>
                                                <div class="font-bebas text-[1.6rem] tracking-[.04em] text-[#1a1a1a]">
                                                    {voteCount()}
                                                </div>
                                            </div>
                                        );
                                    }}
                                </For>
                            </div>
                        </div>
                    </>
                )}
            </Show>

            <Show when={props.view.isHost}>
                <div class="flex gap-3 mt-6">
                    <button
                        type="button"
                        onClick={props.onNextRound}
                        class="flex-1 font-bebas text-[1.2rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-4 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                    >
                        PLAY AGAIN
                    </button>
                    <button
                        type="button"
                        onClick={props.onReturnToLobby}
                        class="font-bebas text-[1.2rem] tracking-[.12em] bg-[#c9c0b0] text-[#5a5040] border-2 border-[#b8ae9e] px-6 py-4 transition-all duration-[120ms] hover:bg-[#bfb5a4] hover:border-[#5a5040]"
                    >
                        LOBBY
                    </button>
                </div>
            </Show>
        </div>
    );
}

function Leaderboard(props: {
    players: { id: string; name: string; score: number }[];
    myId: string;
}) {
    return (
        <div class="mt-8 border-2 border-[#b8ae9e] bg-[#c9c0b0] px-5 py-4">
            <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-3">
                SCORES
            </div>
            <div class="space-y-1">
                <For each={props.players}>
                    {(p, i) => (
                        <div
                            class={`flex items-center gap-3 px-3 py-2 ${
                                p.id === props.myId
                                    ? "bg-[#1a3a6e]/10 border border-[#1a3a6e]/20"
                                    : ""
                            }`}
                        >
                            <span class="font-bebas text-[.85rem] tracking-[.08em] text-[#9a9080] w-6">
                                {i() + 1}.
                            </span>
                            <span class="flex-1 text-[.9rem]">{p.name}</span>
                            <span class="font-bebas text-[1.2rem] tracking-[.04em]">
                                {p.score}
                            </span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}
