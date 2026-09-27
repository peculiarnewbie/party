import { Show } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { TableButton, TableCard, CardSlot } from "~/components/casino";
import { colors, fonts } from "~/styles/tokens.stylex";

interface DrawPileProps {
    count: number;
    showDrawButton: boolean;
    onDraw: () => void;
}
export function DrawPile(props: DrawPileProps) {
    return (
        <div {...stylex.attrs(styles.pile)}>
            <div {...stylex.attrs(styles.label)}>DRAW PILE</div>
            <Show
                when={props.count > 0}
                fallback={
                    <CardSlot
                        class="w-[calc(var(--u,10px)*6.4)]"
                        label="EMPTY"
                    />
                }
            >
                <div {...stylex.attrs(styles.stack)}>
                    <Show when={props.count > 4}>
                        <div {...stylex.attrs(styles.back)}>
                            <TableCard
                                card={null}
                                animate={false}
                                class="w-full"
                            />
                        </div>
                    </Show>
                    <Show when={props.count > 2}>
                        <div {...stylex.attrs(styles.middle)}>
                            <TableCard
                                card={null}
                                animate={false}
                                class="w-full"
                            />
                        </div>
                    </Show>
                    <TableCard card={null} animate={false} class="w-full" />
                </div>
            </Show>
            <div {...stylex.attrs(styles.count)}>{props.count} LEFT</div>
            <Show when={props.showDrawButton}>
                <TableButton tone="tomato" onClick={props.onDraw}>
                    Go Fish!
                </TableButton>
            </Show>
        </div>
    );
}
const styles = stylex.create({
    pile: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "calc(var(--u, 10px) * 1.2)",
    },
    label: {
        fontFamily: fonts.heading,
        color: colors.cream,
        fontSize: "calc(var(--u, 10px) * 1.2)",
        letterSpacing: "0.25em",
    },
    stack: { position: "relative", width: "calc(var(--u, 10px) * 6.4)" },
    back: {
        position: "absolute",
        inset: 0,
        translate: "4px -4px",
        rotate: "6deg",
    },
    middle: {
        position: "absolute",
        inset: 0,
        translate: "2px -2px",
        rotate: "3deg",
    },
    count: {
        fontFamily: fonts.heading,
        color: colors.ink,
        backgroundColor: colors.cream,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: colors.ink,
        paddingInline: "0.5em",
        paddingTop: "0.1em",
        fontSize: "calc(var(--u, 10px) * 1.6)",
        borderRadius: "0.3em",
    },
});
