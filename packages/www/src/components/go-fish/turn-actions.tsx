import { Show } from "solid-js";
import type { Rank } from "~/assets/card-deck/types";
import { RANK_LABEL } from "~/assets/card-deck/types";

interface TurnActionsProps {
    isMyTurn: boolean;
    turnPhase: string;
    selectedOpponent: string | null;
    selectedOpponentName: string | null;
    selectedRank: Rank | null;
    onCancel: () => void;
    currentPlayerName: string;
}

export function TurnActions(props: TurnActionsProps) {
    const hint = () => {
        if (props.selectedOpponent && props.selectedRank) return null;
        if (props.selectedOpponent)
            return `ASKING ${props.selectedOpponentName?.toUpperCase()} \u2014 PICK A RANK`;
        if (props.selectedRank)
            return `ASKING FOR ${RANK_LABEL[props.selectedRank]}s \u2014 PICK A PLAYER`;
        return "SELECT A PLAYER AND A RANK";
    };

    return (
        <div class="flex items-center justify-center gap-3 px-4 py-2 min-h-[48px]">
            <Show
                when={props.isMyTurn}
                fallback={
                    <div class="font-bebas text-[.85rem] tracking-[.15em] text-[#9a9080]">
                        WAITING FOR {props.currentPlayerName.toUpperCase()}...
                    </div>
                }
            >
                <Show when={props.turnPhase === "awaiting_ask"}>
                    <div class="flex items-center gap-3">
                        <span class="font-bebas text-[.85rem] tracking-[.15em] text-[#9a9080]">
                            {hint()}
                        </span>
                        <Show
                            when={
                                props.selectedOpponent || props.selectedRank
                            }
                        >
                            <button
                                class="font-bebas text-[.85rem] tracking-[.1em] bg-[#c9c0b0] text-[#5a5040] border-2 border-[#b8ae9e] px-4 py-1 cursor-pointer transition-all duration-[120ms] hover:bg-[#bfb5a4] hover:border-[#5a5040]"
                                onClick={() => props.onCancel()}
                            >
                                Clear
                            </button>
                        </Show>
                    </div>
                </Show>

                <Show when={props.turnPhase === "go_fish"}>
                    <div class="font-bebas text-[1rem] tracking-[.1em] text-[#c0261a]">
                        GO FISH! DRAW A CARD
                    </div>
                </Show>
            </Show>
        </div>
    );
}
