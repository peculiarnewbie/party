const PALETTE = [
    ["#c0261a", "#f7f2de"],
    ["#1a3a6e", "#f7f2de"],
    ["#f5c542", "#1a1a1a"],
    ["#0f766e", "#f7f2de"],
    ["#e07a2e", "#1a1a1a"],
    ["#6b3a78", "#f7f2de"],
    ["#8fb3d9", "#1a1a1a"],
    ["#d9707a", "#1a1a1a"],
] as const;

export function avatarColors(id: string, index?: number) {
    if (index !== undefined && index >= 0)
        return PALETTE[index % PALETTE.length];
    let hash = 2166136261;
    for (const char of id) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619) >>> 0;
    }
    return PALETTE[hash % PALETTE.length];
}

export function PlayerAvatar(props: {
    id: string;
    name: string;
    index?: number;
    class?: string;
}) {
    const colors = () => avatarColors(props.id, props.index);
    return (
        <div
            aria-hidden="true"
            class={`shrink-0 rounded-full flex items-center justify-center font-bebas leading-none pt-[.08em] border-2 border-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] ${props.class ?? "w-12 h-12 text-2xl"}`}
            style={{
                background: colors()[0],
                color: colors()[1],
            }}
        >
            {props.name.trim().charAt(0).toUpperCase() || "?"}
        </div>
    );
}
