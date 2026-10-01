import { For, Show } from "solid-js";
import type { Rank } from "~/assets/card-deck/types";
import { SUITS } from "~/assets/card-deck/types";
import { TableCard } from "~/components/casino";

interface BooksDisplayProps {
    books: Rank[];
    label?: string;
    large?: boolean;
}

export function BooksDisplay(props: BooksDisplayProps) {
    return (
        <Show when={props.books.length > 0}>
            <div class="px-4 py-2">
                <Show when={props.label !== ""}>
                    <div class="font-bebas text-sm tracking-widest text-muted mb-2">
                        {props.label ?? "YOUR BOOKS"} ({props.books.length})
                    </div>
                </Show>
                <div class="flex flex-wrap gap-3 p-1 pb-2">
                    <For each={props.books} keyed={false}>
                        {(rank) => (
                            <div
                                class={`flex items-end ${props.large ? "-space-x-12" : "-space-x-8"}`}
                            >
                                <For each={SUITS} keyed={false}>
                                    {(suit) => (
                                        <div>
                                            <TableCard
                                                card={{
                                                    suit: suit(),
                                                    rank: rank(),
                                                }}
                                                class={
                                                    props.large
                                                        ? "w-16"
                                                        : "w-[45px]"
                                                }
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </Show>
    );
}
