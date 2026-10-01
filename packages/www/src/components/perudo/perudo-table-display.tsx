import { PerudoBoard, PerudoStatus } from "./perudo-board";
import type { PerudoTableView } from "~/game/perudo/table-view";

export function PerudoTableDisplay(props: { view: PerudoTableView }) {
    return (
        <section
            data-testid="perudo-table-display"
            class="mx-auto max-w-[1600px] space-y-5 px-6 py-5"
        >
            <header class="flex items-center justify-between gap-3 font-bebas">
                <h1 class="text-4xl">PERUDO</h1>
                <span class="text-2xl">ROUND {props.view.roundNumber}</span>
            </header>
            <PerudoStatus view={props.view} display />
            <PerudoBoard view={props.view} large />
        </section>
    );
}
