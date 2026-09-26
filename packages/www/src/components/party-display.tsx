import { createSignal, For, Show } from "solid-js";
import { GAME_RULES, isPokerGameType } from "~/game";
import { createDisplayClient } from "~/room/display-client";
import { JoinQr } from "./join-qr";
import { PokerTableDisplay } from "./poker/poker-table-display";

export function PartyDisplay(props: { roomId: string }) {
    const client = createDisplayClient(() => props.roomId);
    const joinUrl = () =>
        `${window.location.origin}/room/${encodeURIComponent(props.roomId)}?view=controller`;
    const [fullscreenError, setFullscreenError] = createSignal("");
    const fullscreen = async () => {
        try {
            await document.documentElement.requestFullscreen();
        } catch {
            setFullscreenError("Use your browser’s full-screen option.");
        }
    };

    return (
        <main
            data-testid="party-display"
            class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla"
        >
            <header class="flex items-center justify-between gap-4 border-b-2 border-[#1a1a1a] px-6 py-3">
                <div class="font-bebas text-2xl tracking-widest">
                    Party mode · {props.roomId.toUpperCase()}
                </div>
                <div class="flex items-center gap-4">
                    <span role="status" class="text-sm">
                        {client.status() === "connected"
                            ? "Live"
                            : client.status() === "connecting"
                              ? "Connecting…"
                              : "Reconnecting — waiting for live updates"}
                    </span>
                    <button
                        type="button"
                        onClick={fullscreen}
                        class="border-2 border-[#1a1a1a] px-4 py-2 font-bebas tracking-wider"
                    >
                        Full screen
                    </button>
                </div>
            </header>
            <Show when={fullscreenError()}>
                <p role="status" class="px-6 py-2">
                    {fullscreenError()}
                </p>
            </Show>
            <Show
                when={client.state()}
                fallback={<p class="p-12 text-2xl">Connecting to your room…</p>}
            >
                {(state) => (
                    <Show
                        when={state().poker}
                        fallback={
                            <div class="max-w-6xl mx-auto grid md:grid-cols-[1fr_320px] gap-12 p-10 lg:p-16">
                                <section>
                                    <p class="font-bebas text-xl tracking-widest text-[#c0261a]">
                                        Bring everyone to the table
                                    </p>
                                    <h1 class="font-bebas text-7xl mt-3 mb-6">
                                        Scan. Join. Play.
                                    </h1>
                                    <p class="text-xl mb-8">
                                        Join on your phone, pick a name, and
                                        keep your cards close. The host starts
                                        the game from their phone.
                                    </p>
                                    <Show when={state().phase === "hibernated"}>
                                        <p class="border-2 border-[#1a1a1a] p-4 mb-6 text-xl">
                                            Game paused. A returning player can
                                            resume it from their phone.
                                        </p>
                                    </Show>
                                    <Show
                                        when={
                                            state().phase === "playing" &&
                                            !isPokerGameType(
                                                state().activeGameType,
                                            )
                                        }
                                    >
                                        <p class="border-2 border-[#1a1a1a] p-4 mb-6 text-xl">
                                            This game is played on your phones.
                                            Party mode is available for Texas
                                            Hold’em and Backwards Poker.
                                        </p>
                                    </Show>
                                    <h2 class="font-bebas text-2xl mb-4">
                                        Players · {state().players.length}
                                    </h2>
                                    <div class="flex flex-wrap gap-3">
                                        <For each={state().players}>
                                            {(player) => (
                                                <span class="border-2 border-[#1a1a1a] bg-[#c9c0b0] px-5 py-3 text-2xl font-bebas">
                                                    {player.name}
                                                </span>
                                            )}
                                        </For>
                                    </div>
                                    <Show when={state().players.length === 0}>
                                        <p class="text-lg">
                                            Waiting for the first player to join
                                            and host.
                                        </p>
                                    </Show>
                                    <p class="mt-8 text-lg">
                                        Selected game:{" "}
                                        {
                                            GAME_RULES[state().selectedGameType]
                                                .label
                                        }
                                    </p>
                                </section>
                                <aside class="flex flex-col items-center gap-5">
                                    <JoinQr url={joinUrl()} />
                                    <p class="font-bebas text-3xl tracking-wider">
                                        Join on your phone
                                    </p>
                                    <a
                                        href={joinUrl()}
                                        class="text-center break-all underline"
                                    >
                                        {joinUrl()}
                                    </a>
                                    <p class="text-center">
                                        Everyone plays from their own phone,
                                        including the host.
                                    </p>
                                </aside>
                            </div>
                        }
                    >
                        {(view) => (
                            <PokerTableDisplay
                                view={view()}
                                title={
                                    state().activeGameType === "backwards_poker"
                                        ? "Backwards Poker"
                                        : "Texas Hold’em"
                                }
                            />
                        )}
                    </Show>
                )}
            </Show>
        </main>
    );
}
