import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { PokerActionType } from "~/game/poker/types";

const STEP = 10;

const PRESS =
    "border-2 border-[#1a1a1a] font-bebas shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] enabled:active:translate-x-[3px] enabled:active:translate-y-[3px] enabled:active:shadow-none disabled:opacity-35 disabled:shadow-none";

export const ActionControls: Component<{
    legalActions: PokerActionType[];
    callAmount: number;
    minBetOrRaise: number | null;
    maxBet: number;
    stack: number;
    amount: string;
    setAmount: (value: string) => void;
    isSpectator: boolean;
    isMyTurn: boolean;
    onAction: (type: PokerActionType, amount?: number) => void;
    pot?: number;
    committed?: number;
    waitingFor?: string;
}> = (props) => {
    const hasAction = (type: PokerActionType) =>
        props.legalActions.includes(type);
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
    const clamp = (value: number) =>
        Math.max(
            props.minBetOrRaise ?? 0,
            Math.min(props.maxBet || value, Math.round(value)),
        );
    const adjustAmount = (delta: number) => {
        const next = Math.max(
            0,
            Math.min(props.maxBet, parsedAmount() + delta),
        );
        props.setAmount(String(next));
    };
    const presets = () => {
        const pot = props.pot ?? 0;
        const currentBet = (props.committed ?? 0) + props.callAmount;
        const potAfterCall = pot + props.callAmount;
        return [
            { id: "min", label: "Min", value: props.minBetOrRaise ?? 0 },
            {
                id: "half",
                label: "½ Pot",
                value: clamp(currentBet + potAfterCall / 2),
            },
            { id: "pot", label: "Pot", value: clamp(currentBet + potAfterCall) },
        ];
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
            class={`border-[3px] border-[#1a1a1a] p-4 transition-all duration-300 ${props.isMyTurn ? "bg-[#f7f2de] shadow-[6px_6px_0_#c0261a]" : "bg-[#c9c0b0] shadow-[4px_4px_0_#1a1a1a]"}`}
        >
            <Show
                when={!props.isSpectator}
                fallback={
                    <div
                        data-testid="poker-spectator-copy"
                        class="font-bebas text-lg tracking-[.12em] text-[#5a5040] text-center"
                    >
                        Spectators can follow the board and log, but cannot act.
                    </div>
                }
            >
                <div class="flex items-center justify-between mb-3">
                    <div class="font-bebas tracking-[.2em] text-[#5a5040] text-sm">
                        Stack{" "}
                        <span class="text-[#1a3a6e] text-xl tracking-wider ml-1">
                            {props.stack}
                        </span>
                    </div>
                    <Show
                        when={props.isMyTurn}
                        fallback={
                            <div class="font-bebas tracking-[.16em] text-sm text-[#5a5040]">
                                {props.waitingFor
                                    ? `Waiting for ${props.waitingFor}…`
                                    : "Waiting…"}
                            </div>
                        }
                    >
                        <div class="border-2 border-[#1a1a1a] bg-[#c0261a] px-2.5 pt-1 pb-0.5 font-bebas tracking-[.18em] text-sm text-[#f7f2de] shadow-[2px_2px_0_#1a1a1a] animate-stamp-in">
                            YOUR MOVE
                        </div>
                    </Show>
                </div>

                <div class="grid grid-cols-2 gap-2.5">
                    <button
                        type="button"
                        data-testid="poker-fold-button"
                        disabled={!hasAction("fold")}
                        onClick={() => props.onAction("fold")}
                        class={`min-h-14 pt-1 bg-[#ddd5c4] text-2xl tracking-[.12em] text-[#c0261a] ${PRESS}`}
                    >
                        Fold
                    </button>
                    <button
                        type="button"
                        data-testid="poker-check-call-button"
                        disabled={checkCallAction() === null}
                        onClick={submitCheckCall}
                        class={`min-h-14 pt-1 bg-[#1a3a6e] text-2xl tracking-[.1em] text-[#f7f2de] ${PRESS}`}
                    >
                        {checkCallLabel()}
                    </button>
                </div>

                <div class="mt-4 border-2 border-dashed border-[#9a9080] p-3">
                    <div class="flex items-center gap-2">
                        <button
                            type="button"
                            data-testid={`poker-adjust--${STEP}`}
                            aria-label={`Decrease by ${STEP}`}
                            onClick={() => adjustAmount(-STEP)}
                            class={`w-11 h-11 shrink-0 bg-[#f7f2de] text-2xl text-[#1a1a1a] ${PRESS}`}
                        >
                            −
                        </button>
                        <input
                            type="range"
                            aria-label="Bet amount"
                            min={props.minBetOrRaise ?? 0}
                            max={props.maxBet || 0}
                            step={5}
                            value={parsedAmount()}
                            disabled={props.minBetOrRaise === null}
                            onInput={(event) =>
                                props.setAmount(event.currentTarget.value)
                            }
                            class="flex-1 min-w-0 accent-[#c0261a] disabled:opacity-30"
                        />
                        <button
                            type="button"
                            data-testid={`poker-adjust-${STEP}`}
                            aria-label={`Increase by ${STEP}`}
                            onClick={() => adjustAmount(STEP)}
                            class={`w-11 h-11 shrink-0 bg-[#f7f2de] text-2xl text-[#1a1a1a] ${PRESS}`}
                        >
                            +
                        </button>
                        <input
                            type="number"
                            data-testid="poker-amount-input"
                            aria-label="Amount"
                            min={0}
                            max={props.maxBet || undefined}
                            value={props.amount}
                            onInput={(event) =>
                                props.setAmount(event.currentTarget.value)
                            }
                            class="w-20 min-w-0 border-2 border-[#b8ae9e] bg-[#f7f2de] px-2 pt-2 pb-1 text-center font-bebas text-xl tracking-wider text-[#1a1a1a] outline-none focus:border-[#1a1a1a]"
                        />
                    </div>
                    <div class="mt-2.5 grid grid-cols-4 gap-1.5">
                        <For each={presets()}>
                            {(preset) => (
                                <button
                                    type="button"
                                    data-testid={`poker-preset-${preset.id}`}
                                    disabled={props.minBetOrRaise === null}
                                    onClick={() =>
                                        props.setAmount(String(preset.value))
                                    }
                                    class={`min-h-10 pt-0.5 tracking-wider text-base ${PRESS} ${parsedAmount() === preset.value ? "bg-[#1a3a6e] text-[#f7f2de]" : "bg-[#f7f2de] text-[#1a1a1a]"}`}
                                >
                                    {preset.label}
                                </button>
                            )}
                        </For>
                        <button
                            type="button"
                            data-testid="poker-all-in-button"
                            disabled={!hasAction("all_in")}
                            onClick={() => props.onAction("all_in")}
                            class={`min-h-10 pt-0.5 bg-[#1a1a1a] tracking-wider text-base text-[#f5c542] ${PRESS}`}
                        >
                            All-in
                        </button>
                    </div>
                    <button
                        type="button"
                        data-testid="poker-bet-raise-button"
                        disabled={!canSubmitBetRaise()}
                        onClick={submitBetRaise}
                        class={`mt-3 w-full min-h-14 pt-1 bg-[#c0261a] text-2xl tracking-[.1em] text-[#f7f2de] ${PRESS}`}
                    >
                        {betRaiseLabel()}
                        <Show when={canSubmitBetRaise()}>
                            <span class="ml-2">
                                {betRaiseAction() === "raise" ? "to " : ""}
                                {parsedAmount()}
                            </span>
                        </Show>
                    </button>
                </div>
            </Show>
        </div>
    );
};
