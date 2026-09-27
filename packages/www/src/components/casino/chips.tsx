import { For, Show } from "solid-js";
import { AnimatedNumber } from "./animated-number";

const DENOMINATIONS = [
    { value: 1000, color: "#f5c542", edge: "#1a1a1a", text: "#1a1a1a" },
    { value: 500, color: "#6b3a78", edge: "#f7f2de", text: "#f7f2de" },
    { value: 100, color: "#1a1a1a", edge: "#f7f2de", text: "#f7f2de" },
    { value: 25, color: "#0f766e", edge: "#f7f2de", text: "#f7f2de" },
    { value: 10, color: "#1a3a6e", edge: "#f7f2de", text: "#f7f2de" },
    { value: 5, color: "#c0261a", edge: "#f7f2de", text: "#f7f2de" },
    { value: 1, color: "#f7f2de", edge: "#1a3a6e", text: "#1a1a1a" },
] as const;

type Denomination = (typeof DENOMINATIONS)[number];

export function chipStyle(value: number): Denomination {
    return (
        DENOMINATIONS.find((denomination) => value >= denomination.value) ??
        DENOMINATIONS[DENOMINATIONS.length - 1]
    );
}

export function breakIntoChips(amount: number, maxChips = 12): number[] {
    const chips: number[] = [];
    let remaining = Math.max(0, Math.floor(amount));
    for (const denomination of DENOMINATIONS) {
        while (remaining >= denomination.value && chips.length < maxChips) {
            chips.push(denomination.value);
            remaining -= denomination.value;
        }
    }
    return chips.reverse();
}

export function Chip(props: {
    value: number;
    size?: number;
    label?: string;
    class?: string;
}) {
    const style = () => chipStyle(props.value);
    const size = () => props.size ?? 40;
    return (
        <svg
            width={size()}
            height={size()}
            viewBox="0 0 100 100"
            class={props.class}
            aria-hidden="true"
        >
            <circle
                cx="50"
                cy="50"
                r="46"
                fill={style().color}
                stroke="#1a1a1a"
                stroke-width="6"
            />
            <circle
                cx="50"
                cy="50"
                r="36"
                fill="none"
                stroke={style().edge}
                stroke-width="9"
                stroke-dasharray="14.1 14.1"
            />
            <circle
                cx="50"
                cy="50"
                r="25"
                fill={style().color}
                stroke={style().edge}
                stroke-width="2.5"
            />
            <Show when={props.label}>
                <text
                    x="50"
                    y="52"
                    text-anchor="middle"
                    dominant-baseline="middle"
                    font-family="'Bebas Neue', sans-serif"
                    font-size={(props.label?.length ?? 0) > 3 ? "24" : "30"}
                    fill={style().text}
                >
                    {props.label}
                </text>
            </Show>
        </svg>
    );
}

export function ChipStack(props: {
    amount: number;
    size?: number;
    showLabel?: boolean;
    labelClass?: string;
    class?: string;
    columns?: number;
    testId?: string;
}) {
    const size = () => props.size ?? 28;
    const columns = () => {
        const chips = breakIntoChips(props.amount, 24);
        const count = Math.min(props.columns ?? 3, Math.ceil(chips.length / 8));
        const groups: number[][] = Array.from(
            { length: Math.max(1, count) },
            () => [],
        );
        const byValue = [...chips].sort((a, b) => b - a);
        byValue.forEach((chip, index) => {
            groups[index % groups.length].push(chip);
        });
        return groups.map((group) => group.slice(0, 8).reverse());
    };
    return (
        <div
            data-testid={props.testId}
            class={`flex flex-col items-center gap-1 ${props.class ?? ""}`}
        >
            <Show when={props.amount > 0}>
                <div class="flex items-end gap-0.5">
                    <For each={columns()} keyed={false}>
                        {(column) => (
                            <div
                                class="relative"
                                style={{
                                    width: `${size()}px`,
                                    height: `${size() + (column().length - 1) * size() * 0.2}px`,
                                }}
                            >
                                <For each={column()} keyed={false}>
                                    {(chip, index) => (
                                        <div
                                            class="absolute left-0 drop-shadow-[0_2px_0_#1a1a1a]"
                                            style={{
                                                bottom: `${index * size() * 0.2}px`,
                                            }}
                                        >
                                            <Chip
                                                value={chip()}
                                                size={size()}
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                        )}
                    </For>
                </div>
            </Show>
            <Show when={props.showLabel !== false && props.amount > 0}>
                <span
                    class={`font-bebas tracking-wider leading-none rounded-[.3em] border-2 border-[#1a1a1a] bg-[#f7f2de] px-[.4em] pt-[.15em] pb-[.05em] text-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] ${props.labelClass ?? "text-base"}`}
                >
                    <AnimatedNumber value={props.amount} />
                </span>
            </Show>
        </div>
    );
}
