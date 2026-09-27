import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { TableCard } from "~/components/casino";
import type { Card } from "~/assets/card-deck/types";

export const HeroHand: Component<{
    cards: Card[];
    cardCount: number;
    isSpectator: boolean;
    handNumber?: number;
    label?: string | null;
    folded?: boolean;
}> = (props) => {
    const cards = (): (Card | null)[] =>
        props.cards.length > 0
            ? props.cards
            : Array.from({ length: props.cardCount }, () => null);

    return (
        <div data-testid="poker-hero-hand" class="relative">
            <Show
                when={!props.isSpectator}
                fallback={
                    <div class="border-2 border-dashed border-[#9a9080] px-4 pt-3 pb-2 text-center font-bebas text-lg tracking-[.16em] text-[#5a5040]">
                        Spectating
                    </div>
                }
            >
                <div class="flex flex-col items-center">
                    <Show when={String(props.handNumber ?? 0)} keyed>
                        {(_hand) => (
                            <div
                                class={`flex justify-center transition-all duration-500 ${props.folded ? "opacity-40 grayscale scale-95" : ""}`}
                                style={{ "--deal-from-y": "-320px" }}
                            >
                                <For each={cards()} keyed={false}>
                                    {(card, index) => (
                                        <div
                                            class={
                                                index === 0
                                                    ? "-rotate-[7deg] translate-x-3 translate-y-1"
                                                    : "rotate-[7deg] -translate-x-3 translate-y-1"
                                            }
                                        >
                                            <TableCard
                                                card={card()}
                                                class="w-[118px] sm:w-[140px]"
                                                delay={index * 160}
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        )}
                    </Show>
                    <Show when={props.folded}>
                        <span class="mt-4 border-2 border-[#1a1a1a] bg-[#9a9080] px-3 pt-1 pb-0.5 font-bebas tracking-[.2em] text-[#f7f2de] shadow-[2px_2px_0_#1a1a1a] animate-stamp-in">
                            Folded
                        </span>
                    </Show>
                    <Show when={!props.folded && props.label}>
                        <span class="mt-4 border-2 border-[#1a1a1a] bg-[#f5c542] px-4 pt-1 pb-0.5 font-bebas text-lg tracking-[.18em] text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] animate-stamp-in [--stamp-rot:-2deg]">
                            {props.label}
                        </span>
                    </Show>
                </div>
            </Show>
        </div>
    );
};
