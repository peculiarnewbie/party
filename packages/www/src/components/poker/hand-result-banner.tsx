import type { Component } from "solid-js";
import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { animate } from "animejs";
import type { PokerEvent, PokerPlayerPublicView } from "~/game/poker";

interface HandResult {
    winners: string;
    amount: number;
    handLabel: string;
    isUncontested: boolean;
}

function extractHandResult(
    events: PokerEvent[],
    players: PokerPlayerPublicView[],
): HandResult | null {
    const potEvents = events.filter((e) => e.type === "pot_awarded");
    if (potEvents.length === 0) return null;

    // Use the last pot_awarded event
    const last = potEvents[potEvents.length - 1];
    const message = last.message;

    // Extract winner names from message like "Alice & Bob won 240 chips with Two Pair"
    const wonMatch = message.match(/(.+?) won (\d+) chips(?: with (.+))?/);
    if (!wonMatch) {
        return {
            winners: "Unknown",
            amount: last.amount ?? 0,
            handLabel: "",
            isUncontested: message.includes("uncontested"),
        };
    }

    const winners = wonMatch[1];
    const amount = Number(wonMatch[2]) ?? 0;
    const handLabel = wonMatch[3] ?? "";

    return {
        winners,
        amount,
        handLabel,
        isUncontested: message.includes("uncontested"),
    };
}

export const HandResultBanner: Component<{
    events: PokerEvent[];
    players: PokerPlayerPublicView[];
    handNumber: number;
    street: string;
}> = (props) => {
    const [result, setResult] = createSignal<HandResult | null>(null);
    const [isVisible, setIsVisible] = createSignal(false);
    let bannerRef: HTMLDivElement | undefined;
    let anim: ReturnType<typeof animate> | undefined;
    let hasMounted = false;

    createEffect(() => {
        const street = props.street;

        if (!hasMounted) {
            hasMounted = true;
            return;
        }

        if (street === "hand_over" || street === "showdown" || street === "tournament_over") {
            const newResult = extractHandResult(props.events, props.players);
            if (newResult) {
                setResult(newResult);
                setIsVisible(true);

                requestAnimationFrame(() => {
                    if (!bannerRef) return;
                    anim = animate(bannerRef, {
                        opacity: { from: 0, to: 1 },
                        translateY: { from: 40, to: 0 },
                        duration: 600,
                        ease: "outExpo",
                    });
                });
            }
        } else {
            // New hand started — dismiss banner
            if (isVisible()) {
                if (bannerRef) {
                    anim = animate(bannerRef, {
                        opacity: { from: 1, to: 0 },
                        translateY: { from: 0, to: -30 },
                        duration: 350,
                        ease: "inQuad",
                        onComplete: () => setIsVisible(false),
                    });
                } else {
                    setIsVisible(false);
                }
                setResult(null);
            }
        }
    });

    onCleanup(() => {
        if (anim) anim.pause();
    });

    return (
        <Show when={isVisible() && result()}>
            {(res) => (
                <div class="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
                    <div
                        ref={bannerRef}
                        class="border-[3px] border-[#1a1a1a] px-6 py-4 shadow-[5px_5px_0_#1a1a1a] bg-[#ddd5c4] max-w-md w-full text-center"
                    >
                        <div class="font-bebas text-[.65rem] tracking-[.22em] text-[#c0261a]">
                            {res().isUncontested ? "POT AWARDED UNCONTESTED" : "HAND WINNER"}
                        </div>
                        <div class="font-bebas text-[clamp(1.4rem,5vw,2rem)] leading-[1] text-[#1a1a1a] tracking-[.04em] mt-1">
                            {res().winners.toUpperCase()}
                        </div>
                        <div class="flex items-center justify-center gap-3 mt-2">
                            <span class="font-bebas text-[1.1rem] text-[#1a3a6e]">
                                +{res().amount}
                            </span>
                            <Show when={res().handLabel}>
                                <span class="font-bebas text-[.75rem] tracking-[.1em] text-[#5a5040] border-l-2 border-[#b8ae9e] pl-3">
                                    {res().handLabel.toUpperCase()}
                                </span>
                            </Show>
                        </div>
                    </div>
                </div>
            )}
        </Show>
    );
};
