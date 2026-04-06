export const HEART_PATH =
    "M 50 108 " +
    "C 25 90 0 65 0 40 " +
    "C 0 18 15 5 30 5 " +
    "C 40 5 48 12 50 20 " +
    "C 52 12 60 5 70 5 " +
    "C 85 5 100 18 100 40 " +
    "C 100 65 75 90 50 108 Z";

export function HeartSymbol({
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
    const ty = cy - 55 * s;
    return (
        <g transform={flipped ? `rotate(180, ${cx}, ${cy})` : undefined}>
            <g transform={`translate(${tx}, ${ty}) scale(${s})`}>
                <path d={HEART_PATH} fill={color} />
            </g>
        </g>
    );
}

export function SvgHeart({
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
            <path d={HEART_PATH} fill={color} />
        </svg>
    );
}
