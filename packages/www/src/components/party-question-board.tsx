import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino";
import type { JSX } from "@solidjs/web";

export function PartyQuestionBoard(props: {
    game: string;
    title: string;
    round: number;
    totalRounds?: number;
    phase: string;
    status: string;
    question: string | null;
    children: JSX.Element;
    sidebar: JSX.Element;
    compact?: boolean;
}) {
    return (
        <section
            data-testid={`${props.game}-table-display`}
            class="mx-auto max-w-[1800px] p-5 lg:p-8 font-karla text-ink"
        >
            <header class="flex flex-wrap items-center justify-between gap-4 mb-6 font-bebas tracking-wider">
                <h1 class="border-2 border-ink bg-teal text-cream px-4 pt-2 pb-1 text-4xl shadow-ink -rotate-2">
                    {props.title}
                </h1>
                <div class="flex flex-wrap items-center gap-3 text-2xl">
                    <Show when={props.round > 0}>
                        <span>
                            Round {props.round}
                            <Show when={props.totalRounds}>
                                {" "}
                                / {props.totalRounds}
                            </Show>
                        </span>
                    </Show>
                    <span class="border-2 border-ink bg-navy text-cream px-4 py-1 shadow-ink-sm">
                        {props.phase}
                    </span>
                </div>
            </header>
            <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_380px]">
                <div class="min-w-0 space-y-6">
                    <div
                        class={`border-[3px] border-ink bg-cream shadow-ink-lg ${props.compact ? "p-4 lg:p-5" : "p-6 lg:p-8"}`}
                    >
                        <p class="font-bebas text-xl tracking-[.16em] text-tomato mb-3">
                            {props.question
                                ? "The question"
                                : "Bring everyone together"}
                        </p>
                        <h2
                            class={`font-bebas leading-[1.05] break-words ${props.compact ? "text-[clamp(2rem,3vw,3.5rem)]" : "text-[clamp(2.5rem,4.3vw,5rem)]"}`}
                        >
                            {props.question ?? "Ready for the next question?"}
                        </h2>
                        <p
                            role="status"
                            class={
                                props.compact
                                    ? "mt-3 text-lg text-navy"
                                    : "mt-5 text-xl lg:text-2xl text-navy"
                            }
                        >
                            {props.status}
                        </p>
                    </div>
                    {props.children}
                </div>
                <aside class="min-w-0 space-y-5">{props.sidebar}</aside>
            </div>
        </section>
    );
}

export function PartyAnswerProgress(props: {
    players: ReadonlyArray<{ id: string; name: string; hasAnswered: boolean }>;
    answeredCount: number;
}) {
    return (
        <div
            style={{ "--mat": "var(--color-kraft)" }}
            class="table-mat border-[3px] border-ink p-6 shadow-ink"
        >
            <div class="flex flex-wrap justify-between items-baseline gap-3 mb-4">
                <h3 class="font-bebas text-3xl tracking-wider">
                    Answers coming in
                </h3>
                <p
                    class="font-bebas text-4xl text-navy"
                    data-testid="display-answer-count"
                >
                    {props.answeredCount} / {props.players.length}
                </p>
            </div>
            <div
                role="progressbar"
                aria-label="Answers submitted"
                aria-valuemin={0}
                aria-valuemax={props.players.length}
                aria-valuenow={props.answeredCount}
                class="h-5 border-2 border-ink bg-cream mb-6"
            >
                <div
                    class="h-full bg-teal transition-[width] duration-300 motion-reduce:transition-none"
                    style={{
                        width: `${props.players.length ? (props.answeredCount / props.players.length) * 100 : 0}%`,
                    }}
                />
            </div>
            <div class="flex flex-wrap gap-3">
                <For each={props.players} keyed={false}>
                    {(player, index) => (
                        <div
                            class={`border-2 border-ink px-4 py-2 shadow-ink-sm ${player().hasAnswered ? "bg-teal text-cream" : "bg-cream text-muted"}`}
                        >
                            <PlayerAvatar
                                id={player().id}
                                name={player().name}
                                index={index}
                                class="inline-flex w-8 h-8 text-base mr-3 align-middle"
                            />
                            <span class="text-xl font-bold break-words">
                                {player().name}
                            </span>
                            <span class="ml-3 font-bebas tracking-wider">
                                {player().hasAnswered ? "Ready" : "Thinking"}
                            </span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}
