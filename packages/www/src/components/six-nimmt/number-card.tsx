import * as stylex from "@stylexjs/stylex";
import { bullheads } from "~/game/six-nimmt/engine";
import { colors, fonts } from "~/styles/tokens.stylex";

export function NumberCard(props: { value: number; selected?: boolean }) {
    return (
        <span
            {...stylex.attrs(
                styles.card,
                props.selected && styles.selected,
                bullheads(props.value) >= 5 && styles.danger,
            )}
        >
            <span {...stylex.attrs(styles.number)}>{props.value}</span>
            <span {...stylex.attrs(styles.penalty)}>
                {bullheads(props.value)} pts
            </span>
        </span>
    );
}
const styles = stylex.create({
    card: {
        display: "flex",
        flexDirection: "var(--number-card-direction, column)",
        gap: 2,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        minHeight: 0,
        minWidth: 0,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: colors.ink,
        borderRadius: 5,
        backgroundColor: colors.cream,
        color: colors.navy,
        boxShadow: `2px 3px 0 ${colors.ink}`,
        fontFamily: fonts.heading,
        lineHeight: 1,
    },
    selected: {
        backgroundColor: colors.sun,
        outline: `3px solid ${colors.ink}`,
        outlineOffset: 2,
    },
    danger: { color: colors.tomato },
    number: { fontSize: "var(--number-card-font, 30px)" },
    penalty: {
        fontSize: "var(--number-card-small, 11px)",
        letterSpacing: ".04em",
    },
});
