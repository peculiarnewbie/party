import { SpicyBoard, SpicyStatus } from "./spicy-board";
import { TrophyArt } from "./spicy-card";
import type { SpicyTableView } from "~/game/spicy/table-view";

export function SpicyTableDisplay(props: { view: SpicyTableView }) {
    return (
        <section
            data-testid="spicy-table-display"
            class="mx-auto max-w-[1600px] space-y-5 p-6 font-karla text-ink"
        >
            <header class="flex items-center justify-between">
                <h1 class="border-2 border-ink bg-sun px-4 py-2 font-bebas text-4xl shadow-ink">
                    SPICY
                </h1>
                <div class="flex items-center gap-2 font-bebas text-2xl">
                    <TrophyArt />
                    {props.view.trophiesRemaining} LEFT
                </div>
            </header>
            <SpicyStatus view={props.view} display />
            <SpicyBoard view={props.view} display />
        </section>
    );
}
