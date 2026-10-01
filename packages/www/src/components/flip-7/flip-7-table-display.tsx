import { For, Show } from "solid-js";
import { PlayerBoard } from "./player-board";
import { Flip7Results, Flip7Status } from "./flip-7-status";
import type { Flip7TableView } from "~/game/flip-7/table-view";

export function Flip7TableDisplay(props: { view: Flip7TableView }) {
    return (
        <section
            data-testid="flip-7-table-display"
            data-phase={props.view.phase}
            class="mx-auto max-w-[1600px] space-y-5 px-6 py-5"
        >
            <header class="flex flex-wrap items-center justify-between gap-3 font-bebas">
                <h1 class="text-4xl">FLIP 7</h1>
                <span class="text-2xl">
                    ROUND {props.view.roundNumber} · FIRST TO{" "}
                    {props.view.targetScore}
                </span>
            </header>
            <Flip7Status view={props.view} />
            <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] gap-5">
                <For each={props.view.players} keyed={false}>
                    {(player) => (
                        <div
                            data-testid={`display-seat-${player().id}`}
                            data-acting={String(
                                props.view.currentPlayerId === player().id,
                            )}
                        >
                            <PlayerBoard
                                large
                                player={player()}
                                roundScore={
                                    props.view.lastRoundResult?.scores.find(
                                        (score) =>
                                            score.playerId === player().id,
                                    )?.score
                                }
                                isCurrent={
                                    props.view.currentPlayerId === player().id
                                }
                                isWinner={
                                    props.view.winners?.includes(player().id) ??
                                    false
                                }
                            />
                        </div>
                    )}
                </For>
            </div>
            <Show
                when={
                    props.view.phase === "round_over" ||
                    props.view.phase === "game_over"
                }
            >
                <div class="mx-auto max-w-xl">
                    <Flip7Results view={props.view} />
                </div>
            </Show>
            <p class="text-center font-bebas text-lg tracking-wider text-muted">
                {props.view.deckCount} CARDS LEFT
            </p>
        </section>
    );
}
