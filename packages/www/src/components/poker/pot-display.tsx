import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { PokerPot } from "~/game/poker";

export const PotDisplay: Component<{
    pots: PokerPot[];
}> = (props) => {
    return (
        <div class="flex flex-wrap justify-center gap-2">
            <Show
                when={props.pots.length > 0}
                fallback={
                    <div class="font-bebas text-[.65rem] tracking-[.2em] text-[#9a9080]">
                        NO POT
                    </div>
                }
            >
                <For each={props.pots}>
                    {(pot, index) => (
                        <div class="border-2 border-[#1a1a1a] bg-[#1a3a6e] px-3 py-1.5 text-center">
                            <div class="font-bebas text-[.55rem] tracking-[.18em] text-[#ddd5c4]/70">
                                {index() === 0 ? "MAIN POT" : `SIDE POT ${index()}`}
                            </div>
                            <div class="font-bebas text-[1rem] leading-none text-[#ddd5c4]">
                                {pot.amount}
                            </div>
                        </div>
                    )}
                </For>
            </Show>
        </div>
    );
};
