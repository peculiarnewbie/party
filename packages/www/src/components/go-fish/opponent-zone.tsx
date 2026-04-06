import { Show } from "solid-js";
import type { Rank } from "~/assets/card-deck/types";
import { CardBack } from "~/assets/card-deck/card-back";
import { RANK_LABEL } from "~/assets/card-deck/types";

interface OpponentZoneProps {
    id: string;
    name: string;
    cardCount: number;
    books: Rank[];
    isCurrentTurn: boolean;
    selectable: boolean;
    selected: boolean;
    onSelect: (id: string) => void;
}

export function OpponentZone(props: OpponentZoneProps) {
    return (
        <button
            class={`flex flex-col items-center gap-2 p-3 transition-all duration-[120ms] ${
                props.selectable
                    ? "border-2 border-dashed border-[#1a3a6e] cursor-pointer hover:-translate-y-1 hover:shadow-[3px_3px_0_#1a3a6e]"
                    : "border-2 border-transparent"
            } ${
                props.selected
                    ? "border-solid border-[#1a3a6e] bg-[#c9c0b0] shadow-[3px_3px_0_#1a3a6e] -translate-y-1"
                    : ""
            } ${props.isCurrentTurn ? "bg-[#c9c0b0]/50" : ""}`}
            onClick={() => {
                if (props.selectable) props.onSelect(props.id);
            }}
            disabled={!props.selectable}
        >
            <div
                class={`w-10 h-10 flex items-center justify-center font-bebas text-[1.1rem] ${
                    props.isCurrentTurn
                        ? "bg-[#c0261a] text-[#ddd5c4]"
                        : "bg-[#1a3a6e] text-[#ddd5c4]"
                }`}
            >
                {props.name.charAt(0).toUpperCase()}
            </div>

            <div class="font-karla text-[.85rem] text-[#1a1a1a] text-center leading-tight">
                {props.name}
            </div>

            <div class="flex items-center gap-1">
                <Show
                    when={props.cardCount > 0}
                    fallback={
                        <div class="font-bebas text-[.65rem] tracking-[.15em] text-[#9a9080]">
                            NO CARDS
                        </div>
                    }
                >
                    <div class="flex -space-x-6">
                        <CardBack size={35} />
                        <Show when={props.cardCount > 1}>
                            <CardBack size={35} />
                        </Show>
                        <Show when={props.cardCount > 3}>
                            <CardBack size={35} />
                        </Show>
                    </div>
                    <div class="font-bebas text-[.75rem] tracking-[.1em] text-[#1a1a1a] ml-1">
                        {props.cardCount}
                    </div>
                </Show>
            </div>

            <Show when={props.books.length > 0}>
                <div class="font-bebas text-[.6rem] tracking-[.18em] text-[#9a9080]">
                    BOOKS: {props.books.map((r) => RANK_LABEL[r]).join(", ")}
                </div>
            </Show>
        </button>
    );
}
