import { For, Show } from "solid-js";
import type { Rank, Suit } from "~/assets/card-deck/types";
import { RANK_LABEL, SUITS } from "~/assets/card-deck/types";
import { PlayingCard } from "~/assets/card-deck/playing-card";

interface BooksDisplayProps {
    books: Rank[];
    label?: string;
}

export function BooksDisplay(props: BooksDisplayProps) {
    return (
        <Show when={props.books.length > 0}>
            <div class="px-4 py-2">
                <div class="font-bebas text-[.6rem] tracking-[.28em] text-[#9a9080] mb-1">
                    {props.label ?? "YOUR BOOKS"} ({props.books.length})
                </div>
                <div class="flex gap-3 overflow-x-auto pb-1 flex-wrap">
                    <For each={props.books}>
                        {(rank) => (
                            <div class="flex -space-x-8 items-end">
                                <For each={SUITS as unknown as Suit[]}>
                                    {(suit) => (
                                        <div class="opacity-80">
                                            <PlayingCard
                                                suit={suit}
                                                rank={rank}
                                                size={45}
                                            />
                                        </div>
                                    )}
                                </For>
                                <div class="font-bebas text-[.7rem] tracking-[.1em] text-[#1a1a1a] ml-2 pb-1">
                                    {RANK_LABEL[rank]}s
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </Show>
    );
}
