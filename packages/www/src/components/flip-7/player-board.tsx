import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { AnimatedNumber } from "~/components/casino/animated-number";
import { Flip7ActionArt, Flip7CardFace } from "./flip-7-card";
import type { Flip7PlayerInfo } from "~/game/flip-7/views";

export function PlayerBoard(props: {
    player: Flip7PlayerInfo;
    isCurrent: boolean;
    isWinner: boolean;
    large?: boolean;
    compact?: boolean;
    index?: number;
    roundScore?: number;
}) {
    return (
        <div
            class={`min-w-0 border-3 border-ink p-3 shadow-ink ${props.isWinner || props.isCurrent ? "bg-sun" : "bg-cream"}`}
        >
            <div class="mb-3 flex items-center gap-3">
                <PlayerAvatar
                    id={props.player.id}
                    name={props.player.name}
                    index={props.index}
                />
                <div class="min-w-0 flex-1">
                    <h3
                        class={`break-words font-bebas leading-none ${props.large ? "text-3xl" : "text-2xl"}`}
                    >
                        {props.player.name}
                    </h3>
                    <span class="font-bebas text-sm tracking-wider text-muted">
                        {props.isWinner
                            ? "WINNER"
                            : statusLabel(props.player.status)}
                    </span>
                </div>
                <div class="shrink-0 text-right">
                    <AnimatedNumber
                        value={props.player.totalScore}
                        class="font-bebas text-3xl leading-none"
                    />
                    <span class="block font-bebas text-xs tracking-wider text-muted">
                        TOTAL
                    </span>
                </div>
            </div>
            <div class="mb-3 flex flex-wrap gap-2">
                <For each={props.player.cards} keyed={false}>
                    {(card, index) => (
                        <Flip7CardFace
                            card={card()}
                            compact={
                                props.compact ||
                                (props.large && props.player.cards.length > 8)
                            }
                            index={index}
                        />
                    )}
                </For>
                <Show when={props.player.cards.length === 0}>
                    <div
                        aria-label="No cards yet"
                        class="h-20 w-14 border-2 border-dashed border-ink/30"
                    />
                </Show>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-2 border-t-2 border-ink/20 pt-2">
                <div
                    class="flex items-center gap-1"
                    aria-label={`${props.player.uniqueNumberCount} of 7 unique numbers`}
                >
                    <For each={Array.from({ length: 7 })} keyed={false}>
                        {(_, index) => (
                            <span
                                class={`h-3 w-3 rounded-full border border-ink ${index < props.player.uniqueNumberCount ? "bg-teal" : "bg-paper"}`}
                            />
                        )}
                    </For>
                    <span class="ml-1 font-bebas text-sm">
                        {props.player.uniqueNumberCount}/7
                    </span>
                </div>
                <span
                    class="font-bebas text-xl"
                    aria-label={`Round score ${props.roundScore ?? props.player.roundScore}`}
                >
                    ROUND {props.roundScore ?? props.player.roundScore}
                </span>
                <Show when={props.player.hasSecondChance}>
                    <span aria-label="Second Chance ready">
                        <Flip7ActionArt
                            action="second_chance"
                            class="h-7 w-7"
                        />
                    </span>
                </Show>
            </div>
        </div>
    );
}

function statusLabel(status: Flip7PlayerInfo["status"]) {
    return status === "stayed"
        ? "BANKED"
        : status === "busted"
          ? "BUSTED"
          : status === "frozen"
            ? "FROZEN"
            : "ACTIVE";
}
