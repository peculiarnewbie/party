import { createMemo, Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { Card } from "~/assets/card-deck/types";

const CARD_EDGE =
    "rounded-[7%/5%] shadow-[0_0_0_1.5px_#1a1a1a,0_3px_0_1.5px_#1a1a1a]";

export function TableCard(props: {
    card: Card | null | undefined;
    class?: string;
    delay?: number;
    animate?: boolean;
    dimmed?: boolean;
    highlight?: boolean;
    variant?: "classic" | "jumbo";
    testId?: string;
}) {
    let sawBack = false;
    const card = createMemo(() => props.card ?? null, {
        equals: (previous, next) =>
            previous?.rank === next?.rank && previous?.suit === next?.suit,
    });
    const animation = (kind: "deal" | "flip") =>
        props.animate === false
            ? ""
            : kind === "flip"
              ? "animate-flip-in"
              : "animate-deal-in";
    const delayStyle = () =>
        props.delay ? { "animation-delay": `${props.delay}ms` } : {};

    return (
        <div
            data-testid={props.testId}
            class={`relative shrink-0 aspect-[250/350] transition-[filter,opacity,translate] duration-500 ${props.dimmed ? "opacity-45 grayscale" : ""} ${props.highlight ? "-translate-y-[12%]" : ""} ${props.class ?? ""}`}
        >
            <Show
                when={card()}
                keyed
                fallback={(() => {
                    sawBack = true;
                    return (
                        <div
                            class={`absolute inset-0 overflow-hidden ${CARD_EDGE} ${animation("deal")}`}
                            style={delayStyle()}
                        >
                            <CardBack
                                class="w-full"
                                color="#c0261a"
                                pattern="#f7f2de"
                            />
                        </div>
                    );
                })()}
            >
                {(visible) => (
                    <div
                        class={`absolute inset-0 overflow-hidden bg-[#fffdf6] ${CARD_EDGE} ${animation(sawBack ? "flip" : "deal")} ${props.highlight ? "!shadow-[0_0_0_1.5px_#1a1a1a,0_0_0_5px_#f5c542,0_4px_0_5px_#1a1a1a]" : ""}`}
                        style={delayStyle()}
                    >
                        <PlayingCard
                            suit={visible.suit}
                            rank={visible.rank}
                            variant={props.variant ?? "jumbo"}
                            class="w-full"
                        />
                    </div>
                )}
            </Show>
        </div>
    );
}

export function CardSlot(props: { class?: string; label?: string }) {
    return (
        <div
            class={`shrink-0 aspect-[250/350] rounded-[7%/5%] border-2 border-dashed border-[#f7f2de]/30 bg-[#1a1a1a]/10 flex items-center justify-center ${props.class ?? ""}`}
        >
            <Show when={props.label}>
                <span class="font-bebas tracking-[.2em] text-[#f7f2de]/30 text-sm">
                    {props.label}
                </span>
            </Show>
        </div>
    );
}
