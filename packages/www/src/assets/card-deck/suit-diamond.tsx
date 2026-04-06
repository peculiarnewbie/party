export const DIAMOND_PATH =
    "M 50 5 L 90 60 L 50 115 L 10 60 Z";

export function DiamondSymbol({
    cx,
    cy,
    size,
    color = "#c0261a",
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
    const ty = cy - 60 * s;
    return (
        <g transform={flipped ? `rotate(180, ${cx}, ${cy})` : undefined}>
            <g transform={`translate(${tx}, ${ty}) scale(${s})`}>
                <path d={DIAMOND_PATH} fill={color} />
            </g>
        </g>
    );
}

export function SvgDiamond({
    size = 24,
    color = "#c0261a",
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
            <path d={DIAMOND_PATH} fill={color} />
        </svg>
    );
}
