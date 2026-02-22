export function SvgTimer({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <circle
                cx="18"
                cy="20"
                r="8"
                stroke="white"
                stroke-width="2"
                stroke-opacity=".7"
            />
            <line
                x1="18"
                y1="20"
                x2="18"
                y2="14"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-opacity=".85"
            />
            <line
                x1="18"
                y1="20"
                x2="22"
                y2="23"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-opacity=".85"
            />
            <rect
                x="15"
                y="9"
                width="6"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".6"
            />
        </svg>
    );
}
