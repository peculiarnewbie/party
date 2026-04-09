import { createFileRoute } from "@tanstack/solid-router";
import z from "zod";
import { YahtzeeFixtureHarness } from "~/components/yahtzee/yahtzee-fixture-harness";
import {
    getDefaultFixturePlayerId,
    getFixturePlayerIds,
    YAHTZEE_FIXTURE_IDS,
} from "~/game/yahtzee/fixtures";

const searchSchema = z.object({
    fixture: z.enum(YAHTZEE_FIXTURE_IDS).catch("standard-my-turn-pre-roll"),
    playerId: z.string().optional(),
    step: z.coerce.number().int().positive().optional(),
});

export const Route = createFileRoute("/dev/yahtzee-fixture")({
    validateSearch: searchSchema,
    component: YahtzeeFixtureRoute,
});

function YahtzeeFixtureRoute() {
    const search = Route.useSearch();
    const playerId = () => {
        const requestedPlayerId = search().playerId;
        if (requestedPlayerId && getFixturePlayerIds().includes(requestedPlayerId)) {
            return requestedPlayerId;
        }

        return getDefaultFixturePlayerId(search().fixture);
    };

    return (
        <div class="min-h-screen bg-[#2d0c00]">
            <style>{`
                *, *::before, *::after {
                    animation: none !important;
                    transition: none !important;
                    caret-color: transparent;
                }
            `}</style>
            <YahtzeeFixtureHarness
                fixtureId={search().fixture}
                playerId={playerId()}
                step={search().step}
            />
        </div>
    );
}
