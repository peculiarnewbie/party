const DOT_POSITIONS: Record<number, [number, number][]> = {
    1: [[24, 24]],
    2: [[14, 14], [34, 34]],
    3: [[14, 14], [24, 24], [34, 34]],
    4: [[14, 14], [34, 14], [14, 34], [34, 34]],
    5: [[14, 14], [34, 14], [24, 24], [14, 34], [34, 34]],
    6: [[14, 14], [34, 14], [14, 24], [34, 24], [14, 34], [34, 34]],
};

export function SvgDice({
    color,
    dotColor = "white",
    side = 5,
    size = 56,
}: {
    color: string;
    dotColor?: string;
    side?: 1 | 2 | 3 | 4 | 5 | 6;
    size?: number;
}) {
    const dots = DOT_POSITIONS[side] ?? DOT_POSITIONS[5];
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
            <rect x="3" y="3" width="42" height="42" rx="9" fill={color} />
            {dots.map(([cx, cy]) => (
                <circle cx={cx} cy={cy} r="4" fill={dotColor} fill-opacity=".85" />
            ))}
        </svg>
    );
}
