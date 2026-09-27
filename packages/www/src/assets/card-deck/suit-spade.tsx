export const SPADE_PATH =
    "M 50 5 C 40 21 0 44 0 66 C 0 81 10 92 25 92 " +
    "C 36 92 44 86 47 77 C 46 92 40 102 30 110 " +
    "L 70 110 C 60 102 54 92 53 77 " +
    "C 56 86 64 92 75 92 C 90 92 100 81 100 66 " +
    "C 100 44 60 21 50 5 Z";

/**
 * Embeds a spade symbol inside a parent <svg>, centered at (cx, cy).
 * `size` maps to the 100-unit viewBox width — so rendered width ≈ size.
 * When `flipped` is true the symbol is rotated 180° around its center point.
 */
export function SpadeSymbol({
    cx,
    cy,
    size,
    color = "#1a1a1a",
    flipped = false,
}: {
    cx: number;
    cy: number;
    size: number;
    color?: string;
    flipped?: boolean;
}) {
    const s = size / 100;
    const tx = cx - 50 * s;
    const ty = cy - 55 * s;
    return (
        <g transform={flipped ? `rotate(180, ${cx}, ${cy})` : undefined}>
            <g transform={`translate(${tx}, ${ty}) scale(${s})`}>
                <path d={SPADE_PATH} fill={color} />
            </g>
        </g>
    );
}

/** Standalone spade SVG — use anywhere outside a card. */
export function SvgSpade({
    size = 24,
    color = "#1a1a1a",
}: {
    size?: number;
    color?: string;
}) {
    return (
        <svg
            width={size}
            height={size * 1.15}
            viewBox="0 0 100 120"
            fill="none"
        >
            <path d={SPADE_PATH} fill={color} />
        </svg>
    );
}
