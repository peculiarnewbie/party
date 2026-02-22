export function SvgBrain({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <circle cx="14" cy="16" r="5" fill="white" fill-opacity=".6" />
            <circle cx="22" cy="16" r="5" fill="white" fill-opacity=".6" />
            <path
                d="M14 16 Q18 20 22 16"
                stroke="white"
                stroke-width="1.5"
                stroke-opacity=".6"
                fill="none"
                stroke-linecap="round"
            />
            <rect
                x="16"
                y="22"
                width="4"
                height="5"
                rx="2"
                fill="white"
                fill-opacity=".5"
            />
        </svg>
    );
}
