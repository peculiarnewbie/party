import type { Component } from "solid-js";
import { Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { PokerPlayerPublicView } from "~/game/poker";

export const TableSeat: Component<{
    player: PokerPlayerPublicView;
    isMe: boolean;
    lastAction?: string;
}> = (props) => {
    const statusLabel = () => {
        if (!props.player.connected && props.player.status !== "all_in") {
            return "DISCONNECTED";
        }
        switch (props.player.status) {
            case "active":
                return "IN";
            case "folded":
                return "FOLDED";
            case "all_in":
                return "ALL-IN";
            case "busted":
                return "BUSTED";
            case "disconnected":
                return "OUT";
        }
    };

    return (
        <div
            data-testid={`poker-seat-${props.player.id}`}
            data-status={props.player.status}
            data-acting={String(props.player.isActing)}
            data-connected={String(props.player.connected)}
            data-visible-card-count={props.player.visibleHoleCards.length}
            data-hole-card-count={props.player.holeCardCount}
            class={`min-w-[120px] border-2 px-2.5 py-2 transition-all duration-[120ms] ${
                props.player.isActing
                    ? "border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] shadow-[3px_3px_0_#1a1a1a] -translate-x-0.5 -translate-y-0.5"
                    : "border-[#b8ae9e] bg-[#c9c0b0] text-[#1a1a1a]"
            } ${props.isMe ? "border-[#c0261a] border-2" : ""}`}
        >
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                    <div class="font-bebas text-[.85rem] tracking-[.08em] leading-none truncate">
                        {props.player.name}
                    </div>
                    <div class="font-bebas text-[.55rem] tracking-[.16em] opacity-60 mt-0.5">
                        {statusLabel()}
                        <Show when={props.lastAction && props.player.isActing}>
                            <span class="ml-1 text-[#ddd5c4]/80">
                                &middot; {props.lastAction?.toUpperCase()}
                            </span>
                        </Show>
                    </div>
                </div>
                <div class="flex gap-1 flex-wrap justify-end shrink-0">
                    {props.player.isDealer && (
                        <span class="font-bebas text-[.5rem] tracking-[.12em] bg-[#1a1a1a] px-1 py-0.5 text-[#ddd5c4]">
                            D
                        </span>
                    )}
                    {props.player.isSmallBlind && (
                        <span class="font-bebas text-[.5rem] tracking-[.12em] bg-[#c0261a] px-1 py-0.5 text-[#ddd5c4]">
                            SB
                        </span>
                    )}
                    {props.player.isBigBlind && (
                        <span class="font-bebas text-[.5rem] tracking-[.12em] bg-[#1a3a6e] px-1 py-0.5 text-[#ddd5c4]">
                            BB
                        </span>
                    )}
                </div>
            </div>

            <div class="mt-2 flex items-center gap-1.5">
                <div class="flex -space-x-4">
                    {props.player.visibleHoleCards.length > 0
                        ? props.player.visibleHoleCards.map((card) => (
                              <div class="w-[26px]">
                                  <PlayingCard
                                      suit={card.suit}
                                      rank={card.rank}
                                      class="w-full"
                                  />
                              </div>
                          ))
                        : Array.from({
                              length: Math.min(props.player.holeCardCount, 2),
                          }).map(() => (
                              <div class="w-[26px]">
                                  <CardBack class="w-full" />
                              </div>
                          ))}
                </div>
                <div class="font-bebas text-[.55rem] tracking-[.14em] opacity-55">
                    {props.player.holeCardCount}
                </div>
            </div>

            <div class="mt-2 flex items-end justify-between">
                <div class="font-bebas text-[1.1rem] leading-none">
                    {props.player.stack}
                </div>
                <Show when={props.player.committedThisStreet > 0}>
                    <div class="font-bebas text-[.75rem] leading-none opacity-60">
                        +{props.player.committedThisStreet}
                    </div>
                </Show>
            </div>
        </div>
    );
};
