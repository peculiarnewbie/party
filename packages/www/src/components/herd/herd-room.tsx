import {
    createSignal,
    For,
    Show,
    Switch,
    Match,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type { HerdPlayerView, AnswerGroupView } from "~/game/herd/views";
import type { HerdConnection } from "~/game/herd/connection";

interface HerdRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: HerdConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export const HerdRoom: Component<HerdRoomProps> = (props) => {
    const view = () => props.connection.view();
    const [answerInput, setAnswerInput] = createSignal("");
    const [customQuestionInput, setCustomQuestionInput] = createSignal("");
    const [selectedGroups, setSelectedGroups] = createSignal<string[]>([]);
    const [submitted, setSubmitted] = createSignal(false);

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "herd:action") {
                const action = event.data as { type?: string };
                if (
                    action.type === "question_started" ||
                    action.type === "round_advanced"
                ) {
                    setAnswerInput("");
                    setSubmitted(false);
                    setSelectedGroups([]);
                }
            }
        }),
    );

    const toggleGroupSelection = (groupId: string) => {
        setSelectedGroups((prev) => {
            if (prev.includes(groupId)) {
                return prev.filter((id) => id !== groupId);
            }
            if (prev.length >= 2) {
                return [prev[1], groupId];
            }
            return [...prev, groupId];
        });
    };

    const handleMerge = () => {
        const sel = selectedGroups();
        if (sel.length === 2) {
            props.connection.send({
                type: "herd:merge_groups",
                data: { groupId1: sel[0]!, groupId2: sel[1]! },
            });
            setSelectedGroups([]);
        }
    };

    const handleSubmitAnswer = () => {
        const answer = answerInput().trim();
        if (answer.length === 0) return;
        props.connection.send({
            type: "herd:submit_answer",
            data: { answer },
        });
        setSubmitted(true);
    };

    const handleNextQuestion = () => {
        const custom = customQuestionInput().trim();
        props.connection.send({
            type: "herd:next_question",
            data: custom ? { customQuestion: custom } : {},
        });
        setCustomQuestionInput("");
    };

    const handleTogglePinkCow = (enabled: boolean) => {
        props.connection.send({
            type: "herd:toggle_pink_cow",
            data: { enabled },
        });
    };

    const handleCloseAnswers = () => {
        props.connection.send({
            type: "herd:close_answers",
            data: {},
        });
    };

    const handleConfirmScoring = () => {
        props.connection.send({
            type: "herd:confirm_scoring",
            data: {},
        });
    };

    const handleNextRound = () => {
        props.connection.send({
            type: "herd:next_round",
            data: {},
        });
    };

    const playerName = (id: string) => {
        const v = view();
        if (!v) return "Unknown";
        return v.players.find((p) => p.id === id)?.name ?? "Unknown";
    };

    return (
        <div class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla">
            <Show when={view()} keyed>
                {(v) => (
                    <div class="max-w-3xl mx-auto px-4 py-6">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h1 class="font-bebas text-[2rem] tracking-[.08em] leading-none">
                                    HERD MENTALITY
                                </h1>
                                <div class="font-bebas text-[.75rem] tracking-[.2em] text-[#9a9080]">
                                    ROOM {props.roomId.toUpperCase()}
                                    <Show when={v.roundNumber > 0}>
                                        {" "}&middot; ROUND {v.roundNumber}
                                    </Show>
                                </div>
                            </div>
                            <Show when={v.isHost}>
                                <button
                                    type="button"
                                    onClick={props.onEndGame}
                                    class="font-bebas text-[.8rem] tracking-[.16em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-3 py-1.5 shadow-[2px_2px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]"
                                >
                                    END GAME
                                </button>
                            </Show>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-6">
                            <div>
                                <Switch>
                                    <Match when={v.phase === "waiting"}>
                                        <WaitingPhase
                                            view={v}
                                            customQuestion={customQuestionInput()}
                                            setCustomQuestion={setCustomQuestionInput}
                                            onNextQuestion={handleNextQuestion}
                                            onTogglePinkCow={handleTogglePinkCow}
                                            onReturnToLobby={props.onReturnToLobby}
                                        />
                                    </Match>
                                    <Match when={v.phase === "answering"}>
                                        <AnsweringPhase
                                            view={v}
                                            answerInput={answerInput()}
                                            setAnswerInput={setAnswerInput}
                                            submitted={submitted()}
                                            onSubmit={handleSubmitAnswer}
                                            onChangeAnswer={() => setSubmitted(false)}
                                            onCloseAnswers={handleCloseAnswers}
                                        />
                                    </Match>
                                    <Match when={v.phase === "reveal"}>
                                        <RevealPhase
                                            view={v}
                                            selectedGroups={selectedGroups()}
                                            onToggleGroup={toggleGroupSelection}
                                            onMerge={handleMerge}
                                            onConfirmScoring={handleConfirmScoring}
                                        />
                                    </Match>
                                    <Match when={v.phase === "scored"}>
                                        <ScoredPhase
                                            view={v}
                                            onNextRound={handleNextRound}
                                        />
                                    </Match>
                                    <Match when={v.phase === "game_over"}>
                                        <GameOverPhase
                                            view={v}
                                            playerName={playerName}
                                            onReturnToLobby={props.onReturnToLobby}
                                        />
                                    </Match>
                                </Switch>
                            </div>

                            <Leaderboard view={v} playerName={playerName} />
                        </div>
                    </div>
                )}
            </Show>
        </div>
    );
};

const WaitingPhase: Component<{
    view: HerdPlayerView;
    customQuestion: string;
    setCustomQuestion: (v: string) => void;
    onNextQuestion: () => void;
    onTogglePinkCow: (enabled: boolean) => void;
    onReturnToLobby: () => void;
}> = (props) => {
    return (
        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a]">
            <Show
                when={props.view.isHost}
                fallback={
                    <div class="text-center py-8">
                        <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-2">
                            GET READY
                        </div>
                        <h2 class="font-bebas text-[1.6rem] tracking-[.06em] mb-2">
                            WAITING FOR HOST
                        </h2>
                        <p class="text-[.9rem] text-[#5a5040]">
                            The host will start the next question...
                        </p>
                    </div>
                }
            >
                <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-4">
                    HOST CONTROLS
                </div>

                <div class="mb-4">
                    <label class="font-bebas text-[.8rem] tracking-[.16em] block mb-1">
                        CUSTOM QUESTION (OPTIONAL)
                    </label>
                    <input
                        type="text"
                        value={props.customQuestion}
                        onInput={(e) => props.setCustomQuestion(e.currentTarget.value)}
                        placeholder="Leave blank to use question bank..."
                        class="w-full border-2 border-[#1a1a1a] bg-[#ddd5c4] px-3 py-2 text-[.9rem] font-karla focus:outline-none focus:ring-2 focus:ring-[#1a3a6e]"
                    />
                </div>

                <button
                    type="button"
                    onClick={props.onNextQuestion}
                    class="w-full font-bebas text-[1.1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] mb-4"
                >
                    {props.view.roundNumber === 0 ? "START FIRST QUESTION" : "NEXT QUESTION"}
                </button>

                <div class="flex items-center justify-between border-t border-[#9a9080] pt-4">
                    <div class="flex items-center gap-3">
                        <label class="font-bebas text-[.8rem] tracking-[.16em]">
                            PINK COW
                        </label>
                        <button
                            type="button"
                            onClick={() =>
                                props.onTogglePinkCow(!props.view.pinkCowEnabled)
                            }
                            class={`relative w-10 h-5 border-2 border-[#1a1a1a] transition-colors duration-200 ${
                                props.view.pinkCowEnabled
                                    ? "bg-[#c0261a]"
                                    : "bg-[#9a9080]"
                            }`}
                        >
                            <div
                                class={`absolute top-0 w-3 h-3 bg-[#ddd5c4] border border-[#1a1a1a] transition-transform duration-200 ${
                                    props.view.pinkCowEnabled
                                        ? "translate-x-5"
                                        : "translate-x-0.5"
                                }`}
                                style={{ top: "1px" }}
                            />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={props.onReturnToLobby}
                        class="font-bebas text-[.75rem] tracking-[.16em] text-[#9a9080] hover:text-[#c0261a] transition-colors"
                    >
                        RETURN TO LOBBY
                    </button>
                </div>
            </Show>
        </div>
    );
};

const AnsweringPhase: Component<{
    view: HerdPlayerView;
    answerInput: string;
    setAnswerInput: (v: string) => void;
    submitted: boolean;
    onSubmit: () => void;
    onChangeAnswer: () => void;
    onCloseAnswers: () => void;
}> = (props) => {
    return (
        <div>
            <div class="border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] p-6 shadow-[4px_4px_0_#1a1a1a] mb-4">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#b8ae9e] mb-2">
                    QUESTION
                </div>
                <h2 class="font-bebas text-[1.6rem] tracking-[.04em] leading-tight">
                    {props.view.currentQuestion}
                </h2>
            </div>

            <Show
                when={props.view.isHost}
                fallback={
                    <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a]">
                        <Show
                            when={!props.submitted}
                            fallback={
                                <div class="text-center">
                                    <div class="font-bebas text-[1.2rem] tracking-[.1em] text-[#1a3a6e] mb-2">
                                        ANSWER SUBMITTED
                                    </div>
                                    <p class="text-[.9rem] text-[#5a5040] mb-4">
                                        "{props.view.myAnswer}"
                                    </p>
                                    <button
                                        type="button"
                                        onClick={props.onChangeAnswer}
                                        class="font-bebas text-[.8rem] tracking-[.16em] text-[#c0261a] hover:underline"
                                    >
                                        CHANGE ANSWER
                                    </button>
                                </div>
                            }
                        >
                            <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                                YOUR ANSWER
                            </div>
                            <div class="flex gap-2">
                                <input
                                    type="text"
                                    value={props.answerInput}
                                    onInput={(e) =>
                                        props.setAnswerInput(e.currentTarget.value)
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") props.onSubmit();
                                    }}
                                    placeholder="Type your answer..."
                                    maxLength={200}
                                    class="flex-1 border-2 border-[#1a1a1a] bg-[#ddd5c4] px-3 py-2 text-[.95rem] font-karla focus:outline-none focus:ring-2 focus:ring-[#1a3a6e]"
                                />
                                <button
                                    type="button"
                                    onClick={props.onSubmit}
                                    disabled={props.answerInput.trim().length === 0}
                                    class="font-bebas text-[.95rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-4 py-2 shadow-[2px_2px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] disabled:opacity-40 disabled:pointer-events-none"
                                >
                                    SUBMIT
                                </button>
                            </div>
                        </Show>
                    </div>
                }
            >
                <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a]">
                    <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                        ANSWERS INCOMING
                    </div>
                    <div class="flex items-end gap-3 mb-4">
                        <div class="font-bebas text-[3rem] leading-none tracking-[.04em] text-[#1a3a6e]">
                            {props.view.answeredCount}
                        </div>
                        <div class="font-bebas text-[1.2rem] tracking-[.08em] text-[#5a5040] pb-1">
                            / {props.view.totalPlayers} ANSWERED
                        </div>
                    </div>
                    <div class="w-full bg-[#ddd5c4] border-2 border-[#1a1a1a] h-4 mb-4">
                        <div
                            class="h-full bg-[#1a3a6e] transition-all duration-300"
                            style={{
                                width: `${props.view.totalPlayers > 0 ? (props.view.answeredCount / props.view.totalPlayers) * 100 : 0}%`,
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={props.onCloseAnswers}
                        class="w-full font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                    >
                        CLOSE ANSWERS
                    </button>
                </div>
            </Show>
        </div>
    );
};

const RevealPhase: Component<{
    view: HerdPlayerView;
    selectedGroups: string[];
    onToggleGroup: (groupId: string) => void;
    onMerge: () => void;
    onConfirmScoring: () => void;
}> = (props) => {
    return (
        <div>
            <div class="border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] p-4 shadow-[4px_4px_0_#1a1a1a] mb-4">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#b8ae9e] mb-1">
                    QUESTION
                </div>
                <h2 class="font-bebas text-[1.3rem] tracking-[.04em] leading-tight">
                    {props.view.currentQuestion}
                </h2>
            </div>

            <Show when={props.view.isHost}>
                <div class="border-2 border-[#1a1a1a] bg-[#c0261a] text-[#ddd5c4] px-4 py-3 shadow-[3px_3px_0_#1a1a1a] mb-4">
                    <div class="font-bebas text-[.8rem] tracking-[.16em]">
                        SELECT TWO GROUPS TO MERGE SYNONYMS / TYPOS, THEN CONFIRM SCORING
                    </div>
                </div>
            </Show>

            <div class="space-y-3 mb-4">
                <For each={props.view.answerGroups}>
                    {(group) => (
                        <AnswerGroupCard
                            group={group}
                            isHost={props.view.isHost}
                            isSelected={props.selectedGroups.includes(group.id)}
                            onToggle={() => props.onToggleGroup(group.id)}
                        />
                    )}
                </For>
            </div>

            <Show when={props.view.answerGroups.length === 0}>
                <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a] text-center mb-4">
                    <p class="text-[.9rem] text-[#5a5040]">
                        No answers were submitted this round.
                    </p>
                </div>
            </Show>

            <Show
                when={props.view.isHost}
                fallback={
                    <div class="text-center py-4">
                        <p class="font-bebas text-[.85rem] tracking-[.16em] text-[#9a9080]">
                            WAITING FOR HOST TO CONFIRM SCORING...
                        </p>
                    </div>
                }
            >
                <div class="flex gap-3">
                    <Show when={props.selectedGroups.length === 2}>
                        <button
                            type="button"
                            onClick={props.onMerge}
                            class="flex-1 font-bebas text-[1rem] tracking-[.14em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                        >
                            MERGE SELECTED
                        </button>
                    </Show>
                    <button
                        type="button"
                        onClick={props.onConfirmScoring}
                        class="flex-1 font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                    >
                        CONFIRM SCORING
                    </button>
                </div>
            </Show>
        </div>
    );
};

const AnswerGroupCard: Component<{
    group: AnswerGroupView;
    isHost: boolean;
    isSelected: boolean;
    onToggle: () => void;
}> = (props) => {
    const borderColor = () =>
        props.isSelected ? "border-[#c0261a]" : "border-[#1a1a1a]";
    const bgColor = () =>
        props.isSelected ? "bg-[#e8d8c8]" : "bg-[#c9c0b0]";

    return (
        <div
            class={`border-2 ${borderColor()} ${bgColor()} p-4 shadow-[3px_3px_0_#1a1a1a] ${
                props.isHost ? "cursor-pointer" : ""
            } transition-all duration-100`}
            onClick={() => {
                if (props.isHost) props.onToggle();
            }}
        >
            <div class="flex items-start justify-between mb-2">
                <div class="font-bebas text-[1.3rem] tracking-[.04em] leading-tight">
                    "{props.group.canonicalAnswer}"
                </div>
                <div class="font-bebas text-[1.6rem] tracking-[.04em] text-[#1a3a6e] leading-none ml-4">
                    {props.group.count}
                </div>
            </div>
            <div class="text-[.8rem] text-[#5a5040]">
                <For each={props.group.playerNames}>
                    {(name, i) => (
                        <span>
                            {name}
                            <Show when={i() < props.group.playerNames.length - 1}>
                                ,{" "}
                            </Show>
                        </span>
                    )}
                </For>
            </div>
            <Show when={props.isHost && props.isSelected}>
                <div class="mt-2 font-bebas text-[.7rem] tracking-[.2em] text-[#c0261a]">
                    SELECTED FOR MERGE
                </div>
            </Show>
        </div>
    );
};

const ScoredPhase: Component<{
    view: HerdPlayerView;
    onNextRound: () => void;
}> = (props) => {
    const result = () => props.view.lastRoundResult;

    const majorityGroup = () => {
        const r = result();
        if (!r || !r.majorityGroupId) return null;
        return r.groups.find((g) => g.id === r.majorityGroupId) ?? null;
    };

    return (
        <div>
            <div class="border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] p-4 shadow-[4px_4px_0_#1a1a1a] mb-4">
                <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#b8ae9e] mb-1">
                    QUESTION
                </div>
                <h2 class="font-bebas text-[1.3rem] tracking-[.04em] leading-tight">
                    {props.view.currentQuestion}
                </h2>
            </div>

            <Show
                when={majorityGroup()}
                fallback={
                    <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a] mb-4 text-center">
                        <div class="font-bebas text-[1.4rem] tracking-[.08em] text-[#c0261a]">
                            TIED MAJORITY
                        </div>
                        <p class="text-[.9rem] text-[#5a5040] mt-1">
                            No clear majority &mdash; nobody scores this round!
                        </p>
                    </div>
                }
            >
                {(mg) => (
                    <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a] mb-4 text-center">
                        <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-1">
                            THE HERD ANSWERED
                        </div>
                        <div class="font-bebas text-[2rem] tracking-[.04em] text-[#1a3a6e] leading-tight mb-1">
                            "{mg().canonicalAnswer}"
                        </div>
                        <div class="text-[.85rem] text-[#5a5040]">
                            {result()!.scoringPlayerIds.length} player{result()!.scoringPlayerIds.length !== 1 ? "s" : ""} scored!
                        </div>
                    </div>
                )}
            </Show>

            <Show
                when={
                    props.view.pinkCowEnabled &&
                    result()?.pinkCowPlayerId
                }
            >
                <div class="border-2 border-[#1a1a1a] bg-[#c0261a] text-[#ddd5c4] p-4 shadow-[3px_3px_0_#1a1a1a] mb-4 text-center">
                    <div class="font-bebas text-[1rem] tracking-[.12em]">
                        PINK COW GOES TO{" "}
                        {props.view.players
                            .find((p) => p.id === result()!.pinkCowPlayerId)
                            ?.name?.toUpperCase() ?? "???"}
                    </div>
                </div>
            </Show>

            <div class="space-y-2 mb-4">
                <For each={props.view.answerGroups}>
                    {(group) => {
                        const isMajority = () =>
                            result()?.majorityGroupId === group.id;
                        return (
                            <div
                                class={`border-2 border-[#1a1a1a] p-3 shadow-[2px_2px_0_#1a1a1a] ${
                                    isMajority()
                                        ? "bg-[#1a3a6e] text-[#ddd5c4]"
                                        : "bg-[#c9c0b0]"
                                }`}
                            >
                                <div class="flex items-center justify-between">
                                    <div class="font-bebas text-[1.1rem] tracking-[.04em]">
                                        "{group.canonicalAnswer}"
                                    </div>
                                    <div
                                        class={`font-bebas text-[1.3rem] tracking-[.04em] ${
                                            isMajority()
                                                ? "text-[#ddd5c4]"
                                                : "text-[#1a3a6e]"
                                        }`}
                                    >
                                        {group.count}
                                    </div>
                                </div>
                                <div
                                    class={`text-[.75rem] ${
                                        isMajority()
                                            ? "text-[#b8ae9e]"
                                            : "text-[#5a5040]"
                                    }`}
                                >
                                    <For each={group.playerNames}>
                                        {(name, i) => (
                                            <span>
                                                {name}
                                                <Show
                                                    when={
                                                        i() <
                                                        group.playerNames.length - 1
                                                    }
                                                >
                                                    ,{" "}
                                                </Show>
                                            </span>
                                        )}
                                    </For>
                                </div>
                            </div>
                        );
                    }}
                </For>
            </div>

            <Show when={props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onNextRound}
                    class="w-full font-bebas text-[1.1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    NEXT ROUND
                </button>
            </Show>
        </div>
    );
};

const GameOverPhase: Component<{
    view: HerdPlayerView;
    playerName: (id: string) => string;
    onReturnToLobby: () => void;
}> = (props) => {
    const winnerName = () =>
        props.view.winnerId
            ? props.playerName(props.view.winnerId).toUpperCase()
            : "???";

    return (
        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-8 shadow-[6px_6px_0_#1a1a1a] text-center">
            <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                GAME OVER
            </div>
            <h2 class="font-bebas text-[2.4rem] tracking-[.06em] leading-tight mb-2">
                {winnerName()} WINS!
            </h2>
            <p class="text-[.9rem] text-[#5a5040] mb-6">
                After {props.view.roundNumber} round{props.view.roundNumber !== 1 ? "s" : ""}
            </p>
            <Show when={props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onReturnToLobby}
                    class="font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    RETURN TO LOBBY
                </button>
            </Show>
        </div>
    );
};

const Leaderboard: Component<{
    view: HerdPlayerView;
    playerName: (id: string) => string;
}> = (props) => {
    return (
        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-4 shadow-[4px_4px_0_#1a1a1a] h-fit">
            <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                LEADERBOARD
            </div>
            <div class="space-y-1.5">
                <For each={props.view.leaderboard}>
                    {(player, i) => {
                        const isMe = () => player.id === props.view.myId;
                        const isCowHolder = () =>
                            props.view.pinkCowEnabled && player.hasPinkCow;
                        return (
                            <div
                                class={`flex items-center justify-between px-2 py-1.5 text-[.85rem] ${
                                    isMe()
                                        ? "bg-[#1a3a6e] text-[#ddd5c4] border border-[#1a1a1a]"
                                        : ""
                                }`}
                            >
                                <div class="flex items-center gap-2 min-w-0">
                                    <span
                                        class={`font-bebas text-[.75rem] tracking-[.1em] w-5 shrink-0 ${
                                            isMe() ? "text-[#b8ae9e]" : "text-[#9a9080]"
                                        }`}
                                    >
                                        {i() + 1}.
                                    </span>
                                    <span class="truncate">{player.name}</span>
                                    <Show when={isCowHolder()}>
                                        <span
                                            class="shrink-0 text-[.7rem] font-bebas tracking-[.1em] px-1 border"
                                            style={{
                                                "background-color": isMe()
                                                    ? "#c0261a"
                                                    : "#c0261a",
                                                color: "#ddd5c4",
                                                "border-color": isMe()
                                                    ? "#ddd5c4"
                                                    : "#1a1a1a",
                                            }}
                                        >
                                            COW
                                        </span>
                                    </Show>
                                </div>
                                <span class="font-bebas text-[1rem] tracking-[.08em] ml-2">
                                    {player.score}
                                </span>
                            </div>
                        );
                    }}
                </For>
            </div>
            <Show when={props.view.totalPlayers === 0}>
                <p class="text-[.8rem] text-[#9a9080] text-center py-2">
                    No players yet
                </p>
            </Show>
        </div>
    );
};
