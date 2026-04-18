import { createFileRoute } from "@tanstack/solid-router";
import z from "zod";
import { PokerFixtureHarness } from "~/components/poker/poker-fixture-harness";
import {
    getDefaultFixturePlayerId,
    getFixturePlayerIds,
    POKER_FIXTURE_IDS,
} from "~/game/poker/fixtures";

const searchSchema = z.object({
    fixture: z.enum(POKER_FIXTURE_IDS).catch("standard-my-turn"),
    playerId: z.string().optional(),
});

export const Route = createFileRoute("/dev/poker-fixture")({
    validateSearch: searchSchema,
    component: PokerFixtureRoute,
});

function PokerFixtureRoute() {
    const search = Route.useSearch();
    const playerId = () => {
        const requestedPlayerId = search().playerId;
        if (requestedPlayerId && getFixturePlayerIds().includes(requestedPlayerId)) {
            return requestedPlayerId;
        }

        return getDefaultFixturePlayerId(search().fixture);
    };

    return (
        <div class="min-h-screen bg-[#ddd5c4]">
            <style>{`
                *, *::before, *::after {
                    animation: none !important;
                    transition: none !important;
                    caret-color: transparent;
                }
            `}</style>
            <PokerFixtureHarness
                fixtureId={search().fixture}
                playerId={playerId()}
            />
        </div>
    );
}
