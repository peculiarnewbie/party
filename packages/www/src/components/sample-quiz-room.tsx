import { Component, createSignal, onMount, For, Show } from "solid-js";
import { Player } from "~/game";

type PlayerAnswer = {
    player: Player;
    answer: string;
};

const ANSWER_CONFIG = {
    a: { bg: "#c0261a", shadow: "rgba(120,15,8,.55)", label: "A" },
    b: { bg: "#1a3a6e", shadow: "rgba(10,25,55,.55)", label: "B" },
    c: { bg: "#1a1a1a", shadow: "rgba(0,0,0,.45)", label: "C" },
} as const;

type AnswerKey = keyof typeof ANSWER_CONFIG;

const AnswerButton: Component<{
    answer: AnswerKey;
    playerAnswer: string | null;
    onSubmit: (answer: string) => void;
}> = (props) => {
    const cfg = () => ANSWER_CONFIG[props.answer];
    const isSelected = () => props.playerAnswer === props.answer;
    const isAnswered = () => props.playerAnswer !== null;
    const isDimmed = () => isAnswered() && !isSelected();

    return (
        <button
            onClick={() => props.onSubmit(props.answer)}
            disabled={isAnswered()}
            style={{
                background: isDimmed() ? "#c9c0b0" : cfg().bg,
                color: isDimmed() ? "#9a9080" : "#ddd5c4",
                "box-shadow": isAnswered() ? "none" : `4px 4px 0 ${cfg().shadow}`,
                opacity: isDimmed() ? "0.45" : "1",
            }}
            class="w-full flex items-center gap-4 text-left border-2 border-[#1a1a1a] px-5 py-[1.1rem] cursor-pointer transition-all duration-[120ms] disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5"
        >
            <span
                class="w-10 h-10 flex-shrink-0 flex items-center justify-center font-bebas text-[1.4rem]"
                style={{ background: "rgba(255,255,255,.13)" }}
            >
                {cfg().label}
            </span>
            <span class="font-bebas text-[1.2rem] tracking-[.06em]">
                Answer {cfg().label}
            </span>
            <Show when={isSelected()}>
                <span class="ml-auto font-bebas text-[.75rem] tracking-[.18em] opacity-80">
                    LOCKED
                </span>
            </Show>
        </button>
    );
};

export const SampleQuizRoom: Component<{
    roomId: string;
    playerId: string | null;
    isHost: boolean;
}> = (props) => {
    const [playerAnswer, setPlayerAnswer] = createSignal<string | null>(null);
    const [playerAnswers, setPlayerAnswers] = createSignal<PlayerAnswer[]>([]);
    let ws: WebSocket;

    onMount(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${props.roomId}`;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);
            if (json.type === "player_answered") {
                const players = json.data.players as Player[];
                const answers = json.data.answers as Record<string, string>;
                setPlayerAnswers(
                    players
                        .filter((p: Player) => answers[p.id])
                        .map((p: Player) => ({
                            player: p,
                            answer: answers[p.id],
                        })),
                );
            }
        };
    });

    const submitAnswer = (answer: string) => {
        setPlayerAnswer(answer);
        ws.send(
            JSON.stringify({
                playerId: props.playerId,
                playerName: "",
                type: "answer",
                data: { answer },
            }),
        );
    };

    return (
        <div class="min-h-screen grid grid-cols-[2fr_1fr] bg-[#ddd5c4] font-karla overflow-hidden max-sm:grid-cols-1">
            {/* ── Left: question + answers ── */}
            <div class="pt-12 pr-10 pb-20 pl-12 flex flex-col justify-center min-h-screen relative z-[1] max-sm:px-6 max-sm:py-10">
                <div class="inline-block self-start font-bebas text-[.95rem] tracking-[.18em] bg-[#1a3a6e] text-[#ddd5c4] px-4 py-1 mb-6">
                    Round 1
                </div>

                <h1 class="font-bebas text-[clamp(2rem,4vw,3.5rem)] text-[#1a1a1a] leading-[1.05] tracking-[.02em] m-0 mb-6">
                    This is a sample question
                </h1>

                <div class="h-[3px] bg-[#1a1a1a] mb-8" />

                <div class="flex flex-col gap-3 max-w-lg">
                    <AnswerButton
                        answer="a"
                        playerAnswer={playerAnswer()}
                        onSubmit={submitAnswer}
                    />
                    <AnswerButton
                        answer="b"
                        playerAnswer={playerAnswer()}
                        onSubmit={submitAnswer}
                    />
                    <AnswerButton
                        answer="c"
                        playerAnswer={playerAnswer()}
                        onSubmit={submitAnswer}
                    />
                </div>

                <Show when={playerAnswer()}>
                    <div class="mt-8 flex items-center gap-3">
                        <div class="h-[2px] w-8 bg-[#b8ae9e]" />
                        <span class="font-bebas text-[.75rem] tracking-[.2em] text-[#9a9080]">
                            WAITING FOR RESULTS
                        </span>
                    </div>
                </Show>
            </div>

            {/* ── Right: navy slab ── */}
            <div
                class="bg-[#1a3a6e] relative overflow-hidden max-sm:hidden"
                style={{ "clip-path": "polygon(22% 0, 100% 0, 100% 100%, 0% 100%)" }}
            >
                {/* Concentric rings */}
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "320px", height: "320px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "200px", height: "200px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />

                {/* Guest: show chosen answer big, or prompt */}
                <Show
                    when={!props.isHost}
                >
                    <Show
                        when={playerAnswer()}
                        fallback={
                            <div
                                class="absolute top-[38%] left-1/2 text-center"
                                style={{ transform: "translateX(-50%)", animation: "bob1 4s ease-in-out infinite" }}
                            >
                                <div class="font-bebas text-[.65rem] tracking-[.22em] text-[#ddd5c4] opacity-45 leading-relaxed">
                                    CHOOSE YOUR
                                    <br />
                                    ANSWER
                                </div>
                            </div>
                        }
                    >
                        <div
                            class="absolute top-[32%] left-1/2 text-center"
                            style={{ transform: "translateX(-50%)", animation: "bob2 4s ease-in-out infinite" }}
                        >
                            <div class="font-bebas text-[.6rem] tracking-[.25em] text-[#ddd5c4] opacity-45 mb-2">
                                YOUR ANSWER
                            </div>
                            <div class="font-bebas text-[6rem] leading-none text-[#c0261a]">
                                {playerAnswer()?.toUpperCase()}
                            </div>
                        </div>
                    </Show>
                </Show>

                {/* Host: see all player answers */}
                <Show when={props.isHost}>
                    <div class="absolute inset-0 flex flex-col justify-center pl-16 pr-8 overflow-y-auto">
                        <div class="font-bebas text-[.6rem] tracking-[.28em] text-[#ddd5c4] opacity-45 mb-4">
                            PLAYER ANSWERS
                        </div>
                        <For each={playerAnswers()}>
                            {(pa) => (
                                <div class="flex items-center gap-3 mb-3">
                                    <span class="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-[#ddd5c4] text-[#1a3a6e] font-bebas text-[.9rem]">
                                        {pa.player.name.charAt(0).toUpperCase()}
                                    </span>
                                    <span class="font-bebas text-[.9rem] tracking-[.04em] text-[#ddd5c4] flex-1 truncate">
                                        {pa.player.name}
                                    </span>
                                    <span class="font-bebas text-[1.2rem] tracking-[.05em] text-[#c0261a]">
                                        {pa.answer.toUpperCase()}
                                    </span>
                                </div>
                            )}
                        </For>
                        <Show when={playerAnswers().length === 0}>
                            <div
                                class="font-bebas text-[.8rem] tracking-[.12em] text-[#ddd5c4] opacity-30"
                                style={{ animation: "bob1 4s ease-in-out infinite" }}
                            >
                                WAITING FOR ANSWERS...
                            </div>
                        </Show>
                    </div>
                </Show>

                {/* Token accents (guest view only) */}
                <Show when={!props.isHost}>
                    <div
                        style={{ position: "absolute", bottom: "18%", left: "24%", opacity: ".28", animation: "bob3 5s ease-in-out .5s infinite" }}
                    >
                        <svg width="38" height="38" viewBox="0 0 36 36" fill="none">
                            <circle cx="18" cy="18" r="16" fill="#ddd5c4" />
                            <circle cx="18" cy="18" r="11" fill="none" stroke="white" stroke-width="1.5" stroke-opacity=".3" />
                            <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
                        </svg>
                    </div>
                    <div
                        style={{ position: "absolute", top: "70%", right: "10%", opacity: ".2", animation: "bob1 6s ease-in-out 2s infinite" }}
                    >
                        <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
                            <circle cx="18" cy="18" r="16" fill="#c0261a" />
                            <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
                        </svg>
                    </div>
                </Show>
            </div>
        </div>
    );
};
