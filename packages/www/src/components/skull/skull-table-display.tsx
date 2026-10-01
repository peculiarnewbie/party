import { SkullBoard, SkullStatus } from "./skull-board";
import type { SkullTableView } from "~/game/skull/table-view";

export function SkullTableDisplay(props: { view: SkullTableView }) {
    return (
        <section
            data-testid="skull-table-display"
            class="mx-auto max-w-[1600px] space-y-5 p-6 font-karla text-ink"
        >
            <header class="flex items-center justify-between font-bebas">
                <h1 class="border-2 border-ink bg-sun px-4 py-2 text-4xl shadow-ink">
                    SKULL
                </h1>
                <p class="text-2xl">ROUND {props.view.roundNumber}</p>
            </header>
            <SkullStatus view={props.view} display />
            <SkullBoard view={props.view} display />
        </section>
    );
}
