import type { Component } from "solid-js";
import { For } from "solid-js";
import { PlayingCard } from "~/assets/card-deck";
import type { Card } from "~/assets/card-deck/types";

export const CommunityBoard: Component<{
    board: Card[];
}> = (props) => {
    const slots = () =>
        Array.from({ length: 5 }, (_, index) => props.board[index] ?? null);

    return (
        <div class="flex flex-wrap justify-center gap-3">
            <For each={slots()}>
                {(card) => (
                    <div class="w-[86px] h-[120px] border-2 border-dashed border-[#b8ae9e] bg-[#ddd5c4] flex items-center justify-center">
                        {card ? (
                            <PlayingCard
                                suit={card.suit}
                                rank={card.rank}
                                size={86}
                            />
                        ) : (
                            <div class="font-bebas text-[.7rem] tracking-[.18em] text-[#9a9080]">
                                WAIT
                            </div>
                        )}
                    </div>
                )}
            </For>
        </div>
    );
};
