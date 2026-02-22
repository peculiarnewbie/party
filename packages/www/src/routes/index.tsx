import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { nanoid } from "nanoid";
import { SvgDice } from "~/assets/svg-dice";
import { SvgPawn } from "~/assets/svg-pawn";
import { SvgCard } from "~/assets/svg-card";
import { SvgToken } from "~/assets/svg-token";
import { SvgStar } from "~/assets/svg-star";
import { SvgBrain } from "~/assets/svg-brain";
import { SvgLetterA } from "~/assets/svg-letter-a";
import { SvgTimer } from "~/assets/svg-timer";

export const Route = createFileRoute("/")({
    component: Index,
});

// ─── Game types ─────────────────────────────────────────────────────────────

const GAMES = [
    { id: "trivia", label: "Trivia" },
    { id: "word", label: "Word Games" },
    { id: "quick", label: "Quick Play" },
    { id: "party", label: "Party Pack" },
] as const;

type GameId = (typeof GAMES)[number]["id"];

function GameIcon({ id, active }: { id: GameId; active: boolean }) {
    const c = active ? "#ddd5c4" : "#1a3a6e";
    if (id === "trivia") return <SvgBrain color={c} size={24} />;
    if (id === "word") return <SvgLetterA color={c} size={24} />;
    if (id === "quick") return <SvgTimer color={c} size={24} />;
    return <SvgStar color={c} size={24} />;
}

// ─── Component ──────────────────────────────────────────────────────────────

function Index() {
    const [roomCode, setRoomCode] = createSignal("");
    const [sel, setSel] = createSignal<GameId>("trivia");

    const join = (e: Event) => {
        e.preventDefault();
        if (roomCode().trim())
            window.location.href = `/room/${roomCode().trim()}`;
    };

    const create = () => {
        window.location.href = `/room/${nanoid(6)}`;
    };

    return (
        <div class="min-h-screen grid grid-cols-[2fr_1fr] bg-[#ddd5c4] font-karla overflow-hidden max-sm:grid-cols-1">
            {/* ── Left: content ── */}
            <div class="pt-12 pr-10 pb-20 pl-12 flex flex-col justify-center min-h-screen relative z-[1] max-sm:px-6 max-sm:py-10">
                <div class="inline-block self-start font-bebas text-[.95rem] tracking-[.18em] bg-[#c0261a] text-[#ddd5c4] px-4 py-1 mb-4">
                    Party Games
                </div>

                <div class="flex items-center gap-16 mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-4">
                    <h1 class="font-bebas text-[clamp(2.8rem,4.5vw,5rem)] text-[#1a1a1a] leading-[.9] tracking-[.02em] whitespace-nowrap shrink-0 m-0 flex flex-col max-sm:whitespace-normal">
                        <div>Game Night</div>
                        <div>
                            <span class="text-[#c0261a]">Starts</span> Here
                        </div>
                    </h1>

                    {/* 1 — Join existing room */}
                    <form
                        class="flex flex-col gap-2 flex-1 min-w-0 max-sm:w-full"
                        onSubmit={join}
                    >
                        <input
                            class="flex-1 min-w-0 bg-[#c9c0b0] border-2 border-[#b8ae9e] px-4 py-[.85rem] font-bebas text-[1.25rem] tracking-[.1em] text-[#1a1a1a] outline-none transition-[border-color] duration-150 focus:border-[#1a1a1a] placeholder:text-[#9a9080]"
                            placeholder="ROOM CODE"
                            value={roomCode()}
                            onInput={(e) =>
                                setRoomCode(e.currentTarget.value)
                            }
                            autocomplete="off"
                            spellcheck={false}
                        />
                        <button
                            class="font-bebas text-[1.25rem] tracking-[.12em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-3 cursor-pointer whitespace-nowrap shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] w-full disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#1a1a1a]"
                            type="submit"
                            disabled={!roomCode().trim()}
                        >
                            Join →
                        </button>
                    </form>
                </div>

                <div class="h-[3px] bg-[#1a1a1a] mb-6" />

                {/* — OR — */}
                <div class="flex items-center gap-3 mt-[.6rem] mb-4 text-[#7a7060] font-bebas text-[.85rem] tracking-[.2em]">
                    <div class="flex-1 h-px bg-[#b8ae9e]" />
                    OR
                    <div class="flex-1 h-px bg-[#b8ae9e]" />
                </div>

                {/* 2 — Pick game type */}
                <div class="grid grid-cols-4 gap-2 mb-3 max-sm:grid-cols-2">
                    <For each={GAMES}>
                        {(g) => (
                            <button
                                class={`flex flex-col items-start gap-[.45rem] p-[.8rem_.75rem] border-2 cursor-pointer font-bebas text-[.95rem] tracking-[.07em] transition-all duration-[120ms] text-left leading-[1.1] ${
                                    sel() === g.id
                                        ? "bg-[#1a3a6e] border-[#1a3a6e] text-[#ddd5c4]"
                                        : "bg-[#c9c0b0] border-[#b8ae9e] text-[#5a5040] hover:bg-[#bfb5a4] hover:border-[#5a5040] hover:text-[#1a1a1a]"
                                }`}
                                onClick={() => setSel(g.id)}
                            >
                                <GameIcon
                                    id={g.id}
                                    active={sel() === g.id}
                                />
                                {g.label}
                            </button>
                        )}
                    </For>
                </div>

                {/* 3 — Create */}
                <button
                    class="w-full font-bebas text-[1.25rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-[.85rem] cursor-pointer shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                    onClick={create}
                >
                    + New Game
                </button>
            </div>

            {/* ── Right: decorative blue slab ── */}
            <div
                class="bg-[#1a3a6e] relative overflow-hidden max-sm:hidden"
                style={{ "clip-path": "polygon(22% 0, 100% 0, 100% 100%, 0% 100%)" }}
            >
                {/* Subtle concentric rings for depth */}
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "320px", height: "320px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "200px", height: "200px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />
                <div
                    class="absolute rounded-full border-2 border-white/[.07]"
                    style={{ width: "80px", height: "80px", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                />

                {/* Floating pieces */}
                <div
                    style={{ position: "absolute", top: "12%", left: "50%", transform: "translateX(-50%)", animation: "bob1 4s ease-in-out infinite" }}
                >
                    <SvgDice color="#ddd5c4" size={72} />
                </div>
                <div
                    style={{ position: "absolute", top: "43%", left: "55%", transform: "translateX(-50%)", animation: "bob2 5.5s ease-in-out 1s infinite" }}
                >
                    <SvgPawn color="#c0261a" size={64} />
                </div>
                <div
                    style={{ position: "absolute", top: "68%", left: "45%", transform: "translateX(-50%)", animation: "bob3 5s ease-in-out .5s infinite" }}
                >
                    <SvgCard color="#ddd5c4" size={58} />
                </div>

                {/* Small token accents */}
                <div
                    style={{ position: "absolute", top: "28%", right: "12%", opacity: ".45", animation: "bob1 6s ease-in-out 2s infinite" }}
                >
                    <SvgToken color="#ddd5c4" size={32} />
                </div>
                <div
                    style={{ position: "absolute", bottom: "18%", left: "20%", opacity: ".35", animation: "bob2 7s ease-in-out .8s infinite" }}
                >
                    <SvgToken color="#c0261a" size={24} />
                </div>
                <div
                    style={{ position: "absolute", top: "58%", right: "8%", opacity: ".3", animation: "bob3 4.5s ease-in-out 1.5s infinite" }}
                >
                    <SvgToken color="#ddd5c4" size={20} />
                </div>
            </div>
        </div>
    );
}
