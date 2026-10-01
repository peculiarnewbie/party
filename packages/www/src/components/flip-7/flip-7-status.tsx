import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { Flip7ActionArt, FLIP_7_ACTION_LABELS } from "./flip-7-card";
import type { Flip7TableView } from "~/game/flip-7/table-view";

export function Flip7Status(props: { view: Flip7TableView }) {
    const actor = () =>
        props.view.players.find(
            (player) =>
                player.id ===
                (props.view.targetChoice?.chooserPlayerId ??
                    props.view.currentPlayerId),
        );
    const finished = () =>
        props.view.phase === "game_over" || props.view.phase === "round_over";
    return (
        <div
            role="status"
            class={`table-mat border-3 border-ink p-3 shadow-ink ${finished() ? "bg-teal text-cream" : "bg-navy text-cream"}`}
        >
            <div class="flex items-center gap-3">
                <Show
                    when={props.view.targetChoice}
                    fallback={
                        <Show when={actor()}>
                            {(player) => (
                                <PlayerAvatar
                                    id={player().id}
                                    name={player().name}
                                />
                            )}
                        </Show>
                    }
                >
                    {(choice) => (
                        <Flip7ActionArt
                            action={choice().card}
                            class="h-16 w-16 shrink-0"
                        />
                    )}
                </Show>
                <div class="min-w-0 flex-1">
                    <span class="font-bebas text-sm tracking-wider">
                        {props.view.phase === "game_over"
                            ? "GAME OVER"
                            : props.view.phase === "round_over"
                              ? "ROUND COMPLETE"
                              : props.view.targetChoice
                                ? FLIP_7_ACTION_LABELS[
                                      props.view.targetChoice!.card
                                  ]
                                : props.view.phase === "turn"
                                  ? "TURN"
                                  : "DEALING"}
                    </span>
                    <h2 class="break-words font-bebas text-3xl leading-none">
                        {props.view.phase === "game_over"
                            ? props.view.winners?.length
                                ? props.view.players
                                      .filter((player) =>
                                          props.view.winners?.includes(
                                              player.id,
                                          ),
                                      )
                                      .map((player) => player.name)
                                      .join(" & ") + " WINS"
                                : "GAME ENDED"
                            : props.view.phase === "round_over"
                              ? props.view.lastRoundResult?.flip7WinnerId
                                  ? "FLIP 7! +15"
                                  : "POINTS BANKED"
                              : props.view.targetChoice
                                ? `${actor()?.name ?? "Player"} · choose a player`
                                : (actor()?.name ?? "OPENING CARDS")}
                    </h2>
                </div>
            </div>
        </div>
    );
}

export function Flip7Results(props: { view: Flip7TableView }) {
    const ranking = () =>
        [...props.view.players].sort((a, b) => b.totalScore - a.totalScore);
    return (
        <div class="border-3 border-ink bg-cream p-3 shadow-ink">
            <div class="mb-2 flex justify-between font-bebas text-sm tracking-wider text-muted">
                <span>LEADERBOARD</span>
                <span>ROUND / TOTAL</span>
            </div>
            <For each={ranking()} keyed={false}>
                {(player, index) => (
                    <div class="flex items-center gap-3 border-t-2 border-ink/15 py-2">
                        <span class="w-4 font-bebas text-xl">{index + 1}</span>
                        <PlayerAvatar
                            id={player().id}
                            name={player().name}
                            class="h-9 w-9 text-xl"
                        />
                        <span class="min-w-0 flex-1 break-words font-bebas text-xl">
                            {player().name}
                        </span>
                        <span class="font-bebas text-xl text-teal">
                            +
                            {props.view.lastRoundResult?.scores.find(
                                (score) => score.playerId === player().id,
                            )?.score ?? 0}
                        </span>
                        <strong class="min-w-12 shrink-0 text-right font-bebas text-2xl">
                            {player().totalScore}
                        </strong>
                    </div>
                )}
            </For>
        </div>
    );
}
