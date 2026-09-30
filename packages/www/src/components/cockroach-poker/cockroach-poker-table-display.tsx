import {
    CockroachPokerBoard,
    CockroachPokerStatus,
} from "./cockroach-poker-board";
import type { CockroachPokerTableView } from "~/game/cockroach-poker/table-view";

export function CockroachPokerTableDisplay(props: {
    view: CockroachPokerTableView;
}) {
    return (
        <section
            data-testid="cockroach-poker-table-display"
            class="mx-auto max-w-[1600px] space-y-6 p-5 lg:p-8 font-karla text-ink"
        >
            <header class="flex flex-wrap items-center justify-between gap-4 font-bebas tracking-wider">
                <h1 class="border-2 border-ink bg-sun px-4 py-2 text-4xl shadow-ink">
                    Cockroach Poker
                </h1>
                <p class="text-2xl">Bluff. Pass. Call.</p>
            </header>
            <CockroachPokerStatus view={props.view} display />
            <CockroachPokerBoard view={props.view} display />
        </section>
    );
}
