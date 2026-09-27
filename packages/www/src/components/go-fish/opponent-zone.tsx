import { For, Show } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { TableCard, TableNameplate, PlayerAvatar } from "~/components/casino";
import { colors, fonts } from "~/styles/tokens.stylex";
import { RANK_LABEL } from "~/assets/card-deck/types";
import type { Rank } from "~/assets/card-deck/types";

interface OpponentZoneProps {
    id: string;
    name: string;
    cardCount: number;
    books: Rank[];
    isCurrentTurn: boolean;
    selectable: boolean;
    selected: boolean;
    onSelect: (id: string) => void;
    index?: number;
    isHero?: boolean;
}

export function OpponentZone(props: OpponentZoneProps) {
    return (
        <button
            data-testid={`go-fish-opponent-${props.id}`}
            {...stylex.attrs(
                styles.seat,
                props.selectable && styles.selectable,
                props.selected && styles.selected,
            )}
            type="button"
            aria-pressed={props.selected ? "true" : "false"}
            onClick={() => {
                if (props.selectable) props.onSelect(props.id);
            }}
            disabled={!props.selectable}
        >
            <div {...stylex.attrs(styles.cards)} aria-hidden="true">
                <For
                    each={Array.from(
                        { length: Math.min(props.cardCount, 3) },
                        (_, index) => index,
                    )}
                    keyed={false}
                >
                    {(_, index) => (
                        <div
                            {...stylex.attrs(
                                styles.card,
                                index > 0 && styles.overlap,
                            )}
                            style={{ rotate: `${(index - 1) * 6}deg` }}
                        >
                            <TableCard
                                card={null}
                                class="w-full"
                                delay={index * 110}
                            />
                        </div>
                    )}
                </For>
            </div>
            <TableNameplate active={props.isCurrentTurn}>
                <PlayerAvatar
                    id={props.id}
                    name={props.name}
                    index={props.index}
                    class="w-[calc(var(--u)*4.6)] h-[calc(var(--u)*4.6)] text-[calc(var(--u)*2.4)] -ml-[calc(var(--u)*0.8)] !border-[length:calc(var(--u)*0.25)] !shadow-none"
                />
                <div {...stylex.attrs(styles.details)}>
                    <div {...stylex.attrs(styles.name)}>
                        {`${props.name}${props.isHero ? " · You" : ""}`}
                    </div>
                    <div {...stylex.attrs(styles.count)}>
                        <Show when={props.cardCount > 0} fallback="NO CARDS">
                            {`${props.cardCount} cards`}
                        </Show>
                    </div>
                </div>
            </TableNameplate>
            <Show when={props.books.length > 0}>
                <div {...stylex.attrs(styles.books)}>
                    BOOKS:{" "}
                    {props.books.map((rank) => RANK_LABEL[rank]).join(", ")}
                </div>
            </Show>
        </button>
    );
}
const styles = stylex.create({
    seat: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        borderRadius: "calc(var(--u) * 0.8)",
        transitionProperty: "transform, outline",
        transitionDuration: "120ms",
        outline: {
            default: "none",
            ":focus-visible": `3px solid ${colors.sun}`,
        },
        outlineOffset: 4,
    },
    selectable: {
        cursor: "pointer",
        transform: { default: "none", ":hover": "translateY(-4px)" },
    },
    selected: {
        outline: `3px solid ${colors.sun}`,
        outlineOffset: 4,
        transform: "translateY(-4px)",
    },
    cards: {
        display: "flex",
        justifyContent: "center",
        height: "calc(var(--u) * 6.5)",
        marginBottom: "calc(var(--u) * -1.8)",
    },
    card: { width: "calc(var(--u) * 5.2)" },
    overlap: { marginLeft: "calc(var(--u) * -2.6)" },
    details: {
        minWidth: 0,
        flexGrow: 1,
        paddingBlock: "calc(var(--u) * 0.5)",
        textAlign: "start",
    },
    name: {
        fontFamily: fonts.heading,
        fontSize: "calc(var(--u) * 1.75)",
        lineHeight: 1,
        letterSpacing: "0.05em",
        color: colors.ink,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    count: {
        fontFamily: fonts.heading,
        fontSize: "calc(var(--u) * 1.9)",
        color: colors.navy,
        lineHeight: 1,
        marginTop: "calc(var(--u) * 0.2)",
    },
    books: {
        marginTop: "calc(var(--u) * 0.6)",
        paddingInline: "calc(var(--u) * 0.6)",
        borderWidth: "calc(var(--u) * 0.2)",
        borderStyle: "solid",
        borderColor: colors.ink,
        backgroundColor: colors.cream,
        fontFamily: fonts.heading,
        fontSize: "calc(var(--u) * 1.1)",
        color: colors.ink,
    },
});
