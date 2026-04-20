import { For, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Link, useNavigate } from "@tanstack/solid-router";
import type { GameFixtureModule, FixtureMeta } from "~/game/fixture-module";

interface FixtureIslandProps {
    fixtureModule: GameFixtureModule;
    fixtureId: string;
    playerId: string;
}

export function FixtureIsland(props: FixtureIslandProps) {
    const [expanded, setExpanded] = createSignal(false);
    const [showHelp, setShowHelp] = createSignal(false);
    const navigate = useNavigate();

    const fixtures = () =>
        Object.values(props.fixtureModule.fixtures) as FixtureMeta[];

    const currentFixture = () =>
        fixtures().find((fixture) => fixture.id === props.fixtureId);

    const go = (nextFixtureId: string, nextPlayerId: string) => {
        navigate({
            to: "/dev/$game",
            params: { game: props.fixtureModule.game },
            search: { fixture: nextFixtureId, playerId: nextPlayerId },
        });
    };

    const cycleFixture = (direction: 1 | -1) => {
        const items = fixtures();
        if (items.length === 0) return;
        const idx = items.findIndex((fixture) => fixture.id === props.fixtureId);
        const base = idx === -1 ? 0 : idx;
        const nextIdx = (base + direction + items.length) % items.length;
        const next = items[nextIdx];
        go(next.id, next.primaryPlayerId);
    };

    const cyclePlayer = (direction: 1 | -1) => {
        const items = props.fixtureModule.playerIds;
        if (items.length === 0) return;
        const idx = items.indexOf(props.playerId);
        const base = idx === -1 ? 0 : idx;
        const nextIdx = (base + direction + items.length) % items.length;
        go(props.fixtureId, items[nextIdx]);
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (
            target &&
            (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.isContentEditable)
        ) {
            return;
        }
        if (event.key === "?") {
            event.preventDefault();
            setShowHelp((value) => !value);
            return;
        }
        if (event.key === "[") {
            event.preventDefault();
            cycleFixture(-1);
            return;
        }
        if (event.key === "]") {
            event.preventDefault();
            cycleFixture(1);
            return;
        }
        if (event.key === ",") {
            event.preventDefault();
            cyclePlayer(-1);
            return;
        }
        if (event.key === ".") {
            event.preventDefault();
            cyclePlayer(1);
            return;
        }
    };

    onMount(() => {
        window.addEventListener("keydown", onKeyDown);
        onCleanup(() => window.removeEventListener("keydown", onKeyDown));
    });

    return (
        <div
            data-testid="fixture-island"
            class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]"
            style={{ "font-family": "'DM Mono', 'Fira Mono', monospace" }}
            onMouseEnter={() => setExpanded(true)}
            onMouseLeave={() => setExpanded(false)}
        >
            <div class="rounded-full bg-black/85 backdrop-blur border border-white/15 shadow-[0_8px_24px_rgba(0,0,0,.45)] text-white/90 overflow-hidden">
                <Show
                    when={expanded()}
                    fallback={
                        <button
                            type="button"
                            onClick={() => setExpanded(true)}
                            class="flex items-center gap-3 px-4 py-2 text-[11px] tracking-widest"
                        >
                            <span class="w-1.5 h-1.5 rounded-full bg-green-400" />
                            <span class="uppercase text-white/50">
                                {props.fixtureModule.title}
                            </span>
                            <span class="text-white/90">
                                {currentFixture()?.id ?? props.fixtureId}
                            </span>
                            <span class="text-white/30">as {props.playerId}</span>
                            <span class="text-white/30">·</span>
                            <span class="text-white/50">?</span>
                        </button>
                    }
                >
                    <div class="px-4 py-3 flex flex-col gap-3 min-w-[520px]">
                        <div class="flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 text-[11px]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-400" />
                                <span class="uppercase tracking-widest text-white/50">
                                    {props.fixtureModule.title}
                                </span>
                            </div>
                            <Link
                                to="/dev"
                                class="text-[11px] text-white/40 hover:text-white/90 transition-colors"
                            >
                                ← all fixtures
                            </Link>
                        </div>

                        <div>
                            <div class="text-[9px] tracking-widest text-white/30 uppercase mb-1.5">
                                fixture · [ / ]
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                <For each={fixtures()}>
                                    {(fixture) => (
                                        <button
                                            type="button"
                                            data-testid={`fixture-chip-${fixture.id}`}
                                            onClick={() =>
                                                go(
                                                    fixture.id,
                                                    fixture.primaryPlayerId,
                                                )
                                            }
                                            class="px-2.5 py-1 rounded-full text-[11px] transition-colors border"
                                            classList={{
                                                "border-white/80 bg-white/90 text-black":
                                                    fixture.id === props.fixtureId,
                                                "border-white/15 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white/95":
                                                    fixture.id !== props.fixtureId,
                                            }}
                                            title={fixture.description}
                                        >
                                            {fixture.id}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </div>

                        <div>
                            <div class="text-[9px] tracking-widest text-white/30 uppercase mb-1.5">
                                player · , / .
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                <For each={props.fixtureModule.playerIds}>
                                    {(playerId) => (
                                        <button
                                            type="button"
                                            data-testid={`player-chip-${playerId}`}
                                            onClick={() =>
                                                go(props.fixtureId, playerId)
                                            }
                                            class="px-2.5 py-1 rounded-full text-[11px] transition-colors border"
                                            classList={{
                                                "border-white/80 bg-white/90 text-black":
                                                    playerId === props.playerId,
                                                "border-white/15 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white/95":
                                                    playerId !== props.playerId,
                                            }}
                                        >
                                            {playerId}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </div>

                        <Show when={currentFixture()?.description}>
                            <div class="text-[11px] text-white/50 leading-snug pt-1 border-t border-white/10">
                                {currentFixture()?.description}
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>

            <Show when={showHelp()}>
                <div class="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/85 backdrop-blur border border-white/15 text-white/80 text-[11px] px-4 py-3 whitespace-nowrap shadow-[0_8px_24px_rgba(0,0,0,.45)]">
                    <div class="mb-1 text-white/50 uppercase tracking-widest text-[9px]">
                        keyboard
                    </div>
                    <div>
                        <kbd class="bg-white/10 px-1.5 py-0.5 rounded">[</kbd>{" "}
                        <kbd class="bg-white/10 px-1.5 py-0.5 rounded">]</kbd>{" "}
                        previous / next fixture
                    </div>
                    <div>
                        <kbd class="bg-white/10 px-1.5 py-0.5 rounded">,</kbd>{" "}
                        <kbd class="bg-white/10 px-1.5 py-0.5 rounded">.</kbd>{" "}
                        previous / next player
                    </div>
                    <div>
                        <kbd class="bg-white/10 px-1.5 py-0.5 rounded">?</kbd>{" "}
                        toggle this help
                    </div>
                </div>
            </Show>
        </div>
    );
}
