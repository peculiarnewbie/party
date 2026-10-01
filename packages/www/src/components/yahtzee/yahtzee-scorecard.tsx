import { Dynamic } from "@solidjs/web";
import { UPPER_BONUS_THRESHOLD } from "~/game/yahtzee/engine";
import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { CategoryArt } from "./category-art";
import { CATEGORY_LABELS, SCORING_CATEGORIES } from "~/game/yahtzee/types";
import type { ScoringCategory } from "~/game/yahtzee/types";
import type { YahtzeePlayerInfo } from "~/game/yahtzee/views";

export function YahtzeeScorecard(props: {
    players: readonly YahtzeePlayerInfo[];
    currentPlayerId: string;
    myId?: string | null;
    phone?: boolean;
    canChoose?: boolean;
    potentialScores?: Partial<Record<ScoringCategory, number>> | null;
    suggested?: readonly ScoringCategory[];
    selected?: ScoringCategory | null;
    onChoose?: (category: ScoringCategory) => void;
}) {
    const mine = () => props.players.find((player) => player.id === props.myId);
    const clickable = (player: YahtzeePlayerInfo, category: ScoringCategory) =>
        !!props.canChoose &&
        player.id === props.myId &&
        player.scorecard[category] === undefined;
    const value = (player: YahtzeePlayerInfo, category: ScoringCategory) =>
        player.scorecard[category] ??
        (player.id === props.myId && props.canChoose
            ? props.potentialScores?.[category]
            : undefined);
    const suggested = (player: YahtzeePlayerInfo, category: ScoringCategory) =>
        clickable(player, category) && props.suggested?.includes(category);
    const selected = (player: YahtzeePlayerInfo, category: ScoringCategory) =>
        clickable(player, category) && props.selected === category;
    const choose = (player: YahtzeePlayerInfo, category: ScoringCategory) => {
        if (clickable(player, category)) props.onChoose?.(category);
    };
    return (
        <section
            data-testid="yahtzee-scorecard"
            class="min-w-0 border-3 border-ink bg-cream p-3 shadow-ink"
        >
            <Show
                when={props.phone && mine()}
                fallback={
                    <div class="overflow-x-auto">
                        <table class="w-full border-collapse text-center">
                            <thead>
                                <tr>
                                    <th class="w-28 text-left font-bebas text-sm tracking-wide text-muted">
                                        SCORECARD
                                    </th>
                                    <For each={props.players} keyed={false}>
                                        {(player) => (
                                            <th
                                                class={`min-w-16 px-1 pb-2 ${player().id === props.currentPlayerId ? "bg-sun" : ""}`}
                                            >
                                                <div class="flex flex-col items-center gap-1">
                                                    <PlayerAvatar
                                                        id={player().id}
                                                        name={player().name}
                                                        class="h-7 w-7 text-lg"
                                                    />
                                                    <span class="max-w-24 truncate font-bebas text-lg">
                                                        {player().name}
                                                    </span>
                                                </div>
                                            </th>
                                        )}
                                    </For>
                                </tr>
                            </thead>
                            <tbody>
                                <For each={SCORING_CATEGORIES} keyed={false}>
                                    {(category) => (
                                        <tr class="border-t border-ink/20">
                                            <th class="text-left">
                                                <div class="flex items-center gap-1">
                                                    <CategoryArt
                                                        category={category()}
                                                        class="h-6 w-6"
                                                    />
                                                    <span class="font-bebas text-sm">
                                                        {
                                                            CATEGORY_LABELS[
                                                                category()
                                                            ]
                                                        }
                                                    </span>
                                                </div>
                                            </th>
                                            <For
                                                each={props.players}
                                                keyed={false}
                                            >
                                                {(player) => (
                                                    <td>
                                                        <Dynamic
                                                            component={
                                                                props.myId
                                                                    ? "button"
                                                                    : "span"
                                                            }
                                                            type={
                                                                props.myId
                                                                    ? "button"
                                                                    : undefined
                                                            }
                                                            data-testid={`scorecard-cell-${player().id}-${category()}`}
                                                            data-suggested={String(
                                                                !!suggested(
                                                                    player(),
                                                                    category(),
                                                                ),
                                                            )}
                                                            data-selected-claim={String(
                                                                selected(
                                                                    player(),
                                                                    category(),
                                                                ),
                                                            )}
                                                            aria-label={`${player().name} · ${CATEGORY_LABELS[category()]}${value(player(), category()) !== undefined ? ` · ${value(player(), category())} points` : ""}`}
                                                            disabled={
                                                                !clickable(
                                                                    player(),
                                                                    category(),
                                                                )
                                                            }
                                                            onClick={() =>
                                                                choose(
                                                                    player(),
                                                                    category(),
                                                                )
                                                            }
                                                            class={`inline-flex min-h-11 w-full items-center justify-center font-bebas text-xl focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-navy ${selected(player(), category()) || suggested(player(), category()) ? "bg-sun" : clickable(player(), category()) ? "bg-kraft" : ""} ${player().scorecard[category()] !== undefined ? "text-ink" : "text-teal"}`}
                                                        >
                                                            <Show
                                                                when={
                                                                    value(
                                                                        player(),
                                                                        category(),
                                                                    ) !==
                                                                    undefined
                                                                }
                                                                fallback={
                                                                    <svg
                                                                        aria-hidden="true"
                                                                        class="mx-auto h-4 w-4"
                                                                        viewBox="0 0 16 16"
                                                                    >
                                                                        <path
                                                                            d="M4 8h8"
                                                                            stroke="#9a9080"
                                                                            stroke-width="2"
                                                                        />
                                                                    </svg>
                                                                }
                                                            >
                                                                {value(
                                                                    player(),
                                                                    category(),
                                                                )}
                                                            </Show>
                                                        </Dynamic>
                                                    </td>
                                                )}
                                            </For>
                                        </tr>
                                    )}
                                </For>
                                <tr class="border-t-2 border-ink">
                                    <th class="py-2 text-left font-bebas text-sm">
                                        UPPER BONUS
                                    </th>
                                    <For each={props.players} keyed={false}>
                                        {(player) => (
                                            <td class="font-bebas text-sm text-teal">
                                                {player().upperTotal}/
                                                {UPPER_BONUS_THRESHOLD}
                                                <Show
                                                    when={
                                                        player().upperBonus > 0
                                                    }
                                                >
                                                    {" "}
                                                    +{player().upperBonus}
                                                </Show>
                                            </td>
                                        )}
                                    </For>
                                </tr>
                                <Show
                                    when={props.players.some(
                                        (player) =>
                                            player.yahtzeeBonus > 0 ||
                                            player.penaltyPoints > 0,
                                    )}
                                >
                                    <tr class="border-t border-ink/20">
                                        <th class="py-2 text-left font-bebas text-sm">
                                            BONUS / PENALTY
                                        </th>
                                        <For each={props.players} keyed={false}>
                                            {(player) => (
                                                <td class="font-bebas text-sm">
                                                    <span class="text-teal">
                                                        +
                                                        {player().yahtzeeBonus *
                                                            100}
                                                    </span>{" "}
                                                    /{" "}
                                                    <span class="text-tomato">
                                                        −
                                                        {player().penaltyPoints}
                                                    </span>
                                                </td>
                                            )}
                                        </For>
                                    </tr>
                                </Show>
                                <tr class="border-t-2 border-ink">
                                    <th class="py-2 text-left font-bebas text-xl">
                                        TOTAL
                                    </th>
                                    <For each={props.players} keyed={false}>
                                        {(player) => (
                                            <td class="font-bebas text-2xl">
                                                {player().totalScore}
                                            </td>
                                        )}
                                    </For>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                }
            >
                {(player) => (
                    <>
                        <div class="mb-3 flex items-center justify-between gap-2 font-bebas">
                            <span>YOUR SCORECARD</span>
                            <span class="text-sm text-teal">
                                UPPER {player().upperTotal}/
                                {UPPER_BONUS_THRESHOLD}
                                <Show when={player().upperBonus}>
                                    {" "}
                                    +{player().upperBonus}
                                </Show>
                            </span>
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <For each={SCORING_CATEGORIES} keyed={false}>
                                {(category) => (
                                    <button
                                        type="button"
                                        disabled={
                                            !clickable(player(), category())
                                        }
                                        onClick={() =>
                                            choose(player(), category())
                                        }
                                        class={`flex min-h-16 min-w-0 items-center gap-2 border-2 border-ink p-2 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-navy ${suggested(player(), category()) ? "bg-sun" : clickable(player(), category()) ? "bg-kraft" : "bg-paper"}`}
                                    >
                                        <CategoryArt
                                            category={category()}
                                            class="h-7 w-7"
                                        />
                                        <span class="min-w-0 flex-1 font-bebas text-sm leading-tight">
                                            {CATEGORY_LABELS[category()]}
                                        </span>
                                        <span
                                            data-testid={`scorecard-cell-${player().id}-${category()}`}
                                            data-suggested={String(
                                                !!suggested(
                                                    player(),
                                                    category(),
                                                ),
                                            )}
                                            class="font-bebas text-xl"
                                        >
                                            {value(player(), category())}
                                        </span>
                                    </button>
                                )}
                            </For>
                        </div>
                    </>
                )}
            </Show>
        </section>
    );
}
