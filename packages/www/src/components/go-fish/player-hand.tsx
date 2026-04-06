import { For, Show } from "solid-js";
import type { Card, Rank } from "~/assets/card-deck/types";
import { PlayingCard } from "~/assets/card-deck/playing-card";
import { RANK_LABEL } from "~/assets/card-deck/types";

interface PlayerHandProps {
    cards: Card[];
    selectedRank: Rank | null;
    onSelectRank: (rank: Rank) => void;
    disabled: boolean;
}

interface RankGroup {
    rank: Rank;
    cards: Card[];
}

function groupByRank(cards: Card[]): RankGroup[] {
    const map = new Map<Rank, Card[]>();
    for (const card of cards) {
        const existing = map.get(card.rank) ?? [];
        existing.push(card);
        map.set(card.rank, existing);
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a - b)
        .map(([rank, cards]) => ({ rank, cards }));
}

export function PlayerHand(props: PlayerHandProps) {
    const groups = () => groupByRank(props.cards);

    return (
        <div class="border-t-[3px] border-[#1a1a1a] pt-3 pb-4 px-4">
            <div class="font-bebas text-[.7rem] tracking-[.28em] text-[#9a9080] mb-2">
                YOUR HAND ({props.cards.length})
            </div>
            <div class="flex gap-4 overflow-x-auto pb-2 justify-center flex-wrap">
                <For each={groups()}>
                    {(group) => {
                        const isSelected = () =>
                            props.selectedRank === group.rank;
                        return (
                            <button
                                class={`flex relative cursor-pointer transition-all duration-[120ms] ${
                                    isSelected()
                                        ? "-translate-y-3"
                                        : props.disabled
                                          ? "opacity-60 cursor-default"
                                          : "hover:-translate-y-1"
                                }`}
                                onClick={() => {
                                    if (!props.disabled)
                                        props.onSelectRank(group.rank);
                                }}
                                disabled={props.disabled}
                            >
                                <Show when={group.cards.length > 1}>
                                    <div class="absolute -top-2 -right-1 z-10 bg-[#1a3a6e] text-[#ddd5c4] font-bebas text-[.65rem] tracking-[.1em] w-5 h-5 flex items-center justify-center">
                                        x{group.cards.length}
                                    </div>
                                </Show>
                                <For each={group.cards}>
                                    {(card, i) => (
                                        <div
                                            class={`${i() > 0 ? "-ml-[60px] max-sm:-ml-[45px]" : ""}`}
                                            style={{
                                                filter: isSelected()
                                                    ? "drop-shadow(0 4px 12px rgba(26,58,110,0.3))"
                                                    : undefined,
                                            }}
                                        >
                                            <PlayingCard
                                                suit={card.suit}
                                                rank={card.rank}
                                                size={100}
                                            />
                                        </div>
                                    )}
                                </For>
                            </button>
                        );
                    }}
                </For>
            </div>
        </div>
    );
}
