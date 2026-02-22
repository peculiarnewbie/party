export function SvgStar({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <polygon
                points="18,7 21,15 30,15 23,20 26,29 18,23 10,29 13,20 6,15 15,15"
                fill="white"
                fill-opacity=".82"
            />
        </svg>
    );
}
