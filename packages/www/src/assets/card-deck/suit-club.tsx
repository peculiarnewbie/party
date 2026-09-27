export const CLUB_PATH =
    "M 50 5 C 35 5 25 16 25 30 C 25 38 29 45 35 50 " +
    "C 30 47 25 45 20 45 C 7 45 0 55 0 68 C 0 82 10 92 24 92 " +
    "C 35 92 43 86 47 77 C 46 92 40 102 30 110 " +
    "L 70 110 C 60 102 54 92 53 77 " +
    "C 57 86 65 92 76 92 C 90 92 100 82 100 68 C 100 55 93 45 80 45 " +
    "C 75 45 70 47 65 50 C 71 45 75 38 75 30 C 75 16 65 5 50 5 Z";

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
