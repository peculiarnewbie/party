import { createMemo, For, Show } from "solid-js";
import { ChipStack, TableCard, useArrivalBase } from "~/components/casino";
import type { PlayerInfoView, PlayerHandView } from "~/game/blackjack";
import { handValueLabel, OUTCOMES } from "./blackjack-felt";

export function PlayerArea(props: {
    player: PlayerInfoView;
    isCurrentTurn: boolean;
    results?: { hands: { outcome: string; payout: number }[] } | null;
}) {
    return (
        <div
            data-testid={`blackjack-player-${props.player.id}`}
            data-current-turn={props.isCurrentTurn ? "true" : "false"}
            class="flex flex-wrap justify-center gap-6"
        >
            <For each={props.player.hands} keyed={false}>
                {(hand, handIndex) => (
                    <PhoneHand
                        hand={hand()}
                        playerId={props.player.id}
                        handIndex={handIndex}
                        label={
                            props.player.hands.length > 1
                                ? `Hand ${handIndex + 1}`
                                : null
                        }
                        active={
                            props.isCurrentTurn &&
                            handIndex === props.player.currentHandIndex
                        }
                        outcome={props.results?.hands[handIndex]?.outcome}
                        compact={props.player.hands.length > 1}
                    />
                )}
            </For>
            <Show when={props.player.insuranceBet > 0}>
                <div class="w-full text-center font-bebas tracking-[.15em] text-[#1a3a6e]">
                    Insured: ${props.player.insuranceBet}
                </div>
            </Show>
        </div>
    );
}

function PhoneHand(props: {
    hand: PlayerHandView;
    playerId: string;
    handIndex: number;
    label: string | null;
    active: boolean;
    outcome: string | undefined;
    compact: boolean;
}) {
    const base = useArrivalBase(() => props.hand.cards.length);
    const outcome = createMemo(() =>
        props.outcome ? OUTCOMES[props.outcome] : undefined,
    );
    const width = () => (props.compact ? 72 : 104);
    return (
        <div
            data-testid={`blackjack-hand-${props.playerId}-${props.handIndex}`}
            data-card-count={props.hand.cards.length}
            data-value={handValueLabel(props.hand)}
            class={`relative flex flex-col items-center px-3 pt-5 pb-3 border-[3px] transition-all duration-300 ${props.active ? "border-dashed border-[#c0261a] bg-[#f5c542]/25" : "border-transparent"}`}
        >
            <Show when={props.label}>
                <span
                    class={`mb-3 font-bebas tracking-[.2em] text-sm ${props.active ? "text-[#c0261a]" : "text-[#5a5040]"}`}
                >
                    {props.label}
                    {props.active ? " · Active" : ""}
                </span>
            </Show>
            <div class="relative flex" style={{ "--deal-from-y": "-260px" }}>
                <For each={props.hand.cards} keyed={false}>
                    {(card, index) => (
                        <div
                            style={{
                                "margin-left":
                                    index > 0 ? `-${width() * 0.55}px` : "0",
                                transform: `translateY(${-index * 4}px) rotate(${(index - (props.hand.cards.length - 1) / 2) * 5}deg)`,
                            }}
                        >
                            <TableCard
                                card={card()}
                                class={props.compact ? "w-[72px]" : "w-[104px]"}
                                delay={Math.max(0, index - base()) * 140}
                                dimmed={props.hand.busted}
                            />
                        </div>
                    )}
                </For>
                <span
                    class={`absolute -top-4 -right-5 z-10 min-w-11 text-center border-2 border-[#1a1a1a] px-2.5 pt-1 font-bebas text-2xl leading-snug shadow-[3px_3px_0_#1a1a1a] ${props.hand.isBlackjack ? "bg-[#f5c542] text-[#1a1a1a]" : props.hand.busted ? "bg-[#c0261a] text-[#f7f2de]" : "bg-[#f7f2de] text-[#1a1a1a]"}`}
                >
                    {props.hand.isBlackjack
                        ? "BJ"
                        : props.hand.busted
                          ? "BUST"
                          : `${props.hand.soft ? "Soft " : ""}${props.hand.value}`}
                </span>
                <Show when={outcome()} keyed>
                    {(style) => (
                        <span
                            class={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 whitespace-nowrap border-[3px] border-[#1a1a1a] px-4 pt-1.5 font-bebas tracking-wider text-3xl shadow-[4px_4px_0_#1a1a1a] animate-stamp-in [--stamp-rot:-6deg] ${style.badge}`}
                        >
                            {style.label}
                        </span>
                    )}
                </Show>
            </div>
            <Show when={props.hand.bet > 0}>
                <div class="mt-3 flex items-center gap-2">
                    <ChipStack amount={props.hand.bet} size={24} showLabel={false} />
                    <span class="font-bebas text-xl tracking-wider text-[#1a3a6e]">
                        ${props.hand.bet}
                        {props.hand.doubled ? " (2x)" : ""}
                    </span>
                </div>
            </Show>
        </div>
    );
}
