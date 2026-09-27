import { For } from "solid-js";

const COLORS = ["#f5c542", "#c0261a", "#1a3a6e", "#0f766e", "#f7f2de", "#e07a2e"];

export function Confetti(props: { count?: number }) {
    const pieces = Array.from({ length: props.count ?? 90 }, (_, index) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.9,
        duration: 2.2 + Math.random() * 1.8,
        drift: `${(Math.random() - 0.5) * 30}vw`,
        spin: `${(Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 720)}deg`,
        color: COLORS[index % COLORS.length],
        width: 8 + Math.random() * 8,
        round: Math.random() > 0.7,
    }));
    return (
        <div
            aria-hidden="true"
            class="pointer-events-none fixed inset-0 z-50 overflow-hidden"
        >
            <For each={pieces}>
                {(piece) => (
                    <span
                        class="absolute top-0 block"
                        style={{
                            left: `${piece.left}%`,
                            width: `${piece.width}px`,
                            height: `${piece.round ? piece.width : piece.width * 0.45}px`,
                            "border-radius": piece.round ? "9999px" : "1px",
                            background: piece.color,
                            border: "1.5px solid #1a1a1a",
                            "--confetti-drift": piece.drift,
                            "--confetti-spin": piece.spin,
                            animation: `confetti-fall ${piece.duration}s cubic-bezier(0.2, 0.6, 0.4, 1) ${piece.delay}s both`,
                        }}
                    />
                )}
            </For>
        </div>
    );
}
