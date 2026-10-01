import { For, Show } from "solid-js";
import { TableDie } from "~/components/casino/table-die";
import { YahtzeeScorecard } from "./yahtzee-scorecard";
import type { YahtzeeTableView } from "~/game/yahtzee/table-view";

export function YahtzeeTableDisplay(props: { view: YahtzeeTableView }) {
    const actor = () =>
        props.view.players.find(
            (player) => player.id === props.view.currentPlayerId,
        );
    return (
        <section
            data-testid="yahtzee-table-display"
            class="mx-auto max-w-[1600px] space-y-5 p-6"
        >
            <header class="flex items-center justify-between font-bebas text-3xl">
                <h1>YAHTZEE</h1>
                <span>ROUND {props.view.round} / 13</span>
            </header>
            <section class="table-mat flex flex-wrap items-center justify-between gap-5 border-3 border-ink bg-navy p-5 text-cream shadow-ink">
                <div>
                    <h2 class="font-bebas text-4xl">
                        {props.view.phase === "game_over"
                            ? "FINAL SCORES"
                            : `${actor()?.name ?? "Player"}'s turn`}
                    </h2>
                    <Show when={props.view.phase !== "game_over"}>
                        <p class="font-bebas text-xl">
                            {props.view.rollsLeft} ROLLS LEFT
                        </p>
                    </Show>
                </div>
                <Show when={props.view.phase !== "game_over"}>
                    <div class="flex gap-3">
                        <For each={props.view.dice} keyed={false}>
                            {(die, index) => (
                                <TableDie
                                    value={die()}
                                    held={props.view.held[index]}
                                    size={64}
                                />
                            )}
                        </For>
                    </div>
                </Show>
                <Show when={props.view.winners}>
                    <div class="font-bebas text-3xl text-sun">
                        {props.view.players
                            .filter((player) =>
                                props.view.winners?.includes(player.id),
                            )
                            .map((player) => player.name)
                            .join(" & ")}{" "}
                        WINS
                    </div>
                </Show>
            </section>
            <YahtzeeScorecard
                players={props.view.players}
                currentPlayerId={props.view.currentPlayerId}
            />
        </section>
    );
}
