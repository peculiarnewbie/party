import * as stylex from "@stylexjs/stylex";
import { colors, textures } from "~/styles/tokens.stylex";
import type { JSX } from "@solidjs/web";

export function TableSurface(props: {
    shape?: "oval" | "blackjack";
    children?: JSX.Element;
}) {
    const blackjack = () => props.shape === "blackjack";
    return (
        <>
            <div
                {...stylex.attrs(
                    styles.outer,
                    blackjack() ? styles.blackjackOuter : styles.ovalOuter,
                    styles.shadow,
                )}
            />
            <div
                {...stylex.attrs(
                    styles.outer,
                    blackjack() ? styles.blackjackOuter : styles.ovalOuter,
                    styles.rim,
                )}
            />
            <div
                {...stylex.attrs(
                    styles.felt,
                    blackjack() ? styles.blackjackFelt : styles.ovalFelt,
                )}
            >
                {props.children}
            </div>
        </>
    );
}

const styles = stylex.create({
    outer: { position: "absolute" },
    ovalOuter: { inset: "4% 4%", borderRadius: "9999px" },
    blackjackOuter: {
        inset: "0 1% 2% 1%",
        borderEndStartRadius: "50% 100%",
        borderEndEndRadius: "50% 100%",
    },
    shadow: {
        backgroundColor: colors.ink,
        translate: "calc(var(--u) * 0.9) calc(var(--u) * 0.9)",
    },
    rim: {
        backgroundColor: colors.tomato,
        borderWidth: "calc(var(--u) * 0.4)",
        borderStyle: "solid",
        borderColor: colors.ink,
    },
    felt: {
        position: "absolute",
        overflow: "hidden",
        borderWidth: "calc(var(--u) * 0.4)",
        borderStyle: "solid",
        borderColor: colors.ink,
        backgroundImage: textures.table,
        backgroundSize: "14px 14px",
    },
    ovalFelt: {
        inset: "calc(4% + var(--u) * 2.4)",
        borderRadius: "9999px",
        backgroundColor: colors.navy,
    },
    blackjackFelt: {
        inset: "0 calc(1% + var(--u) * 2.4) calc(2% + var(--u) * 2.4)",
        borderEndStartRadius: "50% 100%",
        borderEndEndRadius: "50% 100%",
        borderTopWidth: 0,
        backgroundColor: colors.teal,
    },
});
