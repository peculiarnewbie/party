import * as stylex from "@stylexjs/stylex";
import { colors, shadows } from "~/styles/tokens.stylex";
import type { JSX } from "@solidjs/web";

export function TablePanel(props: {
    active?: boolean;
    children: JSX.Element;
    testId?: string;
    class?: string;
}) {
    return (
        <div
            data-testid={props.testId}
            class={`${stylex.attrs(styles.panel, props.active && styles.active).class} ${props.class ?? ""}`}
        >
            {props.children}
        </div>
    );
}

const styles = stylex.create({
    panel: {
        borderWidth: 3,
        borderStyle: "solid",
        borderColor: colors.ink,
        padding: "var(--table-panel-padding, 16px)",
        backgroundColor: colors.kraft,
        boxShadow: shadows.regular,
        transitionProperty: "all",
        transitionDuration: "300ms",
    },
    active: {
        backgroundColor: colors.cream,
        boxShadow: `6px 6px 0 ${colors.tomato}`,
    },
});
