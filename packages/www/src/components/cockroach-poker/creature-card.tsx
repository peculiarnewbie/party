import { Show } from "solid-js";
import { CREATURE_LABELS } from "./creatures";
import type { CreatureType } from "~/game/cockroach-poker/schemas";

export function CreatureArt(props: { creature: CreatureType; class?: string }) {
    return (
        <img
            src={`/cards/cockroach-poker/${props.creature.replaceAll("_", "-")}.svg`}
            alt=""
            aria-hidden="true"
            width="120"
            height="120"
            draggable={false}
            class={props.class ?? "h-9 w-9"}
        />
    );
}

export function CreatureCard(props: {
    creature: CreatureType;
    count?: number;
    large?: boolean;
    hero?: boolean;
    framed?: boolean;
}) {
    return (
        <span
            class={`relative flex min-w-0 flex-col items-center justify-center gap-1 text-ink ${props.framed === false ? "w-full" : "border-2 border-ink bg-card p-2 shadow-ink-sm"}`}
        >
            <CreatureArt
                creature={props.creature}
                class={
                    props.hero
                        ? "h-40 w-40"
                        : props.large
                          ? "h-24 w-24"
                          : "h-9 w-9"
                }
            />
            <span
                class={`font-bebas leading-none ${props.hero ? "text-3xl" : props.large ? "text-2xl" : "text-sm"}`}
            >
                {CREATURE_LABELS[props.creature]}
            </span>
            <Show when={props.count !== undefined}>
                <span class="absolute right-0 top-0 bg-cream px-1 font-bebas text-sm text-ink">
                    ×{props.count}
                </span>
            </Show>
        </span>
    );
}
