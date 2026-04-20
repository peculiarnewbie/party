import type { Component } from "solid-js";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { animate } from "animejs";
import type { PokerStreet } from "~/game/poker/types";

type BannerStreet = Exclude<PokerStreet, "preflop" | "hand_over" | "tournament_over">;

const STREET_LABELS: Record<BannerStreet, string> = {
    flop: "FLOP",
    turn: "TURN",
    river: "RIVER",
    showdown: "SHOWDOWN",
};

const STREET_COLORS: Record<string, string> = {
    flop: "#1a3a6e",
    turn: "#1a3a6e",
    river: "#c0261a",
    showdown: "#1a1a1a",
};

export const StreetBanner: Component<{
    street: PokerStreet;
}> = (props) => {
    const [visibleStreet, setVisibleStreet] = createSignal<BannerStreet | null>(null);
    const [isVisible, setIsVisible] = createSignal(false);
    let bannerRef: HTMLDivElement | undefined;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let anim: ReturnType<typeof animate> | undefined;
    let hasMounted = false;

    createEffect(() => {
        const current = props.street;
        if (!hasMounted) {
            hasMounted = true;
            return;
        }
        if (current === "flop" || current === "turn" || current === "river" || current === "showdown") {
            // Dismiss any existing banner first
            if (anim) anim.pause();
            if (timeoutId) clearTimeout(timeoutId);

            setVisibleStreet(current);
            setIsVisible(true);

            // Animate in
            requestAnimationFrame(() => {
                if (!bannerRef) return;
                anim = animate(bannerRef, {
                    opacity: { from: 0, to: 1 },
                    scale: { from: 0.6, to: 1 },
                    duration: 500,
                    ease: "outElastic(1, .7)",
                });
            });

            // Auto-dismiss
            timeoutId = setTimeout(() => {
                if (!bannerRef) {
                    setIsVisible(false);
                    return;
                }
                anim = animate(bannerRef, {
                    opacity: { from: 1, to: 0 },
                    scale: { from: 1, to: 0.85 },
                    duration: 350,
                    ease: "inQuad",
                    onComplete: () => setIsVisible(false),
                });
            }, 1800);
        }
    });

    onCleanup(() => {
        if (timeoutId) clearTimeout(timeoutId);
        if (anim) anim.pause();
    });

    return (
        <Show when={isVisible() && visibleStreet()}>
            {(street) => (
                <div class="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
                    <div
                        ref={bannerRef}
                        class="border-[3px] border-[#1a1a1a] px-8 py-5 shadow-[6px_6px_0_#1a1a1a] text-center"
                        style={{
                            "background-color": STREET_COLORS[street()],
                        }}
                    >
                        <div class="font-bebas text-[.7rem] tracking-[.28em] text-[#ddd5c4]/70">
                            {street() === "showdown" ? "HAND END" : "STREET"}
                        </div>
                        <div class="font-bebas text-[clamp(2.5rem,8vw,4.5rem)] leading-[.9] text-[#ddd5c4] tracking-[.06em]">
                            {STREET_LABELS[street()]}
                        </div>
                    </div>
                </div>
            )}
        </Show>
    );
};
