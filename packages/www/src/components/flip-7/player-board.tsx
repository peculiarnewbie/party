import { For, Show } from "solid-js";
import type { Component } from "solid-js";
import type { Flip7PlayerInfo, Flip7CardView } from "~/game/flip-7/views";

export const PlayerBoard: Component<{
    player: Flip7PlayerInfo;
    isCurrent: boolean;
    isWinner: boolean;
    large?: boolean;
}> = (props) => (
    <div
        class={`border-2 p-4 shadow-[4px_4px_0_#1a1a1a] ${
            props.isWinner
                ? "border-[#c0261a] bg-[#f2dfd8]"
                : props.isCurrent
                  ? "border-[#1a3a6e] bg-[#d9d8e6]"
                  : "border-[#1a1a1a] bg-[#c9c0b0]"
        }`}
    >
        <div class="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
                <div
                    class={`font-bebas tracking-[.08em] ${props.large ? "text-3xl" : "text-[1.25rem]"}`}
                >
                    {props.player.name}
                </div>
                <div
                    class={`font-bebas tracking-[.18em] text-[#5a5040] ${props.large ? "text-lg" : "text-[.68rem]"}`}
                >
                    {statusLabel(props.player.status)}
                </div>
            </div>
            <div class="text-right">
                <div
                    class={`font-bebas tracking-[.08em] ${props.large ? "text-3xl" : "text-[1.35rem]"}`}
                >
                    {props.player.totalScore}
                </div>
                <div
                    class={`font-bebas tracking-[.18em] text-[#5a5040] ${props.large ? "text-lg" : "text-[.68rem]"}`}
                >
                    ROUND {props.player.roundScore}
                </div>
            </div>
        </div>

        <div class="flex flex-wrap gap-2 mb-4">
            <For each={props.player.cards}>
                {(card) => <CardPill card={card} large={props.large} />}
            </For>
            <Show when={props.player.cards.length === 0}>
                <div class="font-bebas text-[.78rem] tracking-[.18em] text-[#9a9080]">
                    NO CARDS YET
                </div>
            </Show>
        </div>

        <div
            class={`flex flex-wrap gap-4 font-bebas tracking-[.16em] text-[#5a5040] ${props.large ? "text-lg" : "text-[.72rem]"}`}
        >
            <span>UNIQUE NUMBERS {props.player.uniqueNumberCount}</span>
            <Show when={props.player.hasSecondChance}>
                <span>SECOND CHANCE READY</span>
            </Show>
        </div>
    </div>
);

const CardPill: Component<{ card: Flip7CardView; large?: boolean }> = (
    props,
) => (
    <div
        class={`min-w-[54px] text-center border-2 px-3 py-2 font-bebas ${props.large ? "text-2xl" : "text-[1rem]"} tracking-[.08em] ${
            props.card.kind === "number"
                ? "border-[#1a3a6e] bg-[#f7f2de] text-[#1a1a1a]"
                : props.card.kind === "bonus"
                  ? "border-[#c0261a] bg-[#ffe0c2] text-[#7c2d12]"
                  : props.card.kind === "multiplier"
                    ? "border-[#c0261a] bg-[#ffd5ae] text-[#7c2d12]"
                    : "border-[#0f766e] bg-[#d7f1eb] text-[#115e59]"
        }`}
    >
        {props.card.label}
    </div>
);

function statusLabel(status: Flip7PlayerInfo["status"]) {
    if (status === "stayed") return "STAYED";
    if (status === "busted") return "BUSTED";
    if (status === "frozen") return "FROZEN";
    return "ACTIVE";
}
