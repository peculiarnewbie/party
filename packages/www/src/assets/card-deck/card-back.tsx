export function CardBack({
    size = 250,
}: {
    size?: number;
}) {
    const patternId = `crosshatch-${Math.random().toString(36).slice(2, 8)}`;

    return (
        <svg
            width={size}
            height={size * 1.4}
            viewBox="0 0 250 350"
            fill="none"
            style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.14))" }}
        >
            <defs>
                <pattern
                    id={patternId}
                    width="12"
                    height="12"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="12"
                        stroke="#254a82"
                        stroke-width="1.5"
                        stroke-opacity="0.3"
                    />
                </pattern>
            </defs>

            <rect
                x="2"
                y="2"
                width="246"
                height="346"
                rx="14"
                fill="#1a3a6e"
                stroke="#1a1a1a"
                stroke-width="2"
            />

            <rect
                x="12"
                y="12"
                width="226"
                height="326"
                rx="8"
                fill="none"
                stroke="#ddd5c4"
                stroke-width="1.5"
                stroke-opacity="0.2"
            />

            <rect
                x="2"
                y="2"
                width="246"
                height="346"
                rx="14"
                fill={`url(#${patternId})`}
            />

            <circle
                cx="125"
                cy="175"
                r="45"
                fill="none"
                stroke="#ddd5c4"
                stroke-width="1.5"
                stroke-opacity="0.25"
            />
            <circle
                cx="125"
                cy="175"
                r="30"
                fill="none"
                stroke="#ddd5c4"
                stroke-width="1"
                stroke-opacity="0.15"
            />

            <polygon
                points="125,140 131,162 155,162 136,176 142,198 125,184 108,198 114,176 95,162 119,162"
                fill="#ddd5c4"
                fill-opacity="0.35"
            />
        </svg>
    );
}
