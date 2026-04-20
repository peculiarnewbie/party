import {
    createSignal,
    For,
    Show,
    Switch,
    Match,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type {
    FunFactsPlayerView,
    PlacedArrowView,
} from "~/game/fun-facts/views";
import type { FunFactsConnection } from "~/game/fun-facts/connection";

interface FunFactsRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: FunFactsConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const ARROW_COLORS = [
    "#e74c3c",
    "#3498db",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#e67e22",
    "#e84393",
    "#00b894",
    "#6c5ce7",
    "#fd79a8",
    "#00cec9",
];

function getArrowColor(index: number): string {
    return ARROW_COLORS[index % ARROW_COLORS.length];
}

export const FunFactsRoom: Component<FunFactsRoomProps> = (props) => {
    const view = () => props.connection.view();
    const [answerInput, setAnswerInput] = createSignal("");
    const [customQuestionInput, setCustomQuestionInput] = createSignal("");
    const [submitted, setSubmitted] = createSignal(false);

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "fun_facts:action") {
                const action = event.data as { type?: string };
                if (
                    action.type === "question_started" ||
                    action.type === "round_advanced"
                ) {
                    setAnswerInput("");
                    setSubmitted(false);
                }
            }
        }),
    );

    const handleSubmitAnswer = () => {
        const val = parseFloat(answerInput().trim());
        if (isNaN(val)) return;
        props.connection.send({
            type: "fun_facts:submit_answer",
            data: { answer: val },
        });
        setSubmitted(true);
    };

    const handleNextQuestion = () => {
        const custom = customQuestionInput().trim();
        props.connection.send({
            type: "fun_facts:next_question",
            data: custom ? { customQuestion: custom } : {},
        });
        setCustomQuestionInput("");
    };

    const handlePlaceArrow = (position: number) => {
        props.connection.send({
            type: "fun_facts:place_arrow",
            data: { position },
        });
    };

    const handleCloseAnswers = () => {
        props.connection.send({
            type: "fun_facts:close_answers",
            data: {},
        });
    };

    const handleNextRound = () => {
        props.connection.send({
            type: "fun_facts:next_round",
            data: {},
        });
    };

    const playerColorMap = () => {
        const v = view();
        if (!v) return new Map<string, string>();
        const map = new Map<string, string>();
        v.players.forEach((p, i) => map.set(p.id, getArrowColor(i)));
        return map;
    };

    return (
        <div class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla">
            <Show when={view()} keyed>
                {(v) => (
                    <div class="max-w-3xl mx-auto px-4 py-6">
                        <div class="flex items-center justify-between mb-6">
                            <div>
                                <h1 class="font-bebas text-[2rem] tracking-[.08em] leading-none">
                                    FUN FACTS
                                </h1>
                                <div class="font-bebas text-[.75rem] tracking-[.2em] text-[#9a9080]">
                                    ROOM {props.roomId.toUpperCase()}
                                    <Show when={v.roundNumber > 0}>
                                        {" "}&middot; ROUND {v.roundNumber} / {v.totalRounds}
                                    </Show>
                                </div>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="text-right">
                                    <div class="font-bebas text-[.65rem] tracking-[.2em] text-[#9a9080]">
                                        TEAM SCORE
                                    </div>
                                    <div class="font-bebas text-[1.6rem] leading-none tracking-[.04em] text-[#1a3a6e]">
                                        {v.teamScore}
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
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-6">
                            <div>
                                <Switch>
                                    <Match when={v.phase === "waiting"}>
                                        <WaitingPhase
                                            view={v}
                                            customQuestion={customQuestionInput()}
                                            setCustomQuestion={setCustomQuestionInput}
                                            onNextQuestion={handleNextQuestion}
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
                                    <Match when={v.phase === "placing"}>
                                        <PlacingPhase
                                            view={v}
                                            colorMap={playerColorMap()}
                                            onPlace={handlePlaceArrow}
                                        />
                                    </Match>
                                    <Match when={v.phase === "reveal"}>
                                        <RevealPhase
                                            view={v}
                                            colorMap={playerColorMap()}
                                            onNextRound={handleNextRound}
                                        />
                                    </Match>
                                    <Match when={v.phase === "game_over"}>
                                        <GameOverPhase
                                            view={v}
                                            colorMap={playerColorMap()}
                                            onReturnToLobby={props.onReturnToLobby}
                                        />
                                    </Match>
                                </Switch>
                            </div>

                            <ScoreSidebar view={v} colorMap={playerColorMap()} />
                        </div>
                    </div>
                )}
            </Show>
        </div>
    );
};

const WaitingPhase: Component<{
    view: FunFactsPlayerView;
    customQuestion: string;
    setCustomQuestion: (v: string) => void;
    onNextQuestion: () => void;
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
                        onInput={(e) =>
                            props.setCustomQuestion(e.currentTarget.value)
                        }
                        placeholder="Leave blank to use question bank..."
                        class="w-full border-2 border-[#1a1a1a] bg-[#ddd5c4] px-3 py-2 text-[.9rem] font-karla focus:outline-none focus:ring-2 focus:ring-[#1a3a6e]"
                    />
                </div>

                <button
                    type="button"
                    onClick={props.onNextQuestion}
                    class="w-full font-bebas text-[1.1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] mb-4"
                >
                    {props.view.roundNumber === 0
                        ? "START FIRST QUESTION"
                        : "NEXT QUESTION"}
                </button>

                <div class="flex items-center justify-end border-t border-[#9a9080] pt-4">
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
    view: FunFactsPlayerView;
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

            <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-6 shadow-[4px_4px_0_#1a1a1a]">
                <Show
                    when={!props.submitted}
                    fallback={
                        <div class="text-center">
                            <div class="font-bebas text-[1.2rem] tracking-[.1em] text-[#1a3a6e] mb-2">
                                ANSWER SUBMITTED
                            </div>
                            <p class="text-[.9rem] text-[#5a5040] mb-2">
                                Your answer: {props.view.myAnswer}
                            </p>
                            <p class="text-[.8rem] text-[#9a9080] mb-4">
                                {props.view.answeredCount} / {props.view.totalPlayers} players answered
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
                        YOUR ANSWER (A NUMBER)
                    </div>
                    <div class="flex gap-2">
                        <input
                            type="number"
                            value={props.answerInput}
                            onInput={(e) =>
                                props.setAnswerInput(e.currentTarget.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key === "Enter") props.onSubmit();
                            }}
                            placeholder="Enter a number..."
                            step="any"
                            class="flex-1 border-2 border-[#1a1a1a] bg-[#ddd5c4] px-3 py-2 text-[.95rem] font-karla focus:outline-none focus:ring-2 focus:ring-[#1a3a6e]"
                        />
                        <button
                            type="button"
                            onClick={props.onSubmit}
                            disabled={
                                props.answerInput.trim().length === 0 ||
                                isNaN(parseFloat(props.answerInput.trim()))
                            }
                            class="font-bebas text-[.95rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-4 py-2 shadow-[2px_2px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a] disabled:opacity-40 disabled:pointer-events-none"
                        >
                            SUBMIT
                        </button>
                    </div>
                </Show>
            </div>

            <Show when={props.view.isHost}>
                <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-4 shadow-[4px_4px_0_#1a1a1a] mt-4">
                    <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                        HOST: ANSWERS
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
                        disabled={props.view.answeredCount < 2}
                        class="w-full font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] disabled:opacity-40 disabled:pointer-events-none"
                    >
                        CLOSE ANSWERS &amp; START PLACING
                    </button>
                </div>
            </Show>
        </div>
    );
};

const PlacingPhase: Component<{
    view: FunFactsPlayerView;
    colorMap: Map<string, string>;
    onPlace: (position: number) => void;
}> = (props) => {
    const currentPlacerName = () => {
        const id = props.view.currentPlacerId;
        if (!id) return "???";
        return (
            props.view.players.find((p) => p.id === id)?.name ?? "Unknown"
        );
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

            <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-5 shadow-[4px_4px_0_#1a1a1a] mb-4">
                <Show
                    when={props.view.isMyTurn}
                    fallback={
                        <div class="text-center py-4">
                            <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-2">
                                PLACING PHASE
                            </div>
                            <h2 class="font-bebas text-[1.4rem] tracking-[.06em] mb-1">
                                {currentPlacerName().toUpperCase()}'S TURN
                            </h2>
                            <p class="text-[.85rem] text-[#5a5040]">
                                Waiting for them to place their arrow...
                            </p>
                        </div>
                    }
                >
                    <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-2">
                        YOUR TURN TO PLACE
                    </div>
                    <p class="text-[.85rem] text-[#5a5040] mb-1">
                        Your answer: <span class="font-bold text-[#1a1a1a]">{props.view.myAnswer}</span>
                    </p>
                    <p class="text-[.8rem] text-[#9a9080] mb-4">
                        Place your arrow where you think your number falls (lowest at top, highest at bottom).
                    </p>
                </Show>

                <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#9a9080] mb-2 flex justify-between">
                    <span>LOWEST</span>
                    <span>
                        {props.view.placedArrows.length} / {props.view.placingOrder.length} PLACED
                    </span>
                </div>

                <div class="space-y-0">
                    <Show when={props.view.isMyTurn}>
                        <InsertionSlot
                            position={0}
                            onPlace={props.onPlace}
                        />
                    </Show>

                    <For each={props.view.placedArrows}>
                        {(arrow, i) => (
                            <>
                                <ArrowCard
                                    arrow={arrow}
                                    color={
                                        props.colorMap.get(arrow.playerId) ??
                                        "#999"
                                    }
                                    isMe={arrow.playerId === props.view.myId}
                                    showAnswer={false}
                                    isCorrect={null}
                                />
                                <Show when={props.view.isMyTurn}>
                                    <InsertionSlot
                                        position={i() + 1}
                                        onPlace={props.onPlace}
                                    />
                                </Show>
                            </>
                        )}
                    </For>
                </div>

                <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#9a9080] mt-2">
                    HIGHEST
                </div>
            </div>

            <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-4 shadow-[3px_3px_0_#1a1a1a]">
                <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#9a9080] mb-2">
                    PLACING ORDER
                </div>
                <div class="flex flex-wrap gap-1.5">
                    <For each={props.view.placingOrder}>
                        {(player, i) => {
                            const isPlaced = () =>
                                i() < props.view.placedArrows.length ||
                                (props.view.currentPlacerId !== null &&
                                    i() <
                                        props.view.placingOrder.findIndex(
                                            (p) =>
                                                p.id ===
                                                props.view.currentPlacerId,
                                        ));
                            const isCurrent = () =>
                                player.id === props.view.currentPlacerId;
                            return (
                                <span
                                    class={`font-bebas text-[.75rem] tracking-[.1em] px-2 py-0.5 border ${
                                        isCurrent()
                                            ? "border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4]"
                                            : isPlaced()
                                              ? "border-[#9a9080] bg-[#ddd5c4] text-[#9a9080]"
                                              : "border-[#1a1a1a] bg-[#ddd5c4] text-[#1a1a1a]"
                                    }`}
                                >
                                    {player.name}
                                </span>
                            );
                        }}
                    </For>
                </div>
            </div>
        </div>
    );
};

const InsertionSlot: Component<{
    position: number;
    onPlace: (position: number) => void;
}> = (props) => {
    return (
        <button
            type="button"
            onClick={() => props.onPlace(props.position)}
            class="w-full py-2 my-1 border-2 border-dashed border-[#9a9080] bg-[#ddd5c4] text-[#9a9080] font-bebas text-[.7rem] tracking-[.2em] transition-all duration-100 hover:border-[#1a3a6e] hover:bg-[#e8dccf] hover:text-[#1a3a6e] hover:py-3"
        >
            PLACE HERE
        </button>
    );
};

const ArrowCard: Component<{
    arrow: PlacedArrowView;
    color: string;
    isMe: boolean;
    showAnswer: boolean;
    isCorrect: boolean | null;
}> = (props) => {
    return (
        <div
            class={`flex items-center gap-3 px-4 py-2.5 border-2 transition-all duration-200 ${
                props.isCorrect === false
                    ? "border-[#c0261a] opacity-50 line-through"
                    : props.isCorrect === true
                      ? "border-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a]"
                      : "border-[#1a1a1a]"
            }`}
            style={{
                "background-color": props.color + "22",
                "border-left": `6px solid ${props.color}`,
            }}
        >
            <div
                class="w-3 h-3 shrink-0 rounded-full"
                style={{ "background-color": props.color }}
            />
            <div class="flex-1 font-bebas text-[1rem] tracking-[.08em]">
                {props.arrow.playerName}
                <Show when={props.isMe}>
                    <span class="text-[.7rem] tracking-[.16em] text-[#9a9080] ml-2">
                        (YOU)
                    </span>
                </Show>
            </div>
            <Show when={props.showAnswer && props.arrow.answer !== null}>
                <div class="font-bebas text-[1.4rem] tracking-[.04em] text-[#1a3a6e]">
                    {props.arrow.answer}
                </div>
            </Show>
            <Show when={props.isCorrect === true}>
                <div class="font-bebas text-[.7rem] tracking-[.16em] text-[#2ecc71]">
                    +1
                </div>
            </Show>
            <Show when={props.isCorrect === false}>
                <div class="font-bebas text-[.7rem] tracking-[.16em] text-[#c0261a]">
                    OUT
                </div>
            </Show>
        </div>
    );
};

const RevealPhase: Component<{
    view: FunFactsPlayerView;
    colorMap: Map<string, string>;
    onNextRound: () => void;
}> = (props) => {
    const result = () => props.view.lastRoundResult;
    const isLastRound = () =>
        props.view.roundNumber >= props.view.totalRounds;

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

            <Show when={result()} keyed>
                {(r) => (
                    <>
                        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-5 shadow-[4px_4px_0_#1a1a1a] mb-4 text-center">
                            <div class="font-bebas text-[.7rem] tracking-[.24em] text-[#9a9080] mb-1">
                                ROUND SCORE
                            </div>
                            <div class="font-bebas text-[3rem] leading-none tracking-[.04em] text-[#1a3a6e]">
                                {r.pointsEarned}
                            </div>
                            <div class="font-bebas text-[1rem] tracking-[.08em] text-[#5a5040]">
                                / {r.placedOrder.length} ARROWS CORRECT
                            </div>
                        </div>

                        <div class="mb-4">
                            <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#9a9080] mb-2">
                                LOWEST
                            </div>
                            <div class="space-y-1">
                                <For each={r.placedOrder}>
                                    {(playerId) => {
                                        const playerName = () =>
                                            props.view.players.find(
                                                (p) => p.id === playerId,
                                            )?.name ?? "Unknown";
                                        const answer = () =>
                                            r.answers[playerId] ?? 0;
                                        const isCorrect = () =>
                                            r.correctArrows.includes(playerId);
                                        const color = () =>
                                            props.colorMap.get(playerId) ??
                                            "#999";
                                        return (
                                            <ArrowCard
                                                arrow={{
                                                    playerId,
                                                    playerName: playerName(),
                                                    answer: answer(),
                                                }}
                                                color={color()}
                                                isMe={
                                                    playerId ===
                                                    props.view.myId
                                                }
                                                showAnswer={true}
                                                isCorrect={isCorrect()}
                                            />
                                        );
                                    }}
                                </For>
                            </div>
                            <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#9a9080] mt-2">
                                HIGHEST
                            </div>
                        </div>
                    </>
                )}
            </Show>

            <Show when={props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onNextRound}
                    class="w-full font-bebas text-[1.1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    {isLastRound() ? "SEE FINAL SCORES" : "NEXT ROUND"}
                </button>
            </Show>
        </div>
    );
};

const GameOverPhase: Component<{
    view: FunFactsPlayerView;
    colorMap: Map<string, string>;
    onReturnToLobby: () => void;
}> = (props) => {
    const percentage = () =>
        props.view.maxScore > 0
            ? Math.round((props.view.teamScore / props.view.maxScore) * 100)
            : 0;

    const rating = () => {
        const pct = percentage();
        if (pct >= 90) return "LEGENDARY";
        if (pct >= 75) return "AMAZING";
        if (pct >= 60) return "GREAT";
        if (pct >= 40) return "NOT BAD";
        if (pct >= 20) return "COULD BE BETTER";
        return "BETTER LUCK NEXT TIME";
    };

    return (
        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-8 shadow-[6px_6px_0_#1a1a1a] text-center">
            <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                GAME OVER
            </div>
            <h2 class="font-bebas text-[2.4rem] tracking-[.06em] leading-tight mb-1">
                {rating()}
            </h2>
            <div class="font-bebas text-[3.5rem] leading-none tracking-[.04em] text-[#1a3a6e] my-3">
                {props.view.teamScore} / {props.view.maxScore}
            </div>
            <p class="text-[.9rem] text-[#5a5040] mb-2">
                {percentage()}% accuracy over {props.view.totalRounds} rounds
            </p>

            <Show when={props.view.roundScores.length > 0}>
                <div class="flex justify-center gap-2 my-4">
                    <For each={props.view.roundScores}>
                        {(score, i) => (
                            <div class="text-center">
                                <div class="font-bebas text-[.6rem] tracking-[.16em] text-[#9a9080]">
                                    R{i() + 1}
                                </div>
                                <div class="font-bebas text-[1.2rem] text-[#1a3a6e]">
                                    {score}
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </Show>

            <Show when={props.view.isHost}>
                <button
                    type="button"
                    onClick={props.onReturnToLobby}
                    class="font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a] mt-4"
                >
                    RETURN TO LOBBY
                </button>
            </Show>
        </div>
    );
};

const ScoreSidebar: Component<{
    view: FunFactsPlayerView;
    colorMap: Map<string, string>;
}> = (props) => {
    return (
        <div class="space-y-4">
            <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-4 shadow-[4px_4px_0_#1a1a1a] h-fit">
                <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                    TEAM PROGRESS
                </div>
                <div class="text-center mb-3">
                    <div class="font-bebas text-[2.5rem] leading-none tracking-[.04em] text-[#1a3a6e]">
                        {props.view.teamScore}
                    </div>
                    <div class="font-bebas text-[.8rem] tracking-[.1em] text-[#5a5040]">
                        / {props.view.maxScore} POSSIBLE
                    </div>
                </div>
                <div class="w-full bg-[#ddd5c4] border-2 border-[#1a1a1a] h-3 mb-3">
                    <div
                        class="h-full bg-[#1a3a6e] transition-all duration-500"
                        style={{
                            width: `${props.view.maxScore > 0 ? (props.view.teamScore / props.view.maxScore) * 100 : 0}%`,
                        }}
                    />
                </div>
                <Show when={props.view.roundScores.length > 0}>
                    <div class="space-y-1">
                        <For each={props.view.roundScores}>
                            {(score, i) => (
                                <div class="flex justify-between text-[.8rem]">
                                    <span class="font-bebas text-[.7rem] tracking-[.12em] text-[#9a9080]">
                                        ROUND {i() + 1}
                                    </span>
                                    <span class="font-bebas text-[.85rem] text-[#1a3a6e]">
                                        {score} / {props.view.players.length}
                                    </span>
                                </div>
                            )}
                        </For>
                    </div>
                </Show>
            </div>

            <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-4 shadow-[4px_4px_0_#1a1a1a] h-fit">
                <div class="font-bebas text-[.75rem] tracking-[.24em] text-[#c0261a] mb-3">
                    PLAYERS
                </div>
                <div class="space-y-1.5">
                    <For each={props.view.players}>
                        {(player) => {
                            const isMe = () => player.id === props.view.myId;
                            const color = () =>
                                props.colorMap.get(player.id) ?? "#999";
                            return (
                                <div
                                    class={`flex items-center gap-2 px-2 py-1.5 text-[.85rem] ${
                                        isMe()
                                            ? "bg-[#1a3a6e] text-[#ddd5c4] border border-[#1a1a1a]"
                                            : ""
                                    }`}
                                >
                                    <div
                                        class="w-2.5 h-2.5 rounded-full shrink-0"
                                        style={{
                                            "background-color": color(),
                                        }}
                                    />
                                    <span class="truncate">{player.name}</span>
                                </div>
                            );
                        }}
                    </For>
                </div>
                <Show when={props.view.players.length === 0}>
                    <p class="text-[.8rem] text-[#9a9080] text-center py-2">
                        No players yet
                    </p>
                </Show>
            </div>
        </div>
    );
};
