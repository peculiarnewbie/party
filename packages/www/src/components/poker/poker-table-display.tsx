import { For, Show } from "solid-js";
import { CardBack, PlayingCard } from "~/assets/card-deck";
import { CommunityBoard } from "./community-board";
import { PotDisplay } from "./pot-display";
import type { PokerTableView } from "~/game/poker/table-view";

export function PokerTableDisplay(props: {
    view: PokerTableView;
    title: string;
}) {
    const acting = () =>
        props.view.players.find(
            (player) => player.id === props.view.actingPlayerId,
        );
    const result = () =>
        props.view.eventLog.find((event) => event.type === "pot_awarded");
    const finished = () =>
        ["hand_over", "tournament_over"].includes(props.view.street);

    return (
        <section
            data-testid="poker-table-display"
            class="mx-auto w-full max-w-[1600px] px-6 py-5"
        >
            <div class="flex items-center justify-between gap-4 mb-6 font-bebas tracking-wider">
                <h1 class="text-4xl">{props.title}</h1>
                <span class="text-2xl">
                    Hand {props.view.handNumber} ·{" "}
                    {props.view.street.replaceAll("_", " ")}
                </span>
            </div>
            <div class="rounded-[3rem] border-4 border-[#1a1a1a] bg-[#c9c0b0] px-8 py-6 text-center shadow-[8px_8px_0_#1a1a1a]">
                <div
                    aria-live="polite"
                    class="font-bebas text-4xl tracking-wider mb-4 text-[#1a3a6e]"
                >
                    <Show
                        when={acting()}
                        fallback={
                            <span>
                                {props.view.endedByHost
                                    ? "Game ended by host"
                                    : finished()
                                      ? "Hand complete"
                                      : "Waiting for the next hand"}
                            </span>
                        }
                    >
                        {(player) => <span>{player().name}’s turn</span>}
                    </Show>
                </div>
                <CommunityBoard board={props.view.board} />
                <div class="mt-4">
                    <PotDisplay pots={props.view.pots} />
                </div>
                <Show when={finished() && result()}>
                    {(event) => (
                        <p class="font-bebas text-3xl mt-4 text-[#c0261a]">
                            {event().message}
                        </p>
                    )}
                </Show>
                <Show when={props.view.street === "tournament_over"}>
                    <p class="mt-3 text-xl">
                        Game complete. The host can return everyone to the lobby
                        from their phone.
                    </p>
                </Show>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 mt-8">
                <For each={props.view.players}>
                    {(player, index) => (
                        <div
                            data-testid={`display-seat-${player.id}`}
                            data-acting={String(player.isActing)}
                            data-visible-card-count={
                                player.visibleHoleCards.length
                            }
                            class={`border-2 p-4 ${player.isActing ? "border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] shadow-[5px_5px_0_#1a1a1a]" : "border-[#b8ae9e] bg-[#c9c0b0]"}`}
                        >
                            <div class="flex items-center justify-between gap-3">
                                <h2 class="font-bebas text-3xl truncate">
                                    {index() + 1}. {player.name}
                                </h2>
                                <span class="font-bebas text-lg">
                                    {player.isDealer ? "D " : ""}
                                    {player.isSmallBlind ? "SB" : ""}
                                    {player.isBigBlind ? "BB" : ""}
                                </span>
                            </div>
                            <div class="flex items-center justify-between gap-3 mt-3">
                                <div class="flex gap-1">
                                    <Show
                                        when={
                                            player.visibleHoleCards.length > 0
                                        }
                                        fallback={
                                            <For
                                                each={Array.from({
                                                    length: player.holeCardCount,
                                                })}
                                            >
                                                {() => (
                                                    <div class="w-12 shrink-0">
                                                        <CardBack class="w-full" />
                                                    </div>
                                                )}
                                            </For>
                                        }
                                    >
                                        <For each={player.visibleHoleCards}>
                                            {(card) => (
                                                <div class="w-12 shrink-0">
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
                                <div class="text-right">
                                    <div class="font-bebas text-3xl">
                                        {player.stack}
                                    </div>
                                    <div class="text-sm">
                                        Bet {player.committedThisStreet}
                                    </div>
                                </div>
                            </div>
                            <p class="mt-3 uppercase tracking-widest text-sm">
                                {player.connected
                                    ? player.status.replaceAll("_", " ")
                                    : "Disconnected"}
                            </p>
                        </div>
                    )}
                </For>
            </div>
        </section>
    );
}
