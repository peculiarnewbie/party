import { For, Show } from "solid-js";
import { SvgDice } from "~/assets/svg-dice";
import { PartyTableFrame } from "~/components/party-table-frame";
import type { PerudoTableView } from "~/game/perudo/table-view";

export function PerudoTableDisplay(props: { view: PerudoTableView }) {
    const name = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const status = () => {
        if (props.view.phase === "game_over")
            return props.view.winners?.length
                ? `${props.view.winners.map(name).join(" & ")} wins`
                : "Game over";
        if (props.view.phase === "revealing")
            return "Challenge · reveal the dice";
        return props.view.phase === "round_start"
            ? `${name(props.view.currentPlayerId)} opens the bidding`
            : `${name(props.view.currentPlayerId)}’s turn to bid`;
    };
    return (
        <PartyTableFrame
            game="perudo"
            title="Perudo"
            round={props.view.roundNumber}
            phase={props.view.phase}
            status={status()}
        >
            <div class="rounded-[3rem] border-4 border-[#d4a017] bg-[#0d2818] p-6 text-[#f5e6c8]">
                <p class="text-center text-xl mb-4">
                    {props.view.totalDiceInPlay} dice in play ·{" "}
                    {props.view.palificoRound
                        ? "Palifico: ones are not wild"
                        : "Ones are wild"}
                </p>
                <Show
                    when={props.view.currentBid}
                    fallback={
                        <p class="text-center font-bebas text-4xl mb-6">
                            Waiting for the opening bid
                        </p>
                    }
                >
                    {(bid) => (
                        <div
                            data-testid="perudo-display-bid"
                            class="text-center mb-6"
                        >
                            <p class="font-bebas text-5xl text-[#d4a017]">
                                {bid().quantity} ×{" "}
                                {bid().faceValue === 1 ? "A" : bid().faceValue}
                            </p>
                            <p class="text-xl mt-2">
                                {name(bid().playerId)}’s bid
                            </p>
                        </div>
                    )}
                </Show>
                <Show
                    when={
                        props.view.lastChallengeResult &&
                        (props.view.phase === "revealing" ||
                            props.view.phase === "game_over")
                            ? props.view.lastChallengeResult
                            : null
                    }
                >
                    {(result) => (
                        <p
                            data-testid="perudo-display-result"
                            class="text-center font-bebas text-3xl mb-6 text-[#d4a017]"
                        >
                            {result().actualCount} matching dice ·{" "}
                            {name(result().loserId)} lost a die
                        </p>
                    )}
                </Show>
                <div class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
                    <For each={props.view.players}>
                        {(player) => (
                            <div
                                data-testid={`display-seat-${player.id}`}
                                data-visible-dice-count={
                                    player.dice?.length ?? 0
                                }
                                data-acting={String(player.isCurrentPlayer)}
                                class={`min-w-0 border-2 p-4 ${player.isCurrentPlayer ? "border-[#d4a017] bg-[#1a3a2a]" : "border-[#d4a017]/30"}`}
                            >
                                <h2 class="font-bebas text-3xl truncate">
                                    {player.name}
                                </h2>
                                <p class="text-lg my-2">
                                    {player.eliminated
                                        ? "Eliminated"
                                        : `${player.diceCount} dice`}
                                </p>
                                <div class="flex flex-wrap gap-1">
                                    <Show
                                        when={player.dice}
                                        fallback={
                                            <For
                                                each={Array.from({
                                                    length: player.diceCount,
                                                })}
                                            >
                                                {() => (
                                                    <span
                                                        aria-label="Hidden die"
                                                        class="block w-10 h-10 rounded-lg border-2 border-[#d4a017]/40 bg-[#1a3a2a]"
                                                    />
                                                )}
                                            </For>
                                        }
                                    >
                                        {(dice) => (
                                            <For each={dice()}>
                                                {(die) => (
                                                    <SvgDice
                                                        side={die}
                                                        size={40}
                                                        color="#1a3a2a"
                                                        dotColor="#d4a017"
                                                    />
                                                )}
                                            </For>
                                        )}
                                    </Show>
                                </div>
                            </div>
                        )}
                    </For>
                </div>
            </div>
        </PartyTableFrame>
    );
}
