export function SvgToken({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" fill={color} />
            <circle
                cx="18"
                cy="18"
                r="11"
                fill="none"
                stroke="white"
                stroke-width="1.5"
                stroke-opacity=".3"
            />
            <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
        </svg>
    );
}
