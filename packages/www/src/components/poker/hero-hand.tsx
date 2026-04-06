import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { Card } from "~/assets/card-deck/types";

export const HeroHand: Component<{
    cards: Card[];
    cardCount: number;
    isSpectator: boolean;
    stack: number;
    status: string | null;
}> = (props) => {
    return (
        <div class="border-2 border-[#1a1a1a] bg-[#ddd5c4] px-5 py-4 shadow-[3px_3px_0_#1a1a1a]">
            <div class="flex items-center justify-between gap-4 mb-4">
                <div>
                    <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#9a9080]">
                        YOUR HAND
                    </div>
                    <div class="font-bebas text-[1.6rem] leading-none text-[#1a1a1a]">
                        {props.isSpectator ? "SPECTATING" : props.stack}
                    </div>
                </div>
                <Show when={!props.isSpectator}>
                    <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#1a3a6e]">
                        {props.status?.toUpperCase()}
                    </div>
                </Show>
            </div>

            <Show
                when={!props.isSpectator}
                fallback={
                    <div class="font-bebas text-[.9rem] tracking-[.12em] text-[#9a9080]">
                        You joined this table as a spectator.
                    </div>
                }
            >
                <div class="flex gap-3 flex-wrap">
                    <Show
                        when={props.cards.length > 0}
                        fallback={
                            <For each={Array.from({ length: props.cardCount })}>
                                {() => <CardBack size={112} />}
                            </For>
                        }
                    >
                        <For each={props.cards}>
                            {(card) => (
                                <PlayingCard
                                    suit={card.suit}
                                    rank={card.rank}
                                    size={112}
                                />
                            )}
                        </For>
                    </Show>
                </div>
            </Show>
        </div>
    );
};
