import { For, Show } from "solid-js";
import { AnimatedNumber, Confetti } from "~/components/casino";
import {
    PartyAnswerProgress,
    PartyQuestionBoard,
} from "~/components/party-question-board";
import type { HerdTableView } from "~/game/herd/table-view";

export function HerdTableDisplay(props: { view: HerdTableView }) {
    const scored = () =>
        props.view.phase === "scored" || props.view.phase === "game_over";
    const result = () => props.view.roundResult;
    const name = (id: string | null) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const status = () => {
        if (props.view.phase === "game_over")
            return props.view.winnerId
                ? `${name(props.view.winnerId)} wins!`
                : "That's a wrap!";
        if (props.view.phase === "waiting")
            return "Think like the herd. The most popular answer scores a point.";
        if (props.view.phase === "answering")
            return props.view.answeredCount === props.view.players.length
                ? "Everyone is ready. Time for the host to reveal!"
                : "What will everyone else say? Answer on your phone.";
        if (props.view.phase === "reveal")
            return "Compare your answers. The host can merge matching ideas before scoring.";
        return result()?.majorityGroupId
            ? "The herd has spoken! Matching the majority earns a point."
            : "A tie at the top. No majority, no points this round.";
    };
    const phase = () =>
        ({
            waiting: "Get ready",
            answering: "Answer on your phone",
            reveal: "The reveal",
            scored: "Round results",
            game_over: "Final scores",
        })[props.view.phase];

    return (
        <PartyQuestionBoard
            game="herd"
            title="Herd Mentality"
            round={props.view.roundNumber}
            phase={phase()}
            status={status()}
            question={
                props.view.phase === "waiting"
                    ? null
                    : props.view.currentQuestion
            }
            sidebar={
                <>
                    <div class="border-[3px] border-ink bg-cream p-5 shadow-ink">
                        <h3 class="font-bebas text-3xl tracking-wider mb-1">
                            {props.view.phase === "game_over"
                                ? "Final standings"
                                : "The leaderboard"}
                        </h3>
                        <p class="text-lg text-muted mb-5">
                            First to {props.view.winScore} points wins.
                        </p>
                        <ol class="space-y-3">
                            <For
                                each={props.view.leaderboard.slice(0, 10)}
                                keyed={false}
                            >
                                {(player, index) => (
                                    <li
                                        class={`flex items-center gap-3 border-2 border-ink p-3 ${player().hasPinkCow ? "bg-[#f0c6d6]" : "bg-paper"}`}
                                    >
                                        <span class="font-bebas text-2xl text-muted">
                                            {index + 1}
                                        </span>
                                        <div class="min-w-0 flex-1">
                                            <span class="block text-xl font-bold break-words">
                                                {player().name}
                                            </span>
                                            <Show when={player().hasPinkCow}>
                                                <span class="font-bebas text-lg text-plum">
                                                    Pink Cow
                                                </span>
                                            </Show>
                                            <Show
                                                when={
                                                    scored() &&
                                                    result()?.scoringPlayerIds.includes(
                                                        player().id,
                                                    )
                                                }
                                            >
                                                <span class="font-bebas text-lg text-teal">
                                                    +1 this round
                                                </span>
                                            </Show>
                                        </div>
                                        <AnimatedNumber
                                            value={player().score}
                                            class="font-bebas text-4xl text-navy"
                                        />
                                    </li>
                                )}
                            </For>
                        </ol>
                        <Show when={props.view.leaderboard.length > 10}>
                            <p class="mt-4 text-muted">
                                + {props.view.leaderboard.length - 10} more
                                players
                            </p>
                        </Show>
                    </div>
                    <Show when={props.view.pinkCowEnabled}>
                        <div class="border-[3px] border-ink bg-[#f0c6d6] p-5 shadow-ink">
                            <h3 class="font-bebas text-3xl">The Pink Cow</h3>
                            <p class="text-xl mt-2">
                                {props.view.pinkCowHolderId
                                    ? `${name(props.view.pinkCowHolderId)} has the cow.`
                                    : "Don't stand alone! A unique answer can land you the cow."}
                            </p>
                            <p class="text-lg text-muted mt-3">
                                You can score with the cow, but you can't win
                                until it moves on.
                            </p>
                        </div>
                    </Show>
                    <p class="text-lg text-muted">
                        The host controls the game from their phone.
                    </p>
                </>
            }
        >
            <Show when={props.view.phase === "answering"}>
                <PartyAnswerProgress
                    players={props.view.players}
                    answeredCount={props.view.answeredCount}
                />
            </Show>
            <Show when={props.view.phase === "waiting"}>
                <div
                    style={{ "--mat": "var(--color-kraft)" }}
                    class="table-mat border-[3px] border-ink p-8 shadow-ink"
                >
                    <p class="font-bebas text-4xl mb-3">
                        Same wavelength. Same answer.
                    </p>
                    <p class="text-2xl text-muted">
                        Keep your answer secret until the reveal. The host is
                        choosing the next question.
                    </p>
                </div>
            </Show>
            <Show when={props.view.phase === "reveal" || scored()}>
                <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-5">
                    <For each={props.view.answerGroups} keyed={false}>
                        {(group) => (
                            <div
                                data-testid="herd-display-answer-group"
                                class={`border-[3px] border-ink p-5 shadow-ink animate-rise-in motion-reduce:animate-none ${scored() && result()?.majorityGroupId === group().id ? "bg-teal text-cream" : "bg-cream"}`}
                            >
                                <div class="flex justify-between items-start gap-4 mb-3">
                                    <h3 class="font-bebas text-4xl break-words min-w-0">
                                        {group().canonicalAnswer}
                                    </h3>
                                    <span class="font-bebas text-4xl shrink-0">
                                        ×{group().count}
                                    </span>
                                </div>
                                <p class="text-xl break-words">
                                    {group().playerNames.join(", ")}
                                </p>
                                <Show
                                    when={
                                        scored() &&
                                        result()?.majorityGroupId === group().id
                                    }
                                >
                                    <p class="font-bebas text-2xl mt-4 tracking-wider">
                                        The majority · +1 point
                                    </p>
                                </Show>
                            </div>
                        )}
                    </For>
                </div>
                <Show when={props.view.answerGroups.length === 0}>
                    <p class="text-2xl text-muted">
                        No answers were revealed this round.
                    </p>
                </Show>
            </Show>
            <Show
                when={props.view.phase === "game_over" && props.view.winnerId}
            >
                <Confetti />
            </Show>
        </PartyQuestionBoard>
    );
}
