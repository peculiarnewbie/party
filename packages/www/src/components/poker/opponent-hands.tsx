import { For } from "solid-js";
import { PlayerAvatar, TableCard } from "~/components/casino";
import type { PokerPlayerPublicView } from "~/game/poker";

export function OpponentHands(props: {
    players: PokerPlayerPublicView[];
    seatOrder?: string[];
}) {
    return (
        <section
            data-testid="poker-opponent-hands"
            aria-label="Other players’ cards"
            class="border-[3px] border-[#1a1a1a] bg-[#c9c0b0] p-3 shadow-[4px_4px_0_#1a1a1a]"
        >
            <div class="flex items-baseline justify-between gap-2 px-1">
                <h2 class="font-bebas text-xl tracking-wider text-[#1a1a1a]">
                    Other players’ cards
                </h2>
                <span class="font-bebas tracking-[.14em] text-xs text-[#f7f2de] bg-[#1a3a6e] px-1.5 pt-0.5">
                    Backwards poker
                </span>
            </div>
            <p class="text-sm mb-2 px-1 text-[#5a5040]">
                Your cards are hidden. Keep this screen to yourself.
            </p>
            <div
                tabindex="0"
                aria-label="Scroll through other players’ cards"
                class="flex flex-col gap-1.5 max-h-64 overflow-y-auto overscroll-contain"
            >
                <For each={props.players} keyed={false}>
                    {(player) => (
                        <div
                            data-testid={`poker-opponent-hand-${player().id}`}
                            data-visible-card-count={
                                player().visibleHoleCards.length
                            }
                            class={`flex items-center gap-3 border-2 border-[#1a1a1a] px-2.5 py-1.5 transition-all ${player().isActing ? "bg-[#f5c542] shadow-[3px_3px_0_#1a1a1a]" : "bg-[#f7f2de]"} ${player().status === "folded" ? "opacity-50 grayscale" : ""}`}
                        >
                            <PlayerAvatar
                                id={player().id}
                                name={player().name}
                                index={props.seatOrder?.indexOf(player().id)}
                                class="w-9 h-9 text-lg"
                            />
                            <div class="min-w-0 flex-1">
                                <h3
                                    class="font-bebas tracking-wider truncate text-lg leading-none"
                                    title={player().name}
                                >
                                    {player().name}
                                </h3>
                                <p class="text-xs text-[#5a5040]">
                                    <span class="font-bold text-[#1a3a6e]">
                                        {player().stack}
                                    </span>{" "}
                                    ·{" "}
                                    {player().connected
                                        ? player().status.replaceAll("_", " ")
                                        : "disconnected"}
                                </p>
                            </div>
                            <div class="flex gap-1">
                                <For
                                    each={
                                        player().visibleHoleCards.length > 0
                                            ? player().visibleHoleCards
                                            : Array.from(
                                                  {
                                                      length: player()
                                                          .holeCardCount,
                                                  },
                                                  () => null,
                                              )
                                    }
                                    keyed={false}
                                >
                                    {(card) => (
                                        <TableCard
                                            card={card()}
                                            class="w-[50px]"
                                        />
                                    )}
                                </For>
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </section>
    );
}
