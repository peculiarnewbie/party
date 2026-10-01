import { For, Match, Show, Switch } from "solid-js";
import type { Flip7ActionCardType, Flip7CardView } from "~/game/flip-7/schemas";

export const FLIP_7_ACTION_LABELS = {
    freeze: "FREEZE",
    flip_three: "FLIP THREE",
    second_chance: "SECOND CHANCE",
} as const;

export function Flip7ActionArt(props: {
    action: Flip7ActionCardType;
    class?: string;
}) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            class={props.class ?? "h-16 w-16"}
            fill="none"
            stroke="#1a1a1a"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <Switch>
                <Match when={props.action === "freeze"}>
                    <circle cx="50" cy="50" r="39" fill="#8fb3d9" />
                    <path
                        d="M50 17V83M22 34L78 66M22 66L78 34M39 24L50 34L61 24M39 76L50 66L61 76M23 46L37 43L32 29M68 71L63 57L77 54M23 54L37 57L32 71M68 29L63 43L77 46"
                        stroke="#f7f2de"
                        stroke-width="5"
                    />
                    <path d="M50 40L59 45V55L50 60L41 55V45Z" fill="#f7f2de" />
                </Match>
                <Match when={props.action === "flip_three"}>
                    <rect
                        x="16"
                        y="27"
                        width="38"
                        height="55"
                        rx="4"
                        fill="#e07a2e"
                        transform="rotate(-17 35 55)"
                    />
                    <rect
                        x="45"
                        y="25"
                        width="38"
                        height="55"
                        rx="4"
                        fill="#f5c542"
                        transform="rotate(17 64 53)"
                    />
                    <rect
                        x="30"
                        y="22"
                        width="40"
                        height="58"
                        rx="4"
                        fill="#f7f2de"
                    />
                    <path
                        d="M39 38H61M39 47H61M39 56H61"
                        stroke="#1a3a6e"
                        stroke-width="5"
                    />
                    <path
                        d="M20 18C32 5 60 5 76 16M65 8L77 16L68 23"
                        stroke="#0f766e"
                        stroke-width="5"
                    />
                </Match>
                <Match when={props.action === "second_chance"}>
                    <path
                        d="M50 12L81 23V49C81 69 68 82 50 91C32 82 19 69 19 49V23Z"
                        fill="#0f766e"
                    />
                    <path
                        d="M50 66L34 50C18 33 40 23 50 38C60 23 82 33 66 50Z"
                        fill="#f7f2de"
                    />
                    <path
                        d="M78 63C88 52 88 33 80 23M80 23L91 26M80 23L78 35"
                        stroke="#f5c542"
                        stroke-width="5"
                    />
                </Match>
            </Switch>
        </svg>
    );
}

export function Flip7CardFace(props: {
    card: Flip7CardView;
    compact?: boolean;
    index?: number;
}) {
    const accent = () =>
        props.card.kind === "number"
            ? "#1a3a6e"
            : props.card.kind === "action"
              ? "#0f766e"
              : "#c0261a";
    const caption = () =>
        props.card.kind === "number"
            ? "NUMBER"
            : props.card.kind === "bonus"
              ? "BONUS"
              : props.card.kind === "multiplier"
                ? "DOUBLE"
                : "SECOND CHANCE";
    return (
        <div
            role="img"
            aria-label={
                props.card.kind === "action"
                    ? "Second Chance card"
                    : `${caption().toLowerCase()} ${props.card.label}`
            }
            class={`relative shrink-0 overflow-hidden border-2 border-ink bg-cream text-ink shadow-ink-sm animate-deal-in ${props.compact ? "h-20 w-14" : "h-28 w-20"}`}
            style={{
                "animation-delay": `${Math.min(props.index ?? 0, 6) * 45}ms`,
                "--deal-from-y": "-18px",
                "--deal-rot": "-8deg",
            }}
        >
            <svg
                aria-hidden="true"
                viewBox="0 0 80 112"
                class="absolute inset-0 h-full w-full"
                fill="none"
            >
                <path
                    d="M5 20V5H20M60 5H75V20M5 92V107H20M60 107H75V92"
                    stroke={accent()}
                    stroke-width="2"
                />
                <Switch>
                    <Match when={props.card.kind === "number"}>
                        <circle cx="40" cy="51" r="25" fill={accent()} />
                        <path
                            d="M40 18V13M40 89V84M9 51H4M76 51H71M18 29L14 25M66 77L62 73M18 73L14 77M66 25L62 29"
                            stroke={accent()}
                            stroke-width="2"
                        />
                        <For
                            each={Array.from({
                                length: Math.min(props.card.value ?? 0, 12),
                            })}
                            keyed={false}
                        >
                            {(_, index) => (
                                <circle
                                    cx={20 + (index % 6) * 8}
                                    cy={94 + Math.floor(index / 6) * 6}
                                    r="2"
                                    fill={accent()}
                                />
                            )}
                        </For>
                    </Match>
                    <Match when={props.card.kind === "bonus"}>
                        <path
                            d="M40 17L48 28L62 25L65 39L76 47L66 58L69 72L55 75L47 86L36 76L22 79L19 65L8 57L18 46L15 32L29 29Z"
                            fill="#f5c542"
                            stroke="#1a1a1a"
                            stroke-width="2"
                        />
                    </Match>
                    <Match when={props.card.kind === "multiplier"}>
                        <rect
                            x="14"
                            y="25"
                            width="40"
                            height="54"
                            rx="3"
                            fill="#e07a2e"
                            stroke="#1a1a1a"
                            stroke-width="2"
                            transform="rotate(-12 34 52)"
                        />
                        <rect
                            x="27"
                            y="24"
                            width="40"
                            height="54"
                            rx="3"
                            fill="#f5c542"
                            stroke="#1a1a1a"
                            stroke-width="2"
                            transform="rotate(12 47 51)"
                        />
                    </Match>
                </Switch>
            </svg>
            <Switch>
                <Match when={props.card.kind === "action"}>
                    <div class="absolute inset-x-1 top-2 flex justify-center">
                        <Flip7ActionArt
                            action="second_chance"
                            class={props.compact ? "h-14 w-14" : "h-20 w-20"}
                        />
                    </div>
                </Match>
                <Match when={props.card.kind !== "action"}>
                    <span
                        class={`absolute inset-x-0 top-[25%] text-center font-bebas leading-none ${props.compact ? "text-3xl" : "text-5xl"} ${props.card.kind === "number" ? "text-cream" : "text-ink"}`}
                    >
                        {props.card.label}
                    </span>
                </Match>
            </Switch>
            <Show when={props.card.kind !== "number"}>
                <span
                    class={`absolute inset-x-0 bottom-1 text-center font-bebas tracking-wide ${props.compact ? "text-[7px]" : "text-[9px]"}`}
                >
                    {caption()}
                </span>
            </Show>
        </div>
    );
}
