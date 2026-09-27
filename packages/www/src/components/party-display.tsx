import { PartyGameDisplay } from "./party-game-display";
import { createSignal, For, Show } from "solid-js";
import { GAME_RULES } from "~/game";
import { createDisplayClient } from "~/room/display-client";
import { SvgCard } from "~/assets/svg-card";
import { SvgDice } from "~/assets/svg-dice";
import { SvgToken } from "~/assets/svg-token";
import { JoinQr } from "./join-qr";
import { PlayerAvatar, SoundToggle } from "./casino";
import { PokerTableDisplay } from "./poker/poker-table-display";

const TILTS = ["-2deg", "1.5deg", "-1deg", "2.5deg", "-3deg", "1deg"];

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
            class="min-h-screen paper text-[#1a1a1a] font-karla overflow-hidden"
        >
            <header class="relative z-10 flex items-center justify-between gap-4 px-6 py-2.5 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a]">
                <div class="font-bebas text-2xl tracking-widest flex items-center gap-3">
                    <span>Party mode</span>
                    <span class="bg-[#1a1a1a] text-[#ddd5c4] px-2.5 pt-1 text-xl">
                        {props.roomId.toUpperCase()}
                    </span>
                </div>
                <div class="flex items-center gap-4">
                    <SoundToggle />
                    <span
                        role="status"
                        class="font-bebas tracking-[.14em] text-base flex items-center gap-2"
                    >
                        <span
                            class={`inline-block w-3 h-3 rounded-full border-2 border-[#1a1a1a] ${client.status() === "connected" ? "bg-[#0f766e]" : "bg-[#f5c542] animate-pulse-fast"}`}
                        />
                        {client.status() === "connected"
                            ? "Live"
                            : client.status() === "connecting"
                              ? "Connecting…"
                              : "Reconnecting — waiting for live updates"}
                    </span>
                    <button
                        type="button"
                        onClick={fullscreen}
                        class="border-2 border-[#1a1a1a] bg-[#f7f2de] px-4 pt-1.5 pb-1 font-bebas tracking-wider shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
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
                fallback={
                    <p class="p-12 font-bebas text-4xl tracking-wider text-center animate-pulse-fast">
                        Connecting to your room…
                    </p>
                }
            >
                {(state) => (
                    <Show
                        when={state().game}
                        fallback={
                            <Show
                                when={state().poker}
                                fallback={
                                    <div class="grid md:grid-cols-[1fr_42%] min-h-[calc(100vh-58px)]">
                                        <section class="flex flex-col justify-center px-10 py-12 lg:px-20 animate-rise-in">
                                            <div class="self-start font-bebas text-xl tracking-[.18em] bg-[#c0261a] text-[#ddd5c4] px-4 pt-1.5 pb-1 mb-5">
                                                Bring everyone to the table
                                            </div>
                                            <h1 class="font-bebas text-[clamp(4rem,9vw,8.5rem)] leading-[.88] mb-6">
                                                Scan. Join.{" "}
                                                <span class="text-[#c0261a]">
                                                    Play.
                                                </span>
                                            </h1>
                                            <p class="text-2xl mb-8 text-[#5a5040] max-w-2xl">
                                                Join on your phone, pick a name,
                                                and keep your cards and dice
                                                close. The host starts the game
                                                from their phone.
                                            </p>
                                            <div class="h-[3px] bg-[#1a1a1a] mb-8 max-w-2xl" />
                                            <Show
                                                when={
                                                    state().phase ===
                                                    "hibernated"
                                                }
                                            >
                                                <p class="border-2 border-[#1a1a1a] bg-[#f7f2de] shadow-[4px_4px_0_#1a1a1a] p-4 mb-6 text-xl max-w-2xl">
                                                    Game paused. A returning
                                                    player can resume it from
                                                    their phone.
                                                </p>
                                            </Show>
                                            <Show
                                                when={
                                                    state().phase === "playing"
                                                }
                                            >
                                                <p class="border-2 border-[#1a1a1a] bg-[#f7f2de] shadow-[4px_4px_0_#1a1a1a] p-4 mb-6 text-xl max-w-2xl">
                                                    This game is played on your
                                                    phones. Party mode is
                                                    available for poker, Flip 7,
                                                    Blackjack, and Perudo.
                                                </p>
                                            </Show>
                                            <h2 class="font-bebas text-3xl tracking-wider mb-4">
                                                Players ·{" "}
                                                {state().players.length}
                                            </h2>
                                            <div class="flex flex-wrap gap-4 max-w-3xl">
                                                <For each={state().players}>
                                                    {(player, index) => (
                                                        <span
                                                            class="flex items-center gap-3 border-2 border-[#1a1a1a] bg-[#f7f2de] pl-2 pr-5 py-2 text-2xl font-bebas tracking-wider shadow-[4px_4px_0_#1a1a1a] animate-stamp-in"
                                                            style={{
                                                                "--stamp-rot":
                                                                    TILTS[
                                                                        index() %
                                                                            TILTS.length
                                                                    ],
                                                            }}
                                                        >
                                                            <PlayerAvatar
                                                                id={player.id}
                                                                name={player.name}
                                                                index={index()}
                                                                class="w-10 h-10 text-xl"
                                                            />
                                                            <span class="pt-1">
                                                                {player.name}
                                                            </span>
                                                        </span>
                                                    )}
                                                </For>
                                            </div>
                                            <Show
                                                when={
                                                    state().players.length === 0
                                                }
                                            >
                                                <p class="text-xl text-[#5a5040]">
                                                    Waiting for the first player
                                                    to join and host.
                                                </p>
                                            </Show>
                                            <p class="mt-10 flex items-center gap-3 text-xl">
                                                <span class="text-[#5a5040]">
                                                    Selected game:
                                                </span>
                                                <span class="font-bebas text-3xl tracking-wider bg-[#1a3a6e] text-[#ddd5c4] px-3 pt-1">
                                                    {
                                                        GAME_RULES[
                                                            state().selectedGameType
                                                        ].label
                                                    }
                                                </span>
                                            </p>
                                        </section>
                                        <aside
                                            class="relative bg-[#1a3a6e] overflow-hidden flex items-center justify-center py-12 pl-[18%] pr-10 max-md:pl-10"
                                            style={{
                                                "clip-path":
                                                    "polygon(18% 0, 100% 0, 100% 100%, 0% 100%)",
                                            }}
                                        >
                                            <For each={[520, 380, 240]}>
                                                {(size) => (
                                                    <div
                                                        class="absolute rounded-full border-2 border-white/[.07] left-[58%] top-1/2 -translate-x-1/2 -translate-y-1/2"
                                                        style={{
                                                            width: `${size}px`,
                                                            height: `${size}px`,
                                                        }}
                                                    />
                                                )}
                                            </For>
                                            <div
                                                class="absolute top-[7%] right-[12%]"
                                                style={{
                                                    animation:
                                                        "bob1 4s ease-in-out infinite",
                                                }}
                                            >
                                                <SvgDice
                                                    color="#ddd5c4"
                                                    size={64}
                                                />
                                            </div>
                                            <div
                                                class="absolute bottom-[8%] right-[18%]"
                                                style={{
                                                    animation:
                                                        "bob3 5s ease-in-out .5s infinite",
                                                }}
                                            >
                                                <SvgCard
                                                    color="#c0261a"
                                                    size={52}
                                                />
                                            </div>
                                            <div
                                                class="absolute bottom-[16%] left-[22%] opacity-40"
                                                style={{
                                                    animation:
                                                        "bob2 6s ease-in-out 1s infinite",
                                                }}
                                            >
                                                <SvgToken
                                                    color="#ddd5c4"
                                                    size={30}
                                                />
                                            </div>
                                            <div
                                                class="relative flex flex-col items-center gap-4 border-[3px] border-[#1a1a1a] bg-[#ddd5c4] p-6 shadow-[10px_10px_0_#1a1a1a] animate-stamp-in [--stamp-rot:1.5deg]"
                                            >
                                                <div class="border-2 border-[#1a1a1a] bg-white p-2 w-full flex justify-center">
                                                    <JoinQr url={joinUrl()} />
                                                </div>
                                                <p class="font-bebas text-4xl tracking-wider leading-none pt-1">
                                                    Join on your phone
                                                </p>
                                                <a
                                                    href={joinUrl()}
                                                    class="text-center break-all underline text-sm text-[#5a5040] max-w-72"
                                                >
                                                    {joinUrl()}
                                                </a>
                                                <p class="text-center text-sm text-[#5a5040] max-w-72">
                                                    Everyone plays from their
                                                    own phone, including the
                                                    host.
                                                </p>
                                            </div>
                                        </aside>
                                    </div>
                                }
                            >
                                {(view) => (
                                    <PokerTableDisplay
                                        view={view()}
                                        title={
                                            state().activeGameType ===
                                            "backwards_poker"
                                                ? "Backwards Poker"
                                                : "Texas Hold’em"
                                        }
                                    />
                                )}
                            </Show>
                        }
                    >
                        {(game) => <PartyGameDisplay game={game()} />}
                    </Show>
                )}
            </Show>
        </main>
    );
}
