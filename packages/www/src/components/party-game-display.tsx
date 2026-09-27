import { Match, Switch } from "solid-js";
import { Flip7TableDisplay } from "./flip-7/flip-7-table-display";
import { BlackjackTableDisplay } from "./blackjack/blackjack-table-display";
import { PerudoTableDisplay } from "./perudo/perudo-table-display";
import type { PartyGame } from "~/room/display-protocol";

export function PartyGameDisplay(props: { game: PartyGame }) {
    return (
        <Switch>
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
