import type { Component } from "solid-js";
import { For, Show } from "solid-js";
import { Confetti, PlayerAvatar } from "~/components/casino";
import type { PokerPlayerPublicView } from "~/game/poker";

export const ResultsOverlay: Component<{
    players: PokerPlayerPublicView[];
    winnerIds: string[] | null;
    endedByHost: boolean;
    isHost: boolean;
    onReturnToLobby: () => void;
}> = (props) => {
    const standings = () =>
        [...props.players].sort((a, b) => b.stack - a.stack);

    const winnerNames = () =>
        standings()
            .filter((player) => props.winnerIds?.includes(player.id))
            .map((player) => player.name)
            .join(" & ");

    return (
        <div
            data-testid="poker-results-overlay"
            class="fixed inset-0 bg-[#1a3a6e]/85 flex items-center justify-center z-50 p-4"
        >
            <Show when={!props.endedByHost}>
                <Confetti count={90} />
            </Show>
            <div class="w-full max-w-[520px] border-[3px] border-[#1a1a1a] bg-[#ddd5c4] px-6 py-6 shadow-[10px_10px_0_#1a1a1a] animate-stamp-in [--stamp-rot:-1deg]">
                <div class="inline-block font-bebas text-sm tracking-[.28em] bg-[#c0261a] text-[#f7f2de] px-2.5 pt-1 mb-3">
                    {props.endedByHost
                        ? "HOST ENDED THE GAME"
                        : "TOURNAMENT COMPLETE"}
                </div>
                <div
                    data-testid="poker-results-title"
                    class="font-bebas text-[#1a1a1a] text-[clamp(2.4rem,9vw,3.6rem)] leading-[.9]"
                >
                    {winnerNames()
                        ? `${winnerNames().toUpperCase()} LEADS`
                        : "TABLE CLOSED"}
                </div>

                <div class="mt-5 space-y-2">
                    <For each={standings()}>
                        {(player, index) => (
                            <div
                                class={`flex items-center justify-between border-2 border-[#1a1a1a] px-3 py-2 shadow-[3px_3px_0_#1a1a1a] animate-rise-in ${index() === 0 ? "bg-[#f5c542]" : "bg-[#f7f2de]"}`}
                                style={{ "animation-delay": `${250 + index() * 110}ms` }}
                            >
                                <div class="flex items-center gap-3">
                                    <span class="font-bebas text-2xl w-6 text-[#c0261a]">
                                        {index() + 1}
                                    </span>
                                    <PlayerAvatar
                                        id={player.id}
                                        name={player.name}
                                        index={props.players.findIndex((entry) => entry.id === player.id)}
                                        class="w-9 h-9 text-lg"
                                    />
                                    <div>
                                        <div
                                            data-testid="poker-standing-name"
                                            class="font-bebas text-xl tracking-[.06em] text-[#1a1a1a] leading-none"
                                        >
                                            {player.name}
                                        </div>
                                        <div class="font-bebas text-xs tracking-[.18em] text-[#5a5040]">
                                            {player.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div class="font-bebas text-2xl tracking-[.06em] text-[#1a3a6e]">
                                    {player.stack}
                                </div>
                            </div>
                        )}
                    </For>
                </div>

                <Show when={props.isHost}>
                    <button
                        type="button"
                        data-testid="poker-return-button"
                        onClick={props.onReturnToLobby}
                        class="mt-6 w-full min-h-14 pt-1 border-2 border-[#1a1a1a] bg-[#c0261a] font-bebas text-2xl tracking-[.12em] text-[#f7f2de] shadow-[4px_4px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1a1a1a] active:translate-x-1 active:translate-y-1 active:shadow-none"
                    >
                        Return To Lobby
                    </button>
                </Show>
            </div>
        </div>
    );
};
