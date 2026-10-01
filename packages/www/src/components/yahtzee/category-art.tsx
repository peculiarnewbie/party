import { For, Match, Switch } from "solid-js";
import { SvgDice } from "~/assets/svg-dice";
import type { ScoringCategory } from "~/game/yahtzee/types";
const UPPER_FACES = {
    ones: 1,
    twos: 2,
    threes: 3,
    fours: 4,
    fives: 5,
    sixes: 6,
} as const;

export function CategoryArt(props: {
    category: ScoringCategory;
    class?: string;
}) {
    const face = () => UPPER_FACES[props.category as keyof typeof UPPER_FACES];
    return (
        <span
            aria-hidden="true"
            class={`inline-flex shrink-0 items-center justify-center ${props.class ?? "h-8 w-8"}`}
        >
            <Switch>
                <Match when={face()}>
                    <SvgDice
                        side={face()}
                        color="#f7f2de"
                        dotColor="#1a1a1a"
                        size={28}
                    />
                </Match>
                <Match when={!face()}>
                    <svg
                        viewBox="0 0 64 64"
                        class="h-full w-full"
                        fill="none"
                        stroke="#1a1a1a"
                        stroke-width="2"
                        stroke-linejoin="round"
                    >
                        <Switch>
                            <Match
                                when={
                                    props.category === "three_of_a_kind" ||
                                    props.category === "four_of_a_kind"
                                }
                            >
                                <For
                                    each={Array.from({
                                        length:
                                            props.category === "three_of_a_kind"
                                                ? 3
                                                : 4,
                                    })}
                                    keyed={false}
                                >
                                    {(_, index) => (
                                        <g
                                            transform={`translate(${6 + (index % 2) * 27} ${5 + Math.floor(index / 2) * 27})`}
                                        >
                                            <rect
                                                width="23"
                                                height="23"
                                                rx="3"
                                                fill="#f5c542"
                                            />
                                            <circle
                                                cx="11.5"
                                                cy="11.5"
                                                r="3"
                                                fill="#1a1a1a"
                                            />
                                        </g>
                                    )}
                                </For>
                            </Match>
                            <Match when={props.category === "full_house"}>
                                <path
                                    d="M4 28L32 6L60 28V58H4Z"
                                    fill="#f5c542"
                                />
                                <path d="M25 58V34H39V58" fill="#0f766e" />
                                <circle cx="18" cy="30" r="3" fill="#1a1a1a" />
                                <circle cx="32" cy="23" r="3" fill="#1a1a1a" />
                                <circle cx="46" cy="30" r="3" fill="#1a1a1a" />
                            </Match>
                            <Match
                                when={
                                    props.category === "small_straight" ||
                                    props.category === "large_straight"
                                }
                            >
                                <For
                                    each={Array.from({
                                        length:
                                            props.category === "small_straight"
                                                ? 4
                                                : 5,
                                    })}
                                    keyed={false}
                                >
                                    {(_, index) => (
                                        <rect
                                            x={3 + index * 11}
                                            y={40 - index * 7}
                                            width="14"
                                            height="19"
                                            rx="2"
                                            fill={
                                                index % 2
                                                    ? "#f5c542"
                                                    : "#8fb3d9"
                                            }
                                        />
                                    )}
                                </For>
                                <path
                                    d="M6 21L50 4M43 2L53 3L49 13"
                                    stroke="#0f766e"
                                    stroke-width="3"
                                />
                            </Match>
                            <Match when={props.category === "yahtzee"}>
                                <path
                                    d="M32 2L40 19L59 21L45 35L49 55L32 45L15 55L19 35L5 21L24 19Z"
                                    fill="#f5c542"
                                />
                                <circle cx="32" cy="29" r="8" fill="#0f766e" />
                            </Match>
                            <Match when={props.category === "chance"}>
                                <rect
                                    x="4"
                                    y="7"
                                    width="28"
                                    height="32"
                                    rx="4"
                                    fill="#8fb3d9"
                                />
                                <rect
                                    x="31"
                                    y="25"
                                    width="29"
                                    height="32"
                                    rx="4"
                                    fill="#f5c542"
                                />
                                <circle cx="17" cy="23" r="3" fill="#1a1a1a" />
                                <circle cx="40" cy="34" r="3" fill="#1a1a1a" />
                                <circle cx="51" cy="46" r="3" fill="#1a1a1a" />
                                <path
                                    d="M10 52H24M17 45V59"
                                    stroke="#0f766e"
                                    stroke-width="3"
                                />
                            </Match>
                        </Switch>
                    </svg>
                </Match>
            </Switch>
        </span>
    );
}
