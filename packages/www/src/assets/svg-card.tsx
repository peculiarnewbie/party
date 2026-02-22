export function SvgCard({ color, size = 44 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size * 1.4} viewBox="0 0 36 50" fill="none">
            <rect x="2" y="2" width="32" height="46" rx="6" fill={color} />
            <rect
                x="7"
                y="9"
                width="22"
                height="15"
                rx="3"
                fill="white"
                fill-opacity=".2"
            />
            <rect
                x="7"
                y="30"
                width="13"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".4"
            />
            <rect
                x="7"
                y="36"
                width="20"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".28"
            />
            <rect
                x="7"
                y="42"
                width="9"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".18"
            />
        </svg>
    );
}
