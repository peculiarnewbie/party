import { For, Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import type { PokerPlayerPublicView } from "~/game/poker";

export function OpponentHands(props: { players: PokerPlayerPublicView[] }) {
    return (
        <section
            data-testid="poker-opponent-hands"
            aria-label="Other players’ cards"
        >
            <h2 class="font-bebas text-lg tracking-wider">
                Other players’ cards
            </h2>
            <p class="text-sm mb-3">
                Your cards are hidden. Keep this screen to yourself.
            </p>
            <div
                tabindex="0"
                aria-label="Scroll through other players’ cards"
                class="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto overscroll-contain p-1"
            >
                <For each={props.players}>
                    {(player) => (
                        <div
                            data-testid={`poker-opponent-hand-${player.id}`}
                            data-visible-card-count={
                                player.visibleHoleCards.length
                            }
                            class={`min-w-0 border-2 p-2 ${player.isActing ? "border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4]" : "border-[#b8ae9e] bg-[#c9c0b0]"}`}
                        >
                            <h3
                                class="font-bebas tracking-wider truncate"
                                title={player.name}
                            >
                                {player.name}
                            </h3>
                            <div class="flex gap-1 my-1">
                                <Show
                                    when={player.visibleHoleCards.length > 0}
                                    fallback={
                                        <For
                                            each={Array.from({
                                                length: player.holeCardCount,
                                            })}
                                        >
                                            {() => (
                                                <div class="w-9 shrink-0">
                                                    <CardBack class="w-full" />
                                                </div>
                                            )}
                                        </For>
                                    }
                                >
                                    <For each={player.visibleHoleCards}>
                                        {(card) => (
                                            <div class="w-9 shrink-0">
                                                <PlayingCard
                                                    suit={card.suit}
                                                    rank={card.rank}
                                                    class="w-full"
                                                />
                                            </div>
                                        )}
                                    </For>
                                </Show>
                            </div>
                            <p class="text-xs">
                                {player.stack} chips ·{" "}
                                {player.connected
                                    ? player.status.replaceAll("_", " ")
                                    : "disconnected"}
                            </p>
                        </div>
                    )}
                </For>
            </div>
        </section>
    );
}
