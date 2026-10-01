import { For, Show, Match, Switch } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { SpicyCardFace, TrophyArt } from "./spicy-card";
import type { SpicyTableView } from "~/game/spicy/table-view";

export function SpicyStatus(props: {
    view: SpicyTableView;
    display?: boolean;
}) {
    const result = () => {
        const event = props.view.lastPublicResult;
        return event?.type === "challenge_resolved" ? event : null;
    };
    const playerName = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "—";
    const person = (id: string, label: string) => (
        <div class="flex min-w-0 flex-col items-center gap-2">
            <PlayerAvatar
                id={id}
                name={playerName(id)}
                index={props.view.players.findIndex(
                    (player) => player.id === id,
                )}
                class={
                    props.display ? "h-20 w-20 text-5xl" : "h-12 w-12 text-3xl"
                }
            />
            <span
                class={`max-w-40 break-words text-center font-bebas ${props.display ? "text-3xl" : "text-xl"}`}
            >
                {playerName(id)}
            </span>
            <span class="font-bebas text-sm tracking-widest text-cream/80">
                {label}
            </span>
        </div>
    );
    return (
        <div
            class="table-mat border-3 border-ink bg-navy p-4 text-cream shadow-ink"
            role="status"
        >
            <Switch>
                <Match when={props.view.phase === "game_over"}>
                    <div class="flex flex-wrap items-center justify-center gap-5">
                        <TrophyArt class="h-20 w-20" />
                        <For each={props.view.winners ?? []}>
                            {(id) => person(id, "WINNER")}
                        </For>
                        <Show when={!props.view.winners?.length}>
                            <p class="font-bebas text-3xl">GAME OVER</p>
                        </Show>
                    </div>
                </Match>
                <Match when={props.view.stackTop}>
                    {(top) => (
                        <div class="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                            {person(top().ownerId, "CLAIM")}
                            <SpicyCardFace
                                card={{
                                    kind: "standard",
                                    number: top().declaredNumber,
                                    spice: top().declaredSpice,
                                }}
                                large={props.display}
                            />
                            <span
                                aria-hidden="true"
                                class="font-bebas text-3xl"
                            >
                                →
                            </span>
                            {person(
                                props.view.currentPlayerId,
                                props.view.phase === "last_card_window"
                                    ? "LAST CARD"
                                    : "TURN",
                            )}
                            <span class="border-2 border-ink bg-cream px-3 py-1 font-bebas text-lg text-ink">
                                {top().stackSize} IN STACK
                            </span>
                        </div>
                    )}
                </Match>
                <Match when={result()}>
                    {(event) => (
                        <div
                            class="flex flex-wrap items-center justify-center gap-4 sm:gap-6"
                            aria-label={`${playerName(event().winnerId)} wins the ${event().challengedTrait} challenge`}
                        >
                            <div class="space-y-2">
                                <p class="text-center font-bebas text-sm tracking-widest">
                                    CLAIM
                                </p>
                                <SpicyCardFace
                                    card={{
                                        kind: "standard",
                                        number: event().declaredNumber,
                                        spice: event().declaredSpice,
                                    }}
                                    large={props.display}
                                />
                            </div>
                            <span
                                aria-hidden="true"
                                class="font-bebas text-3xl"
                            >
                                →
                            </span>
                            <div class="space-y-2">
                                <p class="text-center font-bebas text-sm tracking-widest">
                                    REVEALED
                                </p>
                                <SpicyCardFace
                                    card={event().actualCard}
                                    large={props.display}
                                />
                            </div>
                            <div class="space-y-3">
                                {person(
                                    event().winnerId,
                                    `+${event().collectedCardCount} ${event().collectedCardCount === 1 ? "CARD" : "CARDS"}`,
                                )}
                                <p class="border-2 border-ink bg-teal px-3 py-1 text-center font-bebas">
                                    {event().challengedTrait === "number"
                                        ? "NUMBER"
                                        : "SPICE"}{" "}
                                    ·{" "}
                                    {event().challengerWon ? "CAUGHT" : "TRUE"}
                                </p>
                            </div>
                        </div>
                    )}
                </Match>
                <Match when={!props.view.stackTop}>
                    <div class="flex items-center justify-center gap-6">
                        {person(props.view.currentPlayerId, "TO PLAY")}
                        <div class="flex h-32 w-24 items-center justify-center border-2 border-cream bg-navy shadow-ink">
                            <span
                                aria-hidden="true"
                                class="font-bebas text-6xl text-sun"
                            >
                                ?
                            </span>
                        </div>
                        <p class="font-bebas text-xl">FRESH STACK</p>
                    </div>
                </Match>
            </Switch>
            <Show
                when={
                    result() &&
                    props.view.phase !== "game_over" &&
                    !props.view.stackTop
                }
            >
                <p class="mt-3 border-t-2 border-cream/30 pt-3 text-right font-bebas text-xl">
                    {playerName(props.view.currentPlayerId)} · TO PLAY
                </p>
            </Show>
        </div>
    );
}

export function SpicyBoard(props: { view: SpicyTableView; display?: boolean }) {
    const points = (id: string) =>
        props.view.finalScores?.find((score) => score.playerId === id)?.points;
    return (
        <div
            data-testid="spicy-board"
            class={`grid gap-3 ${props.display ? "grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}
        >
            <For each={props.view.players}>
                {(player, index) => (
                    <div
                        class={`min-w-0 border-3 border-ink p-3 shadow-ink ${player.isCurrentPlayer ? "bg-sun" : "bg-cream"}`}
                    >
                        <div class="flex items-center gap-3">
                            <PlayerAvatar
                                id={player.id}
                                name={player.name}
                                index={index()}
                            />
                            <h3 class="min-w-0 flex-1 break-words font-bebas text-2xl">
                                {player.name}
                            </h3>
                            <Show when={points(player.id) !== undefined}>
                                <span class="font-bebas text-3xl">
                                    {points(player.id)}
                                </span>
                            </Show>
                        </div>
                        <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
                            <p class="font-bebas text-lg">
                                {player.handCount} IN HAND ·{" "}
                                {player.wonCardCount} WON
                            </p>
                            <div
                                class="flex gap-1"
                                aria-label={`${player.trophies} trophies`}
                            >
                                <For
                                    each={Array.from({
                                        length: player.trophies,
                                    })}
                                    keyed={false}
                                >
                                    {() => <TrophyArt />}
                                </For>
                            </div>
                        </div>
                        <Show when={player.isPendingLastCard}>
                            <p class="mt-2 border-2 border-ink bg-tomato px-2 font-bebas text-cream">
                                LAST CARD ·{" "}
                                {props.view.safePassPlayerIds.length}/
                                {props.view.players.length - 1} ACCEPTED
                            </p>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );
}
