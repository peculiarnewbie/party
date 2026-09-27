import * as stylex from "@stylexjs/stylex";

export const colors = stylex.defineConsts({
    paper: "var(--color-paper)",
    kraft: "var(--color-kraft)",
    line: "var(--color-line)",
    muted: "var(--color-muted)",
    ink: "var(--color-ink)",
    cream: "var(--color-cream)",
    navy: "var(--color-navy)",
    tomato: "var(--color-tomato)",
    sun: "var(--color-sun)",
    card: "var(--color-card)",
    teal: "var(--color-teal)",
});

export const fonts = stylex.defineConsts({
    heading: "var(--font-bebas)",
    body: "var(--font-karla)",
});

export const shadows = stylex.defineConsts({
    small: "var(--shadow-ink-sm)",
    regular: "var(--shadow-ink)",
    large: "var(--shadow-ink-lg)",
});

export const textures = stylex.defineConsts({
    table: "var(--background-image-table)",
});
