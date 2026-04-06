import { Show } from "solid-js";
import { CardBack } from "~/assets/card-deck/card-back";

interface DrawPileProps {
    count: number;
    showDrawButton: boolean;
    onDraw: () => void;
}

export function DrawPile(props: DrawPileProps) {
    return (
        <div class="flex flex-col items-center gap-2">
            <div class="font-bebas text-[.65rem] tracking-[.28em] text-[#9a9080]">
                DRAW PILE
            </div>

            <Show
                when={props.count > 0}
                fallback={
                    <div class="w-[64px] h-[90px] border-2 border-dashed border-[#b8ae9e] flex items-center justify-center">
                        <span class="font-bebas text-[.65rem] tracking-[.1em] text-[#b8ae9e]">
                            EMPTY
                        </span>
                    </div>
                }
            >
                <div class="relative">
                    <Show when={props.count > 4}>
                        <div
                            class="absolute"
                            style={{ top: "-4px", left: "4px" }}
                        >
                            <CardBack size={64} />
                        </div>
                    </Show>
                    <Show when={props.count > 2}>
                        <div
                            class="absolute"
                            style={{ top: "-2px", left: "2px" }}
                        >
                            <CardBack size={64} />
                        </div>
                    </Show>
                    <div class="relative">
                        <CardBack size={64} />
                    </div>
                </div>
            </Show>

            <div class="font-bebas text-[.75rem] tracking-[.1em] text-[#1a1a1a]">
                {props.count} LEFT
            </div>

            <Show when={props.showDrawButton}>
                <button
                    class="font-bebas text-[1rem] tracking-[.1em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-2 cursor-pointer shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                    onClick={() => props.onDraw()}
                >
                    Go Fish!
                </button>
            </Show>
        </div>
    );
}
