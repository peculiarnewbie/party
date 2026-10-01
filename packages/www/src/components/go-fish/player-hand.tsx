import { For, Show } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { TableCard } from "~/components/casino";
import { colors, fonts } from "~/styles/tokens.stylex";
import { RANK_LABEL } from "~/assets/card-deck/types";
import type { Card, Rank } from "~/assets/card-deck/types";

interface PlayerHandProps {
    cards: Card[];
    selectedRank: Rank | null;
    onSelectRank: (rank: Rank) => void;
    disabled: boolean;
}
function groupByRank(cards: Card[]) {
    const groups = new Map<Rank, Card[]>();
    for (const card of cards)
        groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
    return Array.from(groups, ([rank, cards]) => ({ rank, cards })).sort(
        (a, b) => a.rank - b.rank,
    );
}
export function PlayerHand(props: PlayerHandProps) {
    return (
        <div data-testid="go-fish-hand" {...stylex.attrs(styles.hand)}>
            <div {...stylex.attrs(styles.label)}>
                YOUR HAND ({props.cards.length})
            </div>
            <div {...stylex.attrs(styles.groups)}>
                <For each={groupByRank(props.cards)} keyed={false}>
                    {(group) => (
                        <button
                            {...stylex.attrs(
                                styles.group,
                                props.selectedRank === group().rank &&
                                    styles.selected,
                            )}
                            type="button"
                            aria-label={`Ask for ${RANK_LABEL[group().rank]}s`}
                            aria-pressed={
                                props.selectedRank === group().rank
                                    ? "true"
                                    : "false"
                            }
                            disabled={props.disabled}
                            onClick={() => {
                                if (!props.disabled)
                                    props.onSelectRank(group().rank);
                            }}
                        >
                            <Show when={group().cards.length > 1}>
                                <span {...stylex.attrs(styles.badge)}>
                                    x{group().cards.length}
                                </span>
                            </Show>
                            <For each={group().cards} keyed={false}>
                                {(card, index) => (
                                    <div
                                        {...stylex.attrs(
                                            index > 0 && styles.overlap,
                                        )}
                                    >
                                        <TableCard
                                            card={card()}
                                            class="w-[56px] sm:w-[72px]"
                                            delay={index * 100}
                                            highlight={
                                                props.selectedRank ===
                                                group().rank
                                            }
                                        />
                                    </div>
                                )}
                            </For>
                        </button>
                    )}
                </For>
            </div>
        </div>
    );
}
const styles = stylex.create({
    hand: { paddingInline: 12, paddingBlock: 4 },
    label: {
        marginBottom: 2,
        textAlign: "center",
        fontFamily: fonts.heading,
        fontSize: 14,
        letterSpacing: "0.2em",
        color: colors.muted,
    },
    groups: {
        display: "flex",
        justifyContent: "center",
        columnGap: 12,
        rowGap: 28,
        flexWrap: "wrap",
        paddingTop: 28,
        paddingBottom: 10,
    },
    group: {
        position: "relative",
        flexShrink: 0,
        display: "flex",
        cursor: { default: "pointer", ":disabled": "default" },
        transitionProperty: "transform",
        transitionDuration: "120ms",
        outline: {
            default: "none",
            ":focus-visible": `3px solid ${colors.navy}`,
        },
        outlineOffset: 6,
    },
    selected: { transform: "translateY(-8px)" },
    overlap: { marginLeft: { default: -36, "@media (min-width: 640px)": -48 } },
    badge: {
        position: "absolute",
        top: -12,
        right: -4,
        zIndex: 10,
        paddingInline: 6,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: colors.ink,
        backgroundColor: colors.navy,
        color: colors.cream,
        fontFamily: fonts.heading,
        fontSize: 14,
    },
});
