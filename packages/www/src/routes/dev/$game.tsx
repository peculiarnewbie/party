import { createFileRoute, notFound } from "@tanstack/solid-router";
import { createMemo, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import z from "zod";
import { FixtureIsland } from "~/components/dev/fixture-island";
import { getFixtureModule } from "./-fixtures";

const searchSchema = z.object({
    fixture: z.string().optional(),
    playerId: z.string().optional(),
    step: z.coerce.number().int().positive().optional(),
    island: z.enum(["hidden"]).optional(),
});

export const Route = createFileRoute("/dev/$game")({
    beforeLoad: () => {
        if (import.meta.env.PROD) throw notFound();
    },
    validateSearch: searchSchema,
    component: DevGameViewer,
});

function DevGameViewer() {
    const params = Route.useParams();
    const search = Route.useSearch();

    const fixtureModule = createMemo(() => getFixtureModule(params().game));

    const fixtureId = createMemo(() => {
        const module = fixtureModule();
        if (!module) return "";
        const requested = search().fixture;
        if (requested && requested in module.fixtures) return requested;
        return module.defaultFixtureId;
    });

    const playerId = createMemo(() => {
        const module = fixtureModule();
        if (!module) return "";
        const requested = search().playerId;
        if (requested && module.playerIds.includes(requested)) return requested;
        const fixture = module.fixtures[fixtureId()];
        return fixture?.primaryPlayerId ?? module.playerIds[0] ?? "";
    });

    return (
        <Show
            when={fixtureModule()}
            fallback={<UnknownGame name={params().game} />}
        >
            {(module) => (
                <div class="min-h-screen">
                    <style>{`
                        *, *::before, *::after {
                            animation: none !important;
                            transition: none !important;
                            caret-color: transparent;
                        }
                    `}</style>
                    <Dynamic
                        component={module().Harness}
                        fixtureId={fixtureId()}
                        playerId={playerId()}
                        step={search().step}
                    />
                    <Show when={search().island !== "hidden"}>
                        <FixtureIsland
                            fixtureModule={module()}
                            fixtureId={fixtureId()}
                            playerId={playerId()}
                        />
                    </Show>
                </div>
            )}
        </Show>
    );
}

function UnknownGame(props: { name: string }) {
    return (
        <div
            class="min-h-screen flex items-center justify-center text-white/80"
            style={{
                background:
                    "linear-gradient(160deg, #0c0c14 0%, #0f0f1a 50%, #0a0a12 100%)",
                "font-family":
                    "'DM Mono', 'Fira Mono', 'Courier New', monospace",
            }}
        >
            <div class="max-w-lg text-center px-6">
                <div class="text-[10px] tracking-widest text-white/30 uppercase mb-2">
                    dev / fixtures
                </div>
                <h1 class="text-3xl font-black mb-3">
                    No fixtures for "{props.name}"
                </h1>
                <p class="text-white/50 text-sm mb-6">
                    Export a <code class="text-white/80">gameFixtureModule</code>{" "}
                    from{" "}
                    <code class="text-white/80">
                        src/game/{props.name}/fixtures.ts
                    </code>{" "}
                    to make it discoverable here.
                </p>
                <a
                    href="/dev"
                    class="inline-block px-4 py-2 rounded-full border border-white/20 bg-white/5 text-[11px] hover:bg-white/10"
                >
                    ← all fixtures
                </a>
            </div>
        </div>
    );
}
