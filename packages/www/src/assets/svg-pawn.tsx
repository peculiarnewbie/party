export function SvgPawn({ color, size = 52 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none">
            <circle cx="20" cy="11" r="9" fill={color} />
            <path
                d="M11 50 L14 33 Q17 26 20 24 Q23 26 26 33 L29 50 Z"
                fill={color}
            />
            <rect x="8" y="45" width="24" height="6" rx="3" fill={color} />
        </svg>
    );
}
