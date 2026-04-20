import { createFileRoute, Link, notFound } from "@tanstack/solid-router";
import { For } from "solid-js";
import { fixtureModules } from "./-fixtures";

export const Route = createFileRoute("/dev/")({
    beforeLoad: () => {
        if (import.meta.env.PROD) throw notFound();
    },
    component: DevIndex,
});

function DevIndex() {
    const totalFixtures = () =>
        fixtureModules.reduce(
            (sum, module) => sum + Object.keys(module.fixtures).length,
            0,
        );

    return (
        <div
            class="min-h-screen text-white"
            style={{
                background:
                    "linear-gradient(160deg, #0c0c14 0%, #0f0f1a 50%, #0a0a12 100%)",
                "font-family":
                    "'DM Mono', 'Fira Mono', 'Courier New', monospace",
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=DM+Sans:wght@400;500;700;900&display=swap');
            `}</style>

            <div class="max-w-6xl mx-auto px-8 py-16">
                <header class="mb-16">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span class="text-xs font-mono text-white/30 tracking-widest uppercase">
                            dev / fixtures
                        </span>
                    </div>
                    <h1
                        class="text-5xl font-black mb-3 tracking-tight"
                        style={{
                            "font-family": "'DM Sans', sans-serif",
                            background:
                                "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.5) 100%)",
                            "-webkit-background-clip": "text",
                            "-webkit-text-fill-color": "transparent",
                            "background-clip": "text",
                        }}
                    >
                        Fixture Explorer
                    </h1>
                    <p class="text-white/35 text-sm font-mono">
                        {totalFixtures()} fixtures across {fixtureModules.length}{" "}
                        games. Each fixture renders the real game room with a
                        scripted connection.
                    </p>
                    <div class="mt-6 flex flex-wrap gap-2 items-center">
                        <Link
                            to="/dev/asset"
                            class="px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-[11px] font-mono text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
                        >
                            → asset gallery
                        </Link>
                    </div>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <For each={fixtureModules}>
                        {(module) => (
                            <GameCard fixtureModule={module} />
                        )}
                    </For>
                </div>

                <footer class="mt-16 pt-8 border-t border-white/8 text-[10px] font-mono text-white/20 flex gap-6 flex-wrap">
                    <span>~/game/*/fixtures.ts</span>
                    <span>{fixtureModules.length} modules</span>
                    <span>{totalFixtures()} fixtures</span>
                </footer>
            </div>
        </div>
    );
}

function GameCard(props: {
    fixtureModule: import("~/game/fixture-module").GameFixtureModule;
}) {
    const fixtures = () => Object.values(props.fixtureModule.fixtures);
    return (
        <section
            class="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:border-white/20 hover:bg-white/[0.05]"
        >
            <header class="flex items-baseline justify-between mb-4 pb-3 border-b border-white/8">
                <div>
                    <h2
                        class="text-lg font-black tracking-tight text-white/90"
                        style={{ "font-family": "'DM Sans', sans-serif" }}
                    >
                        {props.fixtureModule.title}
                    </h2>
                    <div class="text-[10px] font-mono text-white/30 mt-0.5">
                        {props.fixtureModule.game} · {fixtures().length} fixtures
                    </div>
                </div>
                <Link
                    to="/dev/$game"
                    params={{ game: props.fixtureModule.game }}
                    class="text-[11px] font-mono text-white/50 hover:text-white/90 transition-colors"
                >
                    open →
                </Link>
            </header>
            <ul class="space-y-1.5">
                <For each={fixtures()}>
                    {(fixture) => (
                        <li>
                            <Link
                                to="/dev/$game"
                                params={{ game: props.fixtureModule.game }}
                                search={{
                                    fixture: fixture.id,
                                    playerId: fixture.primaryPlayerId,
                                }}
                                class="group flex items-start gap-3 py-1.5 px-2 -mx-2 rounded transition-colors hover:bg-white/5"
                            >
                                <span class="text-[10px] font-mono text-white/25 mt-0.5 shrink-0 w-20 truncate">
                                    {fixture.id}
                                </span>
                                <span class="text-[12px] text-white/70 group-hover:text-white/95 leading-snug">
                                    {fixture.description}
                                </span>
                            </Link>
                        </li>
                    )}
                </For>
            </ul>
        </section>
    );
}
