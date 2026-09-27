import * as stylex from "@stylexjs/stylex";
import { colors, fonts } from "~/styles/tokens.stylex";
import type { JSX } from "@solidjs/web";

type Tone = "paper" | "cream" | "navy" | "tomato" | "sun" | "teal" | "dark";
export function TableButton(props: {
    children: JSX.Element;
    onClick: () => void;
    disabled?: boolean;
    tone?: Tone;
    size?: "action" | "compact" | "square";
    class?: string;
    testId?: string;
    label?: string;
}) {
    return (
        <button
            type="button"
            data-testid={props.testId}
            aria-label={props.label}
            disabled={props.disabled}
            onClick={() => props.onClick()}
            class={`${stylex.attrs(styles.base, styles[props.size ?? "action"], tones[props.tone ?? "cream"]).class} ${props.class ?? ""}`}
        >
            {props.children}
        </button>
    );
}

const styles = stylex.create({
    base: {
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: colors.ink,
        fontFamily: fonts.heading,
        boxShadow: {
            default: `3px 3px 0 ${colors.ink}`,
            ":active": "none",
            ":disabled": "none",
        },
        translate: {
            default: "none",
            ":active": "3px 3px",
            ":disabled": "none",
        },
        opacity: { default: 1, ":disabled": 0.35 },
        cursor: { default: "pointer", ":disabled": "default" },
        outline: {
            default: "none",
            ":focus-visible": `3px solid ${colors.navy}`,
        },
        outlineOffset: 4,
        transitionProperty: "all",
        transitionDuration: "120ms",
    },
    action: {
        minHeight: "var(--table-action-height, 56px)",
        paddingTop: 4,
        fontSize: "var(--table-action-font, 24px)",
        lineHeight: "28px",
        letterSpacing: "0.12em",
    },
    compact: {
        minHeight: 40,
        paddingTop: 2,
        fontSize: 16,
        lineHeight: "24px",
        letterSpacing: "0.05em",
    },
    square: {
        width: 44,
        height: 44,
        flexShrink: 0,
        fontSize: 24,
        lineHeight: "32px",
    },
});
const tones = stylex.create({
    paper: { backgroundColor: colors.paper, color: colors.tomato },
    cream: { backgroundColor: colors.cream, color: colors.ink },
    navy: { backgroundColor: colors.navy, color: colors.cream },
    tomato: { backgroundColor: colors.tomato, color: colors.cream },
    sun: { backgroundColor: colors.sun, color: colors.ink },
    teal: { backgroundColor: colors.teal, color: colors.cream },
    dark: { backgroundColor: colors.ink, color: colors.sun },
});
