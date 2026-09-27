import { createMemo, For, Show } from "solid-js";
import { Confetti, PlayerAvatar } from "~/components/casino";
import { PokerFelt } from "./poker-felt";
import { potResults } from "./hand-events";
import type { PokerTableView } from "~/game/poker/table-view";

export function PokerTableDisplay(props: {
    view: PokerTableView;
    title: string;
}) {
    const acting = () =>
        props.view.players.find(
            (player) => player.id === props.view.actingPlayerId,
        );
    const finished = () =>
        ["hand_over", "tournament_over"].includes(props.view.street);
    const results = createMemo(() =>
        finished() ? potResults(props.view.eventLog, props.view.players) : [],
    );
    const showdown = () =>
        results().length > 0 && results().some((result) => !result.uncontested);
    const nameOf = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Someone";
    const standings = () =>
        [...props.view.players].sort((a, b) => b.stack - a.stack);

    return (
        <section
            data-testid="poker-table-display"
            class="relative mx-auto w-full max-w-[1800px] px-6 pt-4 pb-6 flex flex-col items-center"
        >
            <div class="w-full flex items-center justify-between gap-4 mb-2 font-bebas tracking-wider">
                <h1 class="text-4xl bg-[#c0261a] text-[#f7f2de] border-2 border-[#1a1a1a] px-4 pt-1.5 pb-0.5 shadow-[4px_4px_0_#1a1a1a] -rotate-2">
                    {props.title}
                </h1>
                <div aria-live="polite" class="text-5xl text-[#1a1a1a]">
                    <Show
                        when={acting()}
                        fallback={
                            <span>
                                {props.view.endedByHost
                                    ? "Game ended by host"
                                    : props.view.street === "tournament_over"
                                      ? "Game over"
                                      : finished()
                                        ? "Hand complete"
                                        : "Shuffling up…"}
                            </span>
                        }
                    >
                        {(player) => (
                            <span class="inline-flex items-center gap-3 animate-rise-in">
                                <PlayerAvatar
                                    id={player().id}
                                    name={player().name}
                                    index={props.view.players.findIndex((entry) => entry.id === player().id)}
                                    class="w-12 h-12 text-2xl"
                                />
                                <span>
                                    {player().name}’s turn
                                </span>
                            </span>
                        )}
                    </Show>
                </div>
                <span class="text-2xl text-[#1a1a1a] border-2 border-[#1a1a1a] bg-[#f7f2de] px-4 pt-1.5 pb-0.5 shadow-[4px_4px_0_#1a1a1a]">
                    Hand {props.view.handNumber} ·{" "}
                    <span class="text-[#c0261a]">
                        {props.view.street.replaceAll("_", " ")}
                    </span>
                </span>
            </div>

            <div class="relative w-full max-w-[calc((100vh-200px)*2.15)] pt-[3%]">
                <PokerFelt
                    players={props.view.players}
                    board={props.view.board}
                    pots={props.view.pots}
                    street={props.view.street}
                    handNumber={props.view.handNumber}
                    eventLog={props.view.eventLog}
                    title={props.title}
                    seatTestIdPrefix="display-seat"
                    center={
                        <Show when={finished() && results().length > 0}>
                            <div
                                data-testid="poker-hand-winners"
                                role="status"
                                class="flex flex-col items-center gap-[calc(var(--u)*0.4)] rounded-[calc(var(--u)*0.8)] border-[length:calc(var(--u)*0.35)] border-[#1a1a1a] bg-[#f5c542] px-[calc(var(--u)*3)] pt-[calc(var(--u)*1.2)] pb-[calc(var(--u)*0.8)] shadow-[calc(var(--u)*0.6)_calc(var(--u)*0.6)_0_#1a1a1a] animate-stamp-in"
                                style={{ "--stamp-rot": "-2deg" }}
                            >
                                <For each={results()}>
                                    {(result) => (
                                        <div class="text-center">
                                            <div class="font-bebas text-[#1a1a1a] text-[calc(var(--u)*3)] leading-none whitespace-nowrap">
                                                {result.winnerIds.length > 0
                                                    ? result.winnerIds.map(nameOf).join(" & ")
                                                    : result.message.split(" won ")[0]}{" "}
                                                {result.winnerIds.length > 1 ? "split" : "wins"}{" "}
                                                {result.amount}
                                            </div>
                                            <div class="font-bebas tracking-[.2em] text-[#c0261a] text-[calc(var(--u)*1.5)] leading-tight">
                                                {result.uncontested
                                                    ? "Everyone else folded"
                                                    : result.handLabel}
                                            </div>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                    }
                />

            </div>

            <Show when={showdown() ? props.view.handNumber : null} keyed>
                {(_hand) => <Confetti count={70} />}
            </Show>

            <Show when={props.view.street === "tournament_over"}>
                <div class="absolute inset-0 z-50 flex items-center justify-center bg-[#1a3a6e]/85">
                    <Show when={!props.view.endedByHost}>
                        <Confetti count={140} />
                    </Show>
                    <div class="w-full max-w-2xl border-[3px] border-[#1a1a1a] bg-[#ddd5c4] p-10 text-center shadow-[12px_12px_0_#1a1a1a] animate-stamp-in [--stamp-rot:-1deg]">
                        <p class="inline-block font-bebas tracking-[.3em] text-2xl bg-[#c0261a] text-[#f7f2de] px-4 pt-1">
                            {props.view.endedByHost ? "Table closed" : "Champion"}
                        </p>
                        <h2 class="font-bebas text-[#1a1a1a] text-8xl leading-none mt-4">
                            {standings()[0]?.name ?? "—"}
                        </h2>
                        <ol class="mt-8 space-y-3 text-left">
                            <For each={standings()}>
                                {(player, index) => (
                                    <li
                                        class={`flex items-center gap-4 border-2 border-[#1a1a1a] px-5 py-3 shadow-[4px_4px_0_#1a1a1a] animate-rise-in ${index() === 0 ? "bg-[#f5c542]" : "bg-[#f7f2de]"}`}
                                        style={{ "animation-delay": `${300 + index() * 120}ms` }}
                                    >
                                        <span class="font-bebas text-3xl w-8 text-[#c0261a]">
                                            {index() + 1}
                                        </span>
                                        <PlayerAvatar
                                            id={player.id}
                                            name={player.name}
                                            index={props.view.players.findIndex((entry) => entry.id === player.id)}
                                            class="w-11 h-11 text-xl"
                                        />
                                        <span class="font-bebas text-3xl text-[#1a1a1a] flex-1">
                                            {player.name}
                                        </span>
                                        <span class="font-bebas text-3xl text-[#1a3a6e]">
                                            {player.stack}
                                        </span>
                                    </li>
                                )}
                            </For>
                        </ol>
                        <p class="mt-8 text-xl text-[#5a5040]">
                            The host can return everyone to the lobby from their phone.
                        </p>
                    </div>
                </div>
            </Show>

        </section>
    );
}
