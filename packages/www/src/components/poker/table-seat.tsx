import type { Component } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { PokerPlayerPublicView } from "~/game/poker";

export const TableSeat: Component<{
    player: PokerPlayerPublicView;
    isMe: boolean;
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
            class={`min-w-[175px] border-2 px-4 py-3 transition-all duration-[120ms] ${
                props.player.isActing
                    ? "border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] shadow-[3px_3px_0_#1a1a1a] -translate-x-0.5 -translate-y-0.5"
                    : "border-[#b8ae9e] bg-[#c9c0b0] text-[#1a1a1a]"
            } ${props.isMe ? "border-[#c0261a] border-2" : ""}`}
        >
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="font-bebas text-[1rem] tracking-[.08em] leading-none">
                        {props.player.name}
                    </div>
                    <div class="font-bebas text-[.65rem] tracking-[.18em] opacity-60 mt-1">
                        {statusLabel()}
                    </div>
                </div>
                <div class="flex gap-1 flex-wrap justify-end">
                    {props.player.isDealer && (
                        <span class="font-bebas text-[.6rem] tracking-[.15em] bg-[#1a1a1a] px-2 py-0.5 text-[#ddd5c4]">
                            D
                        </span>
                    )}
                    {props.player.isSmallBlind && (
                        <span class="font-bebas text-[.6rem] tracking-[.15em] bg-[#c0261a] px-2 py-0.5 text-[#ddd5c4]">
                            SB
                        </span>
                    )}
                    {props.player.isBigBlind && (
                        <span class="font-bebas text-[.6rem] tracking-[.15em] bg-[#1a3a6e] px-2 py-0.5 text-[#ddd5c4]">
                            BB
                        </span>
                    )}
                </div>
            </div>

            <div class="mt-3 flex items-center gap-2">
                <div class="flex -space-x-6">
                    {props.player.visibleHoleCards.length > 0
                        ? props.player.visibleHoleCards.map((card) => (
                              <div class="w-[34px]">
                                  <PlayingCard
                                      suit={card.suit}
                                      rank={card.rank}
                                      size={34}
                                  />
                              </div>
                          ))
                        : Array.from({
                              length: Math.min(props.player.holeCardCount, 2),
                          }).map(() => (
                              <div class="w-[34px]">
                                  <CardBack size={34} />
                              </div>
                          ))}
                </div>
                <div class="font-bebas text-[.65rem] tracking-[.16em] opacity-55">
                    {props.player.holeCardCount} CARDS
                </div>
            </div>

            <div class="mt-3 flex items-end justify-between">
                <div>
                    <div class="font-bebas text-[.6rem] tracking-[.18em] opacity-50">
                        STACK
                    </div>
                    <div class="font-bebas text-[1.4rem] leading-none">
                        {props.player.stack}
                    </div>
                </div>
                <div class="text-right">
                    <div class="font-bebas text-[.6rem] tracking-[.18em] opacity-50">
                        STREET
                    </div>
                    <div class="font-bebas text-[1rem] leading-none">
                        {props.player.committedThisStreet}
                    </div>
                </div>
            </div>
        </div>
    );
};
