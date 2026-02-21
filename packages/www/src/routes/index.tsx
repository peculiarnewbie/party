import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For } from "solid-js";
import { nanoid } from "nanoid";

export const Route = createFileRoute("/")({
    component: Index,
});

// ─── Flat SVG game pieces ───────────────────────────────────────────────────

function SvgDice({ color, size = 56 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
            <rect x="3" y="3" width="42" height="42" rx="9" fill={color} />
            <circle cx="14" cy="14" r="4" fill="white" fill-opacity=".85" />
            <circle cx="34" cy="14" r="4" fill="white" fill-opacity=".85" />
            <circle cx="24" cy="24" r="4" fill="white" fill-opacity=".85" />
            <circle cx="14" cy="34" r="4" fill="white" fill-opacity=".85" />
            <circle cx="34" cy="34" r="4" fill="white" fill-opacity=".85" />
        </svg>
    );
}

function SvgPawn({ color, size = 52 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size * 1.3} viewBox="0 0 40 52" fill="none">
            <circle cx="20" cy="11" r="9" fill={color} />
            <path
                d="M11 50 L14 33 Q17 26 20 24 Q23 26 26 33 L29 50 Z"
                fill={color}
            />
            <rect x="8" y="45" width="24" height="6" rx="3" fill={color} />
        </svg>
    );
}

function SvgCard({ color, size = 44 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size * 1.4} viewBox="0 0 36 50" fill="none">
            <rect x="2" y="2" width="32" height="46" rx="6" fill={color} />
            <rect
                x="7"
                y="9"
                width="22"
                height="15"
                rx="3"
                fill="white"
                fill-opacity=".2"
            />
            <rect
                x="7"
                y="30"
                width="13"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".4"
            />
            <rect
                x="7"
                y="36"
                width="20"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".28"
            />
            <rect
                x="7"
                y="42"
                width="9"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".18"
            />
        </svg>
    );
}

function SvgToken({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <circle cx="18" cy="18" r="16" fill={color} />
            <circle
                cx="18"
                cy="18"
                r="11"
                fill="none"
                stroke="white"
                stroke-width="1.5"
                stroke-opacity=".3"
            />
            <circle cx="18" cy="18" r="4" fill="white" fill-opacity=".5" />
        </svg>
    );
}

function SvgStar({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <polygon
                points="18,7 21,15 30,15 23,20 26,29 18,23 10,29 13,20 6,15 15,15"
                fill="white"
                fill-opacity=".82"
            />
        </svg>
    );
}

function SvgBrain({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <circle cx="14" cy="16" r="5" fill="white" fill-opacity=".6" />
            <circle cx="22" cy="16" r="5" fill="white" fill-opacity=".6" />
            <path
                d="M14 16 Q18 20 22 16"
                stroke="white"
                stroke-width="1.5"
                stroke-opacity=".6"
                fill="none"
                stroke-linecap="round"
            />
            <rect
                x="16"
                y="22"
                width="4"
                height="5"
                rx="2"
                fill="white"
                fill-opacity=".5"
            />
        </svg>
    );
}

function SvgLetterA({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <text
                x="18"
                y="26"
                text-anchor="middle"
                font-size="20"
                font-weight="900"
                fill="white"
                fill-opacity=".85"
                font-family="Georgia,serif"
            >
                A
            </text>
        </svg>
    );
}

function SvgTimer({ color, size = 28 }: { color: string; size?: number }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
            <rect x="2" y="2" width="32" height="32" rx="7" fill={color} />
            <circle
                cx="18"
                cy="20"
                r="8"
                stroke="white"
                stroke-width="2"
                stroke-opacity=".7"
            />
            <line
                x1="18"
                y1="20"
                x2="18"
                y2="14"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-opacity=".85"
            />
            <line
                x1="18"
                y1="20"
                x2="22"
                y2="23"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-opacity=".85"
            />
            <rect
                x="15"
                y="9"
                width="6"
                height="3"
                rx="1.5"
                fill="white"
                fill-opacity=".6"
            />
        </svg>
    );
}

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
