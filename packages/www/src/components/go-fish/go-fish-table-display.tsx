import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { TableCard } from "~/components/casino";
import { BooksDisplay } from "./books-display";
import { GoFishStatus } from "./go-fish-status";
import type { GoFishTableView } from "~/game/go-fish/table-view";

export function GoFishTableDisplay(props: { view: GoFishTableView }) {
    return (
        <section
            data-testid="go-fish-table-display"
            class="mx-auto max-w-[1600px] space-y-5 p-6"
        >
            <header class="flex items-center justify-between font-bebas text-3xl">
                <h1>GO FISH</h1>
                <span>{props.view.drawPileCount} LEFT</span>
            </header>
            <Show
                when={!props.view.gameOver}
                fallback={
                    <div class="border-3 border-ink bg-sun p-4 font-bebas text-4xl shadow-ink">
                        {props.view.players
                            .filter((player) =>
                                props.view.winner?.includes(player.id),
                            )
                            .map((player) => player.name)
                            .join(" & ")}{" "}
                        WINS!
                    </div>
                }
            >
                <GoFishStatus view={props.view} />
            </Show>
            <div class="grid grid-cols-2 gap-4 xl:grid-cols-3">
                <For each={props.view.players} keyed={false}>
                    {(player) => (
                        <article
                            class={`min-w-0 border-3 border-ink p-4 shadow-ink ${!props.view.gameOver && player().id === props.view.currentPlayerId ? "bg-sun" : "bg-cream"}`}
                        >
                            <div class="flex items-center gap-3">
                                <PlayerAvatar
                                    id={player().id}
                                    name={player().name}
                                />
                                <h2 class="min-w-0 flex-1 truncate font-bebas text-2xl">
                                    {player().name}
                                </h2>
                                <span class="font-bebas text-2xl">
                                    {player().books.length}{" "}
                                    {player().books.length === 1
                                        ? "BOOK"
                                        : "BOOKS"}
                                </span>
                            </div>
                            <div class="mt-4 flex items-center gap-3">
                                <TableCard card={null} class="w-10" />
                                <span class="font-bebas text-2xl">
                                    ×{player().cardCount}
                                </span>
                            </div>
                            <BooksDisplay
                                books={player().books}
                                label=""
                                large
                            />
                        </article>
                    )}
                </For>
            </div>
        </section>
    );
}
