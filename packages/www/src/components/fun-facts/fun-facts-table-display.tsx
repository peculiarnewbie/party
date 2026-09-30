import { For, Show } from "solid-js";
import { AnimatedNumber, Confetti } from "~/components/casino";
import {
    PartyAnswerProgress,
    PartyQuestionBoard,
} from "~/components/party-question-board";
import type { FunFactsTableView } from "~/game/fun-facts/table-view";

export function FunFactsTableDisplay(props: { view: FunFactsTableView }) {
    const name = (id: string | null) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const revealed = () =>
        props.view.phase === "reveal" || props.view.phase === "game_over";
    const status = () => {
        if (props.view.phase === "game_over")
            return "See how well you know each other!";
        if (props.view.phase === "waiting")
            return "Answer in secret. Then work together to put everyone's numbers in order.";
        if (props.view.phase === "answering")
            return props.view.answeredCount === props.view.players.length
                ? "Everyone has answered. The host can start the ordering!"
                : "Your number stays on your phone until the reveal.";
        if (props.view.phase === "placing")
            return `${name(props.view.currentPlacerId)} is placing next. Choose a gap on your phone.`;
        return `${props.view.roundResult?.pointsEarned ?? 0} arrows in order. Each correct arrow earns a team point!`;
    };
    const phase = () =>
        ({
            waiting: "Get ready",
            answering: "Answer on your phone",
            placing: "Put yourselves in order",
            reveal: "The reveal",
            game_over: "Team results",
        })[props.view.phase];

    return (
        <PartyQuestionBoard
            game="fun-facts"
            title="Fun Facts"
            round={props.view.roundNumber}
            totalRounds={props.view.totalRounds}
            phase={phase()}
            status={status()}
            question={
                props.view.phase === "waiting"
                    ? null
                    : props.view.currentQuestion
            }
            sidebar={
                <>
                    <div class="border-[3px] border-ink bg-navy text-cream p-6 shadow-ink">
                        <h3 class="font-bebas text-3xl tracking-wider">
                            Team score
                        </h3>
                        <AnimatedNumber
                            value={props.view.teamScore}
                            class="block font-bebas text-8xl my-3"
                        />
                        <p class="text-xl">
                            / {props.view.maxScore} possible points
                        </p>
                        <Show when={props.view.phase === "game_over"}>
                            <p class="font-bebas text-3xl mt-4">
                                {props.view.maxScore
                                    ? Math.round(
                                          (props.view.teamScore /
                                              props.view.maxScore) *
                                              100,
                                      )
                                    : 0}
                                % accuracy
                            </p>
                        </Show>
                    </div>
                    <Show when={props.view.roundScores.length > 0}>
                        <div class="border-[3px] border-ink bg-cream p-5 shadow-ink">
                            <h3 class="font-bebas text-3xl mb-4">
                                Round by round
                            </h3>
                            <div class="flex flex-wrap gap-3">
                                <For
                                    each={props.view.roundScores}
                                    keyed={false}
                                >
                                    {(score, index) => (
                                        <div class="border-2 border-ink bg-paper px-4 py-2 text-center">
                                            <p class="font-bebas text-lg text-muted">
                                                Round {index + 1}
                                            </p>
                                            <p class="font-bebas text-3xl text-navy">
                                                {score()}
                                            </p>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </div>
                    </Show>
                    <Show when={props.view.phase === "placing"}>
                        <div class="border-[3px] border-ink bg-cream p-5 shadow-ink">
                            <h3 class="font-bebas text-3xl mb-4">Up next</h3>
                            <For
                                each={props.view.placingOrder.filter(
                                    (player) =>
                                        !props.view.placedArrows.some(
                                            (arrow) =>
                                                arrow.playerId === player.id,
                                        ),
                                )}
                            >
                                {(player) => (
                                    <p
                                        class={`text-xl py-2 border-b border-line break-words ${player.id === props.view.currentPlacerId ? "font-bold text-tomato" : "text-muted"}`}
                                    >
                                        {player.name}
                                        <Show
                                            when={
                                                player.id ===
                                                props.view.currentPlacerId
                                            }
                                        >
                                            {" "}
                                            · Your turn
                                        </Show>
                                    </p>
                                )}
                            </For>
                        </div>
                    </Show>
                    <p class="text-lg text-muted">
                        Talk about where you belong, but keep your number
                        secret. Lowest to highest!
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
                        How well do you know your friends?
                    </p>
                    <p class="text-2xl text-muted">
                        The host is choosing a question. Everyone, including the
                        host, answers on their phone.
                    </p>
                </div>
            </Show>
            <Show when={props.view.phase === "placing" || revealed()}>
                <div
                    style={{ "--mat": "var(--color-kraft)" }}
                    class="table-mat border-[3px] border-ink p-6 shadow-ink"
                >
                    <div class="flex flex-wrap justify-between gap-3 font-bebas text-2xl tracking-wider mb-5">
                        <span>Lowest → Highest</span>
                        <span>
                            {props.view.placedArrows.length} /{" "}
                            {props.view.placingOrder.length} placed
                        </span>
                    </div>
                    <ol class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-5">
                        <For each={props.view.placedArrows} keyed={false}>
                            {(arrow, index) => (
                                <li
                                    data-testid="fun-facts-display-arrow"
                                    class={`relative border-[3px] border-ink p-5 shadow-ink animate-rise-in motion-reduce:animate-none ${revealed() && props.view.roundResult?.removedArrows.includes(arrow().playerId) ? "bg-[#f4d5cb]" : "bg-cream"}`}
                                >
                                    <p class="font-bebas text-xl text-muted mb-3">
                                        Position {index + 1}
                                    </p>
                                    <h3 class="text-2xl font-bold break-words">
                                        {arrow().playerName}
                                    </h3>
                                    <p
                                        class="font-bebas text-6xl text-navy my-4"
                                        aria-label={
                                            arrow().answer === null
                                                ? "Hidden answer"
                                                : "Revealed answer"
                                        }
                                    >
                                        {arrow().answer === null
                                            ? "?"
                                            : arrow().answer}
                                    </p>
                                    <Show
                                        when={
                                            revealed() && props.view.roundResult
                                        }
                                    >
                                        <p
                                            class={`font-bebas text-2xl ${props.view.roundResult?.correctArrows.includes(arrow().playerId) ? "text-teal" : "text-tomato"}`}
                                        >
                                            {props.view.roundResult?.correctArrows.includes(
                                                arrow().playerId,
                                            )
                                                ? "In order · +1"
                                                : "Out of order"}
                                        </p>
                                    </Show>
                                </li>
                            )}
                        </For>
                    </ol>
                    <Show when={props.view.phase === "placing"}>
                        <p class="mt-6 text-xl text-navy">
                            {name(props.view.currentPlacerId)}, place before,
                            between, or after these arrows using your phone.
                        </p>
                    </Show>
                    <Show
                        when={
                            props.view.phase === "game_over" &&
                            !props.view.roundResult
                        }
                    >
                        <p class="text-xl text-muted mt-4">
                            The game ended before this round's reveal. Numbers
                            stay private.
                        </p>
                    </Show>
                </div>
            </Show>
            <Show
                when={
                    props.view.phase === "game_over" && props.view.teamScore > 0
                }
            >
                <Confetti />
            </Show>
        </PartyQuestionBoard>
    );
}
