import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { Card } from "~/assets/card-deck/types";

export const HeroHand: Component<{
    cards: Card[];
    cardCount: number;
    isSpectator: boolean;
}> = (props) => {
    return (
        <div data-testid="poker-hero-hand">
            <Show
                when={!props.isSpectator}
                fallback={
                    <div class="font-bebas text-[.8rem] tracking-[.12em] text-[#9a9080]">
                        Spectating
                    </div>
                }
            >
                <div class="flex gap-2">
                    <Show
                        when={props.cards.length > 0}
                        fallback={
                            <For each={Array.from({ length: props.cardCount })}>
                                {() => (
                                    <div class="w-[60px] sm:w-[72px] lg:w-[84px]">
                                        <CardBack class="w-full" />
                                    </div>
                                )}
                            </For>
                        }
                    >
                        <For each={props.cards}>
                            {(card) => (
                                <div class="w-[60px] sm:w-[72px] lg:w-[84px]">
                                    <PlayingCard
                                        suit={card.suit}
                                        rank={card.rank}
                                        class="w-full"
                                    />
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
            </Show>
        </div>
    );
};
