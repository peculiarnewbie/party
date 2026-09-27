import * as stylex from "@stylexjs/stylex";
import { colors } from "~/styles/tokens.stylex";
import type { JSX } from "@solidjs/web";

export function TableNameplate(props: {
    children: JSX.Element;
    variant?: "poker" | "blackjack";
    active?: boolean;
    winner?: boolean;
    muted?: boolean;
}) {
    return (
        <div
            data-testid="table-nameplate"
            class={`${stylex.attrs(styles.base, props.variant === "blackjack" ? styles.blackjack : styles.poker, (props.active || props.winner) && styles.active, props.muted && styles.muted).class} ${props.winner ? "animate-wiggle" : props.active ? "animate-nudge" : ""}`}
        >
            {props.children}
        </div>
    );
}

const styles = stylex.create({
    base: {
        position: "relative",
        display: "flex",
        alignItems: "center",
        borderWidth: "calc(var(--u) * 0.25)",
        borderStyle: "solid",
        borderColor: colors.ink,
        backgroundColor: colors.cream,
        transitionProperty: "background-color, opacity, filter",
        transitionDuration: "300ms",
    },
    poker: {
        width: "100%",
        gap: "calc(var(--u) * 0.8)",
        borderRadius: "calc(var(--u) * 0.8)",
        paddingRight: "calc(var(--u) * 1.2)",
        boxShadow: `calc(var(--u) * 0.35) calc(var(--u) * 0.35) 0 ${colors.ink}`,
    },
    blackjack: {
        marginTop: "calc(var(--u) * 0.9)",
        gap: "calc(var(--u) * 0.7)",
        borderRadius: "calc(var(--u) * 0.7)",
        paddingRight: "calc(var(--u) * 1.1)",
        boxShadow: `calc(var(--u) * 0.3) calc(var(--u) * 0.3) 0 ${colors.ink}`,
    },
    active: { backgroundColor: colors.sun },
    muted: { opacity: 0.6, filter: "grayscale(1)" },
});
