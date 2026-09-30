import { SixNimmtBoard } from "./six-nimmt/six-nimmt-board";
import { Match, Switch } from "solid-js";
import { Flip7TableDisplay } from "./flip-7/flip-7-table-display";
import { BlackjackTableDisplay } from "./blackjack/blackjack-table-display";
import { PerudoTableDisplay } from "./perudo/perudo-table-display";
import type { PartyGame } from "~/room/display-protocol";

export function PartyGameDisplay(props: { game: PartyGame }) {
    return (
        <Switch>
            <Match
                when={props.game.type === "six_nimmt" ? props.game.view : null}
            >
                {(view) => (
                    <div class="h-[calc(100dvh-72px)] p-4">
                        <SixNimmtBoard view={view()} />
                    </div>
                )}
            </Match>
            <Match when={props.game.type === "flip_7" ? props.game.view : null}>
                {(view) => <Flip7TableDisplay view={view()} />}
            </Match>
            <Match
                when={props.game.type === "blackjack" ? props.game.view : null}
            >
                {(view) => <BlackjackTableDisplay view={view()} />}
            </Match>
            <Match when={props.game.type === "perudo" ? props.game.view : null}>
                {(view) => <PerudoTableDisplay view={view()} />}
            </Match>
        </Switch>
    );
}
