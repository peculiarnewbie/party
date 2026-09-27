import { TableButton, TablePanel } from "~/components/casino";
import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import type { PokerActionType } from "~/game/poker/types";

const STEP = 10;

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
            {
                id: "pot",
                label: "Pot",
                value: clamp(currentBet + potAfterCall),
            },
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
        <TablePanel testId="poker-action-controls" active={props.isMyTurn}>
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
                <div class="flex items-center justify-between mb-2">
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

                <div class="grid grid-cols-3 gap-2.5">
                    <TableButton
                        testId="poker-fold-button"
                        disabled={!hasAction("fold")}
                        onClick={() => props.onAction("fold")}
                        tone="paper"
                    >
                        Fold
                    </TableButton>
                    <TableButton
                        testId="poker-check-call-button"
                        disabled={checkCallAction() === null}
                        onClick={submitCheckCall}
                        tone="navy"
                    >
                        {checkCallLabel()}
                    </TableButton>
                    <TableButton
                        testId="poker-bet-raise-button"
                        disabled={!canSubmitBetRaise()}
                        onClick={submitBetRaise}
                        tone="tomato"
                        size="compact"
                    >
                        {betRaiseLabel()}
                        <Show when={canSubmitBetRaise()}>
                            <span class="ml-1">
                                {parsedAmount()}
                            </span>
                        </Show>
                    </TableButton>
                </div>

                <div class="mt-2 border-2 border-dashed border-[#9a9080] p-2">
                    <div class="flex items-center gap-2">
                        <TableButton
                            testId={`poker-adjust--${STEP}`}
                            label={`Decrease by ${STEP}`}
                            onClick={() => adjustAmount(-STEP)}
                            size="square"
                        >
                            −
                        </TableButton>
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
                        <TableButton
                            testId={`poker-adjust-${STEP}`}
                            label={`Increase by ${STEP}`}
                            onClick={() => adjustAmount(STEP)}
                            size="square"
                        >
                            +
                        </TableButton>
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
                    <div class="mt-2 grid grid-cols-4 gap-1.5">
                        <For each={presets()}>
                            {(preset) => (
                                <TableButton
                                    testId={`poker-preset-${preset.id}`}
                                    disabled={props.minBetOrRaise === null}
                                    onClick={() =>
                                        props.setAmount(String(preset.value))
                                    }
                                    size="compact"
                                    tone={
                                        parsedAmount() === preset.value
                                            ? "navy"
                                            : "cream"
                                    }
                                >
                                    {preset.label}
                                </TableButton>
                            )}
                        </For>
                        <TableButton
                            testId="poker-all-in-button"
                            disabled={!hasAction("all_in")}
                            onClick={() => props.onAction("all_in")}
                            size="compact"
                            tone="dark"
                        >
                            All-in
                        </TableButton>
                    </div>

                </div>
            </Show>
        </TablePanel>
    );
};
