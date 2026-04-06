export const CLUB_PATH =
    "M 50 20 " +
    "C 35 20 25 30 25 42 C 25 54 35 62 45 62 " +
    "C 33 58 18 50 12 42 C 5 33 8 20 20 14 C 32 8 42 14 46 24 " +
    "L 50 20 " +
    "L 54 24 C 58 14 68 8 80 14 C 92 20 95 33 88 42 " +
    "C 82 50 67 58 55 62 C 65 62 75 54 75 42 C 75 30 65 20 50 20 Z " +
    "M 44 62 L 44 95 C 44 100 38 105 32 105 L 68 105 C 62 105 56 100 56 95 L 56 62 Z";

export function ClubSymbol({
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
                <path d={CLUB_PATH} fill={color} />
            </g>
        </g>
    );
}

export function SvgClub({
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
            <path d={CLUB_PATH} fill={color} />
        </svg>
    );
}
