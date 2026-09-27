import { For, Show } from "solid-js";
import type { Rank } from "~/assets/card-deck/types";
import { RANK_LABEL, SUITS } from "~/assets/card-deck/types";
import { TableCard } from "~/components/casino";

interface BooksDisplayProps {
    books: Rank[];
    label?: string;
}

export function BooksDisplay(props: BooksDisplayProps) {
    return (
        <Show when={props.books.length > 0}>
            <div class="px-4 py-2">
                <div class="font-bebas text-sm tracking-widest text-muted mb-2">
                    {props.label ?? "YOUR BOOKS"} ({props.books.length})
                </div>
                <div class="flex gap-3 overflow-x-auto pb-1 flex-wrap">
                    <For each={props.books} keyed={false}>
                        {(rank) => (
                            <div class="flex -space-x-8 items-end">
                                <For each={SUITS} keyed={false}>
                                    {(suit) => (
                                        <div>
                                            <TableCard
                                                card={{
                                                    suit: suit(),
                                                    rank: rank(),
                                                }}
                                                class="w-[45px]"
                                            />
                                        </div>
                                    )}
                                </For>
                                <div class="font-bebas text-sm tracking-wider text-ink ml-2 pb-1">
                                    {RANK_LABEL[rank()]}s
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </Show>
    );
}
