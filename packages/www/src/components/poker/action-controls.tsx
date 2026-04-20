import type { Component } from "solid-js";
import { For, Show } from "solid-js";
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
    const parsedAmount = () => {
        const value = Number(props.amount);
        if (!Number.isFinite(value)) return 0;
        return Math.max(0, Math.trunc(value));
    };
    const primaryAction = (): "check" | "call" | "bet" | "raise" | null => {
        const amount = parsedAmount();

        if (
            hasAction("raise") &&
            props.minBetOrRaise !== null &&
            amount >= props.minBetOrRaise
        ) {
            return "raise";
        }

        if (
            hasAction("bet") &&
            props.minBetOrRaise !== null &&
            amount >= props.minBetOrRaise
        ) {
            return "bet";
        }

        if (hasAction("call")) return "call";
        if (hasAction("check")) return "check";
        return null;
    };
    const primaryActionLabel = () => {
        const action = primaryAction();
        if (action === "call") {
            return `Call ${props.callAmount}`;
        }

        if (action === "check") {
            return "Check";
        }

        if (action === "bet") {
            return "Bet";
        }

        if (action === "raise") {
            return "Raise";
        }

        return "Act";
    };
    const canSubmitPrimaryAction = () => {
        const action = primaryAction();
        if (!action) return false;
        if ((action === "bet" || action === "raise") && props.minBetOrRaise !== null) {
            return parsedAmount() >= props.minBetOrRaise;
        }
        return true;
    };
    const adjustAmount = (delta: number) => {
        const next = Math.max(0, Math.min(props.maxBet, parsedAmount() + delta));
        props.setAmount(String(next));
    };
    const setAllInAmount = () => {
        props.onAction("all_in");
    };
    const submitPrimaryAction = () => {
        const action = primaryAction();
        if (!action) return;

        if (action === "bet" || action === "raise") {
            submitSizedAction(action);
            return;
        }

        props.onAction(action);
    };

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
                        data-testid="poker-primary-action-button"
                        disabled={!canSubmitPrimaryAction()}
                        onClick={submitPrimaryAction}
                        class="font-bebas text-[1rem] tracking-[.1em] border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] px-4 py-3 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        {primaryActionLabel()}
                    </button>
                </div>

                <div class="mt-4 flex flex-wrap items-center gap-2">
                    <For each={[-10, -50, -100, 10, 50, 100]}>
                        {(delta) => (
                            <button
                                type="button"
                                data-testid={`poker-adjust-${delta}`}
                                onClick={() => adjustAmount(delta)}
                                class="font-bebas text-[.9rem] tracking-[.08em] border-2 border-[#1a1a1a] bg-[#c9c0b0] text-[#1a1a1a] px-3 py-2 cursor-pointer transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
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
                        class="font-bebas text-[.9rem] tracking-[.08em] border-2 border-[#1a1a1a] bg-[#c0261a] text-[#ddd5c4] px-3 py-2 cursor-pointer transition-all duration-[120ms] disabled:opacity-35 disabled:cursor-default enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        All-in
                    </button>
                    <div class="flex items-center gap-2 ml-auto">
                        <input
                            type="number"
                            data-testid="poker-amount-input"
                            min={0}
                            max={props.maxBet || undefined}
                            value={props.amount}
                            onInput={(event) =>
                                props.setAmount(event.currentTarget.value)
                            }
                            class="w-28 min-w-0 border-2 border-[#1a1a1a] bg-[#c9c0b0] px-3 py-2 font-bebas text-[1rem] tracking-[.08em] text-[#1a1a1a] outline-none transition-[border-color] duration-150 focus:border-[#1a1a1a] placeholder:text-[#9a9080]"
                        />
                        <Show when={props.minBetOrRaise !== null}>
                            <div class="font-bebas text-[.65rem] tracking-[.14em] text-[#9a9080]">
                                MIN {props.minBetOrRaise}
                                <br />
                                MAX {props.maxBet}
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
};
