import { Show } from "solid-js";
import type { SpiceType, SpicyCard } from "~/game/spicy";

export const SPICE_LABELS = {
    chili: "Chili",
    wasabi: "Wasabi",
    pepper: "Pepper",
} as const;
export function spicyCardLabel(
    card: SpicyCard | { kind: "standard"; number: number; spice: SpiceType },
) {
    return card.kind === "standard"
        ? `${card.number} ${SPICE_LABELS[card.spice]}`
        : card.kind === "wild_number"
          ? "Wild Number"
          : "Wild Spice";
}

export function SpiceArt(props: {
    spice: SpiceType | "wild_number" | "wild_spice";
    class?: string;
}) {
    return (
        <img
            src={`/cards/spicy/${props.spice.replaceAll("_", "-")}.svg`}
            alt=""
            aria-hidden="true"
            width="120"
            height="120"
            class={props.class ?? "h-20 w-20"}
        />
    );
}

export function SpicyCardFace(props: {
    card: SpicyCard | { kind: "standard"; number: number; spice: SpiceType };
    large?: boolean;
}) {
    const spice = () =>
        props.card.kind === "standard" ? props.card.spice : props.card.kind;
    return (
        <div
            aria-label={spicyCardLabel(props.card)}
            class={`relative flex flex-col items-center justify-between border-2 border-ink bg-cream p-2 text-ink shadow-ink-sm ${props.large ? "h-56 w-40" : "h-36 w-24"}`}
        >
            <div
                class={`w-full font-bebas leading-none ${props.large ? "text-5xl" : "text-3xl"}`}
            >
                <Show
                    when={
                        props.card.kind === "standard"
                            ? props.card.number
                            : null
                    }
                    fallback={<span class="text-sun">★</span>}
                >
                    {(number) => <span>{number()}</span>}
                </Show>
            </div>
            <SpiceArt
                spice={spice()}
                class={props.large ? "h-28 w-28" : "h-20 w-20"}
            />
            <span class="font-bebas text-sm tracking-wide">
                {props.card.kind === "standard"
                    ? SPICE_LABELS[props.card.spice]
                    : props.card.kind === "wild_number"
                      ? "ANY NUMBER"
                      : "ANY SPICE"}
            </span>
        </div>
    );
}

export function TrophyArt(props: { class?: string }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 40 40"
            class={props.class ?? "h-7 w-7"}
            fill="#f5c542"
            stroke="#1a1a1a"
            stroke-width="2"
            stroke-linejoin="round"
        >
            <path d="M10 6H30V16C30 29 10 29 10 16Z" />
            <path
                d="M10 9H4V14C4 20 9 21 13 21M30 9H36V14C36 20 31 21 27 21"
                fill="none"
            />
            <path d="M20 26V33M12 35H28" stroke-width="4" />
        </svg>
    );
}
