import { Show, createSignal, createEffect, onCleanup } from "solid-js";

interface AnnouncementOverlayProps {
    text: string | null;
    variant?: "go_fish" | "success" | "book" | "info";
}

export function AnnouncementOverlay(props: AnnouncementOverlayProps) {
    const [visible, setVisible] = createSignal(false);
    const [displayText, setDisplayText] = createSignal("");

    createEffect(() => {
        const text = props.text;
        if (text) {
            setDisplayText(text);
            setVisible(true);
            const timer = setTimeout(() => setVisible(false), 2200);
            onCleanup(() => clearTimeout(timer));
        }
    });

    const variantClass = () => {
        switch (props.variant) {
            case "go_fish":
                return "text-[#c0261a]";
            case "success":
                return "text-[#1a3a6e]";
            case "book":
                return "text-[#1a1a1a]";
            default:
                return "text-[#1a3a6e]";
        }
    };

    return (
        <Show when={visible()}>
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div
                    class={`font-bebas text-[clamp(1.8rem,4vw,3.5rem)] tracking-[.08em] text-center px-6 py-3 bg-[#ddd5c4]/95 border-2 border-[#1a1a1a] shadow-[5px_5px_0_#1a1a1a] ${variantClass()}`}
                    style={{
                        animation:
                            "announcement-pop 2.2s ease-out forwards",
                    }}
                >
                    {displayText()}
                </div>
            </div>
        </Show>
    );
}
