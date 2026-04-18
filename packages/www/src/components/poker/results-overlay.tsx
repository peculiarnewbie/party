import type { Component } from "solid-js";
import { For, Show } from "solid-js";
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
            class="fixed inset-0 bg-[#1a1a1a]/60 flex items-center justify-center z-50 p-4"
        >
            <div class="w-full max-w-[520px] border-2 border-[#1a1a1a] bg-[#ddd5c4] px-6 py-6 shadow-[6px_6px_0_#1a1a1a]">
                <div class="font-bebas text-[.7rem] tracking-[.28em] text-[#c0261a] mb-2">
                    {props.endedByHost ? "HOST ENDED THE GAME" : "TOURNAMENT COMPLETE"}
                </div>
                <div
                    data-testid="poker-results-title"
                    class="font-bebas text-[clamp(2rem,5vw,3rem)] leading-[.9] text-[#1a1a1a]"
                >
                    {winnerNames() ? `${winnerNames().toUpperCase()} LEADS` : "TABLE CLOSED"}
                </div>

                <div class="mt-5 space-y-2">
                    <For each={standings()}>
                        {(player, index) => (
                            <div class="flex items-center justify-between border-b border-[#b8ae9e] pb-2 last:border-b-0">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 flex items-center justify-center bg-[#1a3a6e] text-[#ddd5c4] font-bebas text-[.95rem]">
                                        {index() + 1}
                                    </div>
                                    <div>
                                        <div class="font-bebas text-[1rem] tracking-[.06em] text-[#1a1a1a]">
                                            {player.name}
                                        </div>
                                        <div class="font-bebas text-[.6rem] tracking-[.18em] text-[#9a9080]">
                                            {player.status.toUpperCase()}
                                        </div>
                                    </div>
                                </div>
                                <div class="font-bebas text-[1.2rem] tracking-[.06em] text-[#1a3a6e]">
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
                        class="mt-6 w-full font-bebas text-[1.1rem] tracking-[.12em] border-2 border-[#1a1a1a] bg-[#1a1a1a] text-[#ddd5c4] py-3 cursor-pointer shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                    >
                        Return To Lobby
                    </button>
                </Show>
            </div>
        </div>
    );
};
