import * as stylex from "@stylexjs/stylex";
import { colors as palette, fonts, shadows } from "~/styles/tokens.stylex";
const PALETTE = [
    ["#c0261a", "#f7f2de"],
    ["#1a3a6e", "#f7f2de"],
    ["#f5c542", "#1a1a1a"],
    ["#0f766e", "#f7f2de"],
    ["#e07a2e", "#1a1a1a"],
    ["#6b3a78", "#f7f2de"],
    ["#8fb3d9", "#1a1a1a"],
    ["#d9707a", "#1a1a1a"],
] as const;

export function avatarColors(id: string, index?: number) {
    if (index !== undefined && index >= 0)
        return PALETTE[index % PALETTE.length];
    let hash = 2166136261;
    for (const char of id) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
}

export function PlayerAvatar(props: {
    id: string;
    name: string;
    index?: number;
    class?: string;
}) {
    const colors = () => avatarColors(props.id, props.index);
    return (
        <div
            aria-hidden="true"
            class={`${stylex.attrs(styles.avatar, !props.class && styles.defaultSize).class} ${props.class ?? ""}`}
            style={{
                background: colors()[0],
                color: colors()[1],
            }}
        >
            {props.name.trim().charAt(0).toUpperCase() || "?"}
        </div>
    );
}

const styles = stylex.create({
    avatar: {
        flexShrink: 0,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: fonts.heading,
        lineHeight: 1,
        paddingTop: "0.08em",
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: palette.ink,
        boxShadow: shadows.small,
    },
    defaultSize: { width: 48, height: 48, fontSize: 24 },
});
