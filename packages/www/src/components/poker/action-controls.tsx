import type { Component } from "solid-js";
import { Show } from "solid-js";
import type { PokerActionType } from "~/game/poker/types";

export const ActionControls: Component<{
    legalActions: string[];
    callAmount: number;
    minBetOrRaise: number | null;
    maxBet: number;
    amount: string;
    setAmount: (value: string) => void;
    isSpectator: boolean;
    isMyTurn: boolean;
    onAction: (type: PokerActionType, amount?: number) => void;
}> = (props) => {
    const hasAction = (type: PokerActionType) => props.legalActions.includes(type);

    const submitSizedAction = (type: "bet" | "raise") => {
        const value = Number(props.amount);
        if (!Number.isFinite(value)) return;
        props.onAction(type, value);
    };

    return (
        <div
            data-testid="poker-action-controls"
            class="border-2 border-[#1a1a1a] bg-[#ddd5c4] px-5 py-4 shadow-[3px_3px_0_#1a1a1a]"
        >
            <div class="flex items-center justify-between gap-4 mb-4">
                <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#9a9080]">
                    ACTIONS
                </div>
                <Show when={props.isMyTurn && !props.isSpectator}>
                    <div class="font-bebas text-[.72rem] tracking-[.18em] text-[#c0261a]">
                        YOUR MOVE
                    </div>
                </Show>
            </div>

            <Show
                when={!props.isSpectator}
                fallback={
                    <div
                        data-testid="poker-spectator-copy"
                        class="font-bebas text-[.9rem] tracking-[.12em] text-[#9a9080]"
                    >
                        Spectators can follow the board and log, but cannot act.
                    </div>
                }
            >
                <div class="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        data-testid="poker-fold-button"
                        disabled={!hasAction("fold")}
                        onClick={() => props.onAction("fold")}
                        class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#c9c0b0] text-[#5a5040] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        Fold
                    </button>
                    <button
                        type="button"
                        data-testid="poker-check-button"
                        disabled={!hasAction("check")}
                        onClick={() => props.onAction("check")}
                        class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        Check
                    </button>
                    <button
                        type="button"
                        data-testid="poker-call-button"
                        disabled={!hasAction("call")}
                        onClick={() => props.onAction("call")}
                        class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        Call {props.callAmount}
                    </button>
                    <button
                        type="button"
                        data-testid="poker-all-in-button"
                        disabled={!hasAction("all_in")}
                        onClick={() => props.onAction("all_in")}
                        class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#c0261a] text-[#ddd5c4] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        All-in
                    </button>
                </div>

                <div class="mt-4 flex flex-col gap-3">
                    <div class="flex items-center gap-3">
                        <input
                            type="number"
                            data-testid="poker-amount-input"
                            min={props.minBetOrRaise ?? undefined}
                            max={props.maxBet || undefined}
                            value={props.amount}
                            onInput={(event) =>
                                props.setAmount(event.currentTarget.value)
                            }
                            class="flex-1 min-w-0 border-2 border-[#1a1a1a] bg-[#c9c0b0] px-4 py-3 font-bebas text-[1rem] tracking-[.08em] text-[#1a1a1a] outline-none transition-[border-color] duration-150 focus:border-[#1a1a1a] placeholder:text-[#9a9080]"
                        />
                        <div class="font-bebas text-[.65rem] tracking-[.18em] text-[#9a9080]">
                            MIN {props.minBetOrRaise ?? 0}
                            <br />
                            MAX {props.maxBet}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            data-testid="poker-bet-button"
                            disabled={!hasAction("bet")}
                            onClick={() => submitSizedAction("bet")}
                            class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#ddd5c4] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#9a9080]"
                        >
                            Bet
                        </button>
                        <button
                            type="button"
                            data-testid="poker-raise-button"
                            disabled={!hasAction("raise")}
                            onClick={() => submitSizedAction("raise")}
                            class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#ddd5c4] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#9a9080]"
                        >
                            Raise
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
};
