import { Show } from "solid-js";
import { SvgDice } from "~/assets/svg-dice";

export function TableDie(props: {
    value: number;
    size?: number;
    held?: boolean;
    hidden?: boolean;
}) {
    return (
        <span
            role="img"
            aria-label={
                props.hidden
                    ? "Hidden die"
                    : props.value > 0
                      ? `Die showing ${props.value}`
                      : "Unrolled die"
            }
            class={`inline-flex shrink-0 rounded-lg border-2 border-ink shadow-ink-sm ${props.held ? "bg-sun" : "bg-cream"} ${props.size === undefined ? "h-12 w-12 sm:h-16 sm:w-16 [&>svg]:h-full [&>svg]:w-full" : ""}`}
        >
            <Show
                when={!props.hidden && props.value > 0}
                fallback={
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 48 48"
                        width={props.size ?? 44}
                        height={props.size ?? 44}
                    >
                        <rect
                            x="10"
                            y="10"
                            width="28"
                            height="28"
                            rx="4"
                            fill="none"
                            stroke="#1a1a1a"
                            stroke-width="2"
                            stroke-dasharray="3 4"
                        />
                        <Show when={props.hidden}>
                            <path
                                d="M18 23V19a6 6 0 0 1 12 0v4M17 23h14v12H17Z"
                                fill="#f5c542"
                                stroke="#1a1a1a"
                                stroke-width="2"
                            />
                        </Show>
                    </svg>
                }
            >
                <SvgDice
                    side={props.value as 1 | 2 | 3 | 4 | 5 | 6}
                    size={props.size ?? 44}
                    color={props.held ? "#f5c542" : "#f7f2de"}
                    dotColor="#1a1a1a"
                />
            </Show>
        </span>
    );
}
