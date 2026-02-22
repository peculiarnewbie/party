// Spade path in a 100×120 coordinate space.
// Visible bounds: x ≈ 10–90, y ≈ 5–110. Visual center ≈ (50, 55).
export const SPADE_PATH =
    "M 50 5 C 75 5 90 20 90 40 C 90 60 72 70 55 65 " +
    "C 65 68 78 80 76 90 C 74 100 60 100 55 92 " +
    "L 55 110 45 110 45 92 " +
    "C 40 100 26 100 24 90 C 22 80 35 68 45 65 " +
    "C 28 70 10 60 10 40 C 10 20 25 5 50 5 Z";

/**
 * Embeds a spade symbol inside a parent <svg>, centered at (cx, cy).
 * `size` maps to the 100-unit viewBox width — so rendered width ≈ size * 0.8.
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
        <svg width={size} height={size * 1.15} viewBox="0 0 100 120" fill="none">
            <path d={SPADE_PATH} fill={color} />
        </svg>
    );
}
