import * as stylex from "@stylexjs/stylex";
import { colors, fonts } from "~/styles/tokens.stylex";
import { createMemo, Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { Card } from "~/assets/card-deck/types";

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
            class={`${stylex.attrs(styles.card, props.dimmed && styles.dimmed, props.highlight && styles.raised).class} ${props.class ?? ""}`}
        >
            <Show
                when={card()}
                keyed
                fallback={(() => {
                    sawBack = true;
                    return (
                        <div
                            class={`${stylex.attrs(styles.face).class} ${animation("deal")}`}
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
                        class={`${stylex.attrs(styles.face, styles.front, props.highlight && styles.highlighted).class} ${animation(sawBack ? "flip" : "deal")}`}
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
        <div class={`${stylex.attrs(styles.slot).class} ${props.class ?? ""}`}>
            <Show when={props.label}>
                <span {...stylex.attrs(styles.label)}>{props.label}</span>
            </Show>
        </div>
    );
}

const styles = stylex.create({
    card: {
        position: "relative",
        flexShrink: 0,
        aspectRatio: "250 / 350",
        transitionProperty: "filter, opacity, translate",
        transitionDuration: "500ms",
    },
    dimmed: { opacity: 0.45, filter: "grayscale(1)" },
    raised: { translate: "0 -12%" },
    face: {
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        borderRadius: "7% / 5%",
        boxShadow: `0 0 0 1.5px ${colors.ink}, 0 3px 0 1.5px ${colors.ink}`,
    },
    front: { backgroundColor: colors.card },
    highlighted: {
        boxShadow: `0 0 0 1.5px ${colors.ink}, 0 0 0 5px ${colors.sun}, 0 4px 0 5px ${colors.ink}`,
    },
    slot: {
        flexShrink: 0,
        aspectRatio: "250 / 350",
        borderRadius: "7% / 5%",
        borderWidth: 2,
        borderStyle: "dashed",
        borderColor: `color-mix(in srgb, ${colors.cream} 30%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${colors.ink} 10%, transparent)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    label: {
        fontFamily: fonts.heading,
        letterSpacing: "0.2em",
        color: `color-mix(in srgb, ${colors.cream} 30%, transparent)`,
        fontSize: 14,
        lineHeight: "20px",
    },
});
