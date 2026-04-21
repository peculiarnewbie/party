import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { PokerActionType } from "~/game/poker/types";

export const ActionControls: Component<{
    legalActions: string[];
    callAmount: number;
    minBetOrRaise: number | null;
    maxBet: number;
    stack: number;
    amount: string;
    setAmount: (value: string) => void;
    isSpectator: boolean;
    isMyTurn: boolean;
    onAction: (type: PokerActionType, amount?: number) => void;
}> = (props) => {
    const hasAction = (type: PokerActionType) => props.legalActions.includes(type);
    const parsedAmount = () => {
        const value = Number(props.amount);
        if (!Number.isFinite(value)) return 0;
        return Math.max(0, Math.trunc(value));
    };
    const checkCallAction = (): "check" | "call" | null => {
        if (hasAction("call")) return "call";
        if (hasAction("check")) return "check";
        return null;
    };
    const checkCallLabel = () => {
        const action = checkCallAction();
        if (action === "call") return `Call ${props.callAmount}`;
        return "Check";
    };
    const canSubmitCheckCall = () => checkCallAction() !== null;
    const betRaiseAction = (): "bet" | "raise" | null => {
        if (hasAction("raise")) return "raise";
        if (hasAction("bet")) return "bet";
        return null;
    };
    const betRaiseLabel = () => {
        const action = betRaiseAction();
        if (action === "raise") return "Raise";
        return "Bet";
    };
    const canSubmitBetRaise = () => {
        const action = betRaiseAction();
        if (!action) return false;
        if (props.minBetOrRaise === null) return false;
        return parsedAmount() >= props.minBetOrRaise;
    };
    const adjustAmount = (delta: number) => {
        const next = Math.max(0, Math.min(props.maxBet, parsedAmount() + delta));
        props.setAmount(String(next));
    };
    const setAllInAmount = () => {
        props.onAction("all_in");
    };
    const submitCheckCall = () => {
        const action = checkCallAction();
        if (!action) return;
        props.onAction(action);
    };
    const submitBetRaise = () => {
        const action = betRaiseAction();
        if (!action) return;
        const value = Number(props.amount);
        if (!Number.isFinite(value)) return;
        props.onAction(action, value);
    };

    return (
        <div
            data-testid="poker-action-controls"
            class="border-2 border-[#1a1a1a] bg-[#ddd5c4] px-3 py-3 lg:px-4 lg:py-4 shadow-[3px_3px_0_#1a1a1a]"
        >
            <Show
                when={!props.isSpectator}
                fallback={
                    <div
                        data-testid="poker-spectator-copy"
                        class="font-bebas text-[.8rem] tracking-[.12em] text-[#9a9080]"
                    >
                        Spectators can follow the board and log, but cannot act.
                    </div>
                }
            >
                <div class="flex items-center justify-between mb-2">
                    <div class="font-bebas text-[.65rem] tracking-[.22em] text-[#9a9080]">
                        ACTIONS
                    </div>
                    <Show when={props.isMyTurn}>
                        <div class="font-bebas text-[.65rem] tracking-[.18em] text-[#c0261a] animate-pulse-fast">
                            YOUR MOVE
                        </div>
                    </Show>
                </div>

                <div class="flex items-center gap-3 mb-3">
                    <div class="font-bebas text-[1.6rem] lg:text-[1.8rem] leading-none text-[#1a1a1a]">
                        {props.stack}
                    </div>
                    <Show when={props.minBetOrRaise !== null}>
                        <div class="font-bebas text-[.6rem] tracking-[.14em] text-[#9a9080] leading-tight">
                            MIN {props.minBetOrRaise}
                            <br />
                            MAX {props.maxBet}
                        </div>
                    </Show>
                </div>

                <div class="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        data-testid="poker-fold-button"
                        disabled={!hasAction("fold")}
                        onClick={() => props.onAction("fold")}
                        class="font-bebas text-[.9rem] lg:text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#c9c0b0] text-[#5a5040] px-3 py-2.5 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        Fold
                    </button>
                    <button
                        type="button"
                        data-testid="poker-check-call-button"
                        disabled={!canSubmitCheckCall()}
                        onClick={submitCheckCall}
                        class="font-bebas text-[.9rem] lg:text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#c9c0b0] text-[#1a1a1a] px-3 py-2.5 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        {checkCallLabel()}
                    </button>
                    <button
                        type="button"
                        data-testid="poker-bet-raise-button"
                        disabled={!canSubmitBetRaise()}
                        onClick={submitBetRaise}
                        class="font-bebas text-[.9rem] lg:text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] px-3 py-2.5 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        {betRaiseLabel()}
                    </button>
                </div>

                <div class="mt-2 flex flex-wrap items-center gap-1.5">
                    <For each={[-10, -50, -100, 10, 50, 100]}>
                        {(delta) => (
                            <button
                                type="button"
                                data-testid={`poker-adjust-${delta}`}
                                onClick={() => adjustAmount(delta)}
                                class="font-bebas text-[.75rem] lg:text-[.85rem] tracking-[.08em] border-2 border-[#1a1a1a] bg-[#c9c0b0] text-[#1a1a1a] px-2 py-1.5 cursor-pointer transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                            >
                                {delta > 0 ? `+${delta}` : delta}
                            </button>
                        )}
                    </For>
                    <button
                        type="button"
                        data-testid="poker-all-in-button"
                        disabled={!hasAction("all_in")}
                        onClick={setAllInAmount}
                        class="font-bebas text-[.75rem] lg:text-[.85rem] tracking-[.08em] border-2 border-[#1a1a1a] bg-[#c0261a] text-[#ddd5c4] px-2 py-1.5 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        All-in
                    </button>
                    <input
                        type="number"
                        data-testid="poker-amount-input"
                        min={0}
                        max={props.maxBet || undefined}
                        value={props.amount}
                        onInput={(event) =>
                            props.setAmount(event.currentTarget.value)
                        }
                        class="w-20 lg:w-24 min-w-0 border-2 border-[#1a1a1a] bg-[#c9c0b0] px-2 py-1.5 font-bebas text-[.9rem] tracking-[.08em] text-[#1a1a1a] outline-none ml-auto"
                    />
                </div>
            </Show>
        </div>
    );
};
