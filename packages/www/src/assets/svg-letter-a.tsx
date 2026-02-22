export function SvgLetterA({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <text
                x="18"
                y="26"
                text-anchor="middle"
                font-size="20"
                font-weight="900"
                fill="white"
                fill-opacity=".85"
                font-family="Georgia,serif"
            >
                A
            </text>
        </svg>
    );
}
