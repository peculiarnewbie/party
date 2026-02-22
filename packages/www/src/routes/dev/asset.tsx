import { createFileRoute } from "@tanstack/solid-router";
import { For, createSignal } from "solid-js";
import { SvgPawn } from "~/assets/svg-pawn";
import { SvgCard } from "~/assets/svg-card";
import { SvgBrain } from "~/assets/svg-brain";
import { SvgDice } from "~/assets/svg-dice";
import { SvgLetterA } from "~/assets/svg-letter-a";
import { SvgStar } from "~/assets/svg-star";
import { SvgTimer } from "~/assets/svg-timer";
import { SvgToken } from "~/assets/svg-token";
import { SpadeCard, SvgSpade } from "~/assets/card-deck";
import type { SpadeRank } from "~/assets/card-deck";

export const Route = createFileRoute("/dev/asset")({
    component: AssetGallery,
});

const PALETTE = [
    { name: "coral",   hex: "#e84855" },
    { name: "amber",   hex: "#f4a261" },
    { name: "jade",    hex: "#52b788" },
    { name: "ocean",   hex: "#457b9d" },
    { name: "violet",  hex: "#7c5cbf" },
    { name: "rose",    hex: "#e56b6f" },
    { name: "slate",   hex: "#64748b" },
    { name: "ink",     hex: "#1a1a2e" },
];

const DICE_SIDES = [1, 2, 3, 4, 5, 6] as const;
const SPADE_RANKS: SpadeRank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function Chip({ label }: { label: string }) {
    return (
        <span class="inline-block px-2 py-0.5 rounded text-[10px] font-mono tracking-wide bg-white/10 text-white/50 border border-white/10">
            {label}
        </span>
    );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: any }) {
    return (
        <section class="mb-16">
            <div class="mb-6 pb-3 border-b border-white/10">
                <h2 class="text-xs font-mono tracking-[0.25em] uppercase text-white/40 mb-1">{title}</h2>
                {subtitle && <p class="text-white/25 text-xs font-mono">{subtitle}</p>}
            </div>
            {children}
        </section>
    );
}

function AssetTile({ name, props, children }: { name: string; props: string; children: any }) {
    const [hovered, setHovered] = createSignal(false);
    return (
        <div
            class="relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-200 cursor-default select-none"
            classList={{
                "border-white/20 bg-white/5 scale-[1.02]": hovered(),
                "border-white/8 bg-white/[0.03]": !hovered(),
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <div class="flex items-center justify-center min-h-[64px]">
                {children}
            </div>
            <div class="text-center space-y-1">
                <div class="text-[11px] font-mono text-white/70">{name}</div>
                <div class="text-[10px] font-mono text-white/30">{props}</div>
            </div>
        </div>
    );
}

function ColorRow({ name, render }: { name: string; render: (color: string) => any }) {
    return (
        <div class="mb-8">
            <div class="flex items-center gap-3 mb-3">
                <span class="text-xs font-mono text-white/50">{name}</span>
                <div class="flex-1 h-px bg-white/8" />
            </div>
            <div class="flex flex-wrap gap-3">
                <For each={PALETTE}>
                    {(swatch) => (
                        <AssetTile name={name} props={`color="${swatch.name}"`}>
                            {render(swatch.hex)}
                        </AssetTile>
                    )}
                </For>
            </div>
        </div>
    );
}

function AssetGallery() {
    return (
        <div
            class="min-h-screen text-white"
            style={{
                background: "linear-gradient(160deg, #0c0c14 0%, #0f0f1a 50%, #0a0a12 100%)",
                "font-family": "'DM Mono', 'Fira Mono', 'Courier New', monospace",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;700;900&display=swap');
                .noise-bg::before {
                    content: '';
                    position: fixed;
                    inset: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
                    pointer-events: none;
                    z-index: 0;
                    opacity: 0.5;
                }
                .content { position: relative; z-index: 1; }
            `}</style>

            <div class="noise-bg" />

            <div class="content max-w-6xl mx-auto px-8 py-16">

                {/* Header */}
                <header class="mb-16">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span class="text-xs font-mono text-white/30 tracking-widest uppercase">dev / asset</span>
                    </div>
                    <h1
                        class="text-5xl font-black mb-3 tracking-tight"
                        style={{
                            "font-family": "'DM Sans', sans-serif",
                            background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)",
                            "-webkit-background-clip": "text",
                            "-webkit-text-fill-color": "transparent",
                            "background-clip": "text",
                        }}
                    >
                        Asset Gallery
                    </h1>
                    <p class="text-white/35 text-sm font-mono">
                        All SVG components from <Chip label="~/assets/" /> — rendered live with color variants
                    </p>

                    {/* Palette legend */}
                    <div class="mt-6 flex flex-wrap gap-2 items-center">
                        <span class="text-[10px] font-mono text-white/25 mr-1">palette</span>
                        <For each={PALETTE}>
                            {(s) => (
                                <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/10 bg-white/5">
                                    <div
                                        class="w-2.5 h-2.5 rounded-full"
                                        style={{ background: s.hex }}
                                    />
                                    <span class="text-[10px] font-mono text-white/40">{s.name}</span>
                                </div>
                            )}
                        </For>
                    </div>
                </header>

                {/* Game Icons */}
                <Section title="Game Icons" subtitle="~/assets/svg-*.tsx — color + size props">
                    <ColorRow name="SvgPawn" render={(c) => <SvgPawn color={c} size={52} />} />
                    <ColorRow name="SvgCard" render={(c) => <SvgCard color={c} size={44} />} />
                    <ColorRow name="SvgBrain" render={(c) => <SvgBrain color={c} size={48} />} />
                    <ColorRow name="SvgLetterA" render={(c) => <SvgLetterA color={c} size={48} />} />
                    <ColorRow name="SvgStar" render={(c) => <SvgStar color={c} size={48} />} />
                    <ColorRow name="SvgTimer" render={(c) => <SvgTimer color={c} size={48} />} />
                    <ColorRow name="SvgToken" render={(c) => <SvgToken color={c} size={48} />} />
                </Section>

                {/* Dice */}
                <Section title="SvgDice" subtitle="~/assets/svg-dice.tsx — color · dotColor · side 1–6 · size">
                    <div class="space-y-6">
                        <For each={PALETTE.slice(0, 4)}>
                            {(swatch) => (
                                <div>
                                    <div class="flex items-center gap-2 mb-3">
                                        <div class="w-2.5 h-2.5 rounded-full" style={{ background: swatch.hex }} />
                                        <span class="text-[10px] font-mono text-white/35">{swatch.name}</span>
                                    </div>
                                    <div class="flex gap-3 flex-wrap">
                                        <For each={DICE_SIDES}>
                                            {(side) => (
                                                <AssetTile name="SvgDice" props={`side={${side}}`}>
                                                    <SvgDice color={swatch.hex} side={side} size={56} />
                                                </AssetTile>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            )}
                        </For>
                    </div>
                </Section>

                {/* Spade Suit Symbol */}
                <Section title="SvgSpade" subtitle="~/assets/card-deck/suit-spade.tsx — standalone spade symbol">
                    <div class="flex flex-wrap gap-3">
                        <For each={[24, 32, 48, 64, 80]}>
                            {(sz) => (
                                <AssetTile name="SvgSpade" props={`size={${sz}}`}>
                                    <SvgSpade size={sz} color="white" />
                                </AssetTile>
                            )}
                        </For>
                        <For each={PALETTE}>
                            {(s) => (
                                <AssetTile name="SvgSpade" props={`color="${s.name}"`}>
                                    <SvgSpade size={40} color={s.hex} />
                                </AssetTile>
                            )}
                        </For>
                    </div>
                </Section>

                {/* Spade Cards */}
                <Section title="SpadeCard" subtitle="~/assets/card-deck/spade-card.tsx — rank 1–10">
                    <div
                        class="rounded-2xl p-6 overflow-x-auto"
                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                    >
                        <div class="flex gap-4 min-w-max pb-2">
                            <For each={SPADE_RANKS}>
                                {(rank) => (
                                    <div class="flex flex-col items-center gap-2">
                                        <SpadeCard rank={rank} size={100} />
                                        <span class="text-[10px] font-mono text-white/30">rank={rank}</span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>

                    <div class="mt-6 rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div class="text-[10px] font-mono text-white/30 mb-4">large preview — size=200</div>
                        <div class="flex gap-6 overflow-x-auto pb-2">
                            <For each={[1, 7, 10] as SpadeRank[]}>
                                {(rank) => (
                                    <div class="flex flex-col items-center gap-2 shrink-0">
                                        <SpadeCard rank={rank} size={200} />
                                        <span class="text-[10px] font-mono text-white/30">
                                            {rank === 1 ? "Ace" : rank === 10 ? "Ten" : `rank=${rank}`}
                                        </span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </div>
                </Section>

                {/* Size Scale reference */}
                <Section title="Size Scale" subtitle="SvgToken across all sizes for reference">
                    <div class="flex items-end gap-6 flex-wrap">
                        <For each={[16, 24, 32, 48, 64, 80, 96]}>
                            {(sz) => (
                                <div class="flex flex-col items-center gap-2">
                                    <SvgToken color={PALETTE[3].hex} size={sz} />
                                    <span class="text-[10px] font-mono text-white/30">{sz}px</span>
                                </div>
                            )}
                        </For>
                    </div>
                </Section>

                <footer class="pt-8 border-t border-white/8 text-[10px] font-mono text-white/20 flex gap-6">
                    <span>~/assets/</span>
                    <span>{PALETTE.length} palette swatches</span>
                    <span>10 spade ranks</span>
                    <span>8 icon components</span>
                </footer>
            </div>
        </div>
    );
}
