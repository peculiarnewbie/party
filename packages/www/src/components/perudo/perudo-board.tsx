import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { PerudoCup, PerudoDie } from "./perudo-art";
import type { PerudoTableView } from "~/game/perudo/table-view";

export function PerudoBoard(props: { view: PerudoTableView; large?: boolean }) {
    const reveal = () => props.view.phase === "revealing";
    const matched = (face: number) =>
        reveal() &&
        (face === props.view.lastChallengeResult?.bid.faceValue ||
            (face === 1 && !props.view.palificoRound));
    return (
        <div
            class={`grid gap-4 ${props.large ? "grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))]" : "grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))]"}`}
        >
            <For each={props.view.players} keyed={false}>
                {(player) => (
                    <div
                        data-testid={`display-seat-${player().id}`}
                        data-visible-dice-count={
                            reveal() ? (player().dice?.length ?? 0) : 0
                        }
                        data-acting={String(player().isCurrentPlayer)}
                        class={`min-w-0 border-3 border-ink p-3 shadow-ink ${player().isCurrentPlayer && !reveal() ? "bg-sun" : "bg-cream"}`}
                    >
                        <div class="flex items-center gap-3">
                            <PlayerAvatar
                                id={player().id}
                                name={player().name}
                            />
                            <div class="min-w-0">
                                <h3
                                    class={`break-words font-bebas ${props.large ? "text-3xl" : "text-2xl"}`}
                                >
                                    {player().name}
                                </h3>
                                <p
                                    class={`font-bebas text-muted ${props.large ? "text-lg" : "text-sm"}`}
                                >
                                    {player().eliminated
                                        ? "OUT"
                                        : `${player().diceCount} DICE`}
                                </p>
                            </div>
                        </div>
                        <Show when={!player().eliminated}>
                            <Show
                                when={reveal() && player().dice}
                                fallback={
                                    <div class="flex items-center justify-center gap-3 py-2">
                                        <PerudoCup
                                            id={player().id}
                                            class={
                                                props.large
                                                    ? "h-28 w-28"
                                                    : "h-20 w-20"
                                            }
                                        />
                                        <div
                                            class="flex flex-col gap-1"
                                            aria-label={`${player().diceCount} hidden dice`}
                                        >
                                            <For
                                                each={Array.from({
                                                    length: player().diceCount,
                                                })}
                                                keyed={false}
                                            >
                                                {() => (
                                                    <span class="h-3 w-3 border border-ink bg-kraft" />
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                }
                            >
                                <div class="mt-3 flex flex-wrap gap-2">
                                    <For
                                        each={player().dice ?? []}
                                        keyed={false}
                                    >
                                        {(face) => (
                                            <PerudoDie
                                                face={face()}
                                                size={props.large ? 56 : 40}
                                                matched={matched(face())}
                                            />
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );
}

export function PerudoStatus(props: {
    view: PerudoTableView;
    display?: boolean;
}) {
    const name = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const result = () =>
        props.view.phase === "revealing" || props.view.phase === "game_over"
            ? props.view.lastChallengeResult
            : null;
    const actor = () =>
        props.view.players.find(
            (player) => player.id === props.view.currentPlayerId,
        );
    return (
        <div
            role="status"
            class="table-mat space-y-3 border-3 border-ink bg-navy p-3 text-cream shadow-ink"
        >
            <Show
                when={props.view.phase === "game_over"}
                fallback={
                    <Show
                        when={result()}
                        fallback={
                            <>
                                <Show
                                    when={props.view.currentBid}
                                    fallback={
                                        <div class="flex items-center gap-3">
                                            <PerudoCup
                                                id={props.view.currentPlayerId}
                                                class={
                                                    props.display
                                                        ? "h-24 w-24 shrink-0"
                                                        : "h-16 w-16 shrink-0"
                                                }
                                            />
                                            <div class="min-w-0">
                                                <span
                                                    class={`font-bebas tracking-wide ${props.display ? "text-lg" : "text-sm"}`}
                                                >
                                                    OPENING BID
                                                </span>
                                                <h2
                                                    class={`break-words font-bebas leading-none ${props.display ? "text-5xl" : "text-3xl"}`}
                                                >
                                                    {actor()?.name ?? "Player"}
                                                </h2>
                                            </div>
                                        </div>
                                    }
                                >
                                    {(bid) => (
                                        <div
                                            data-testid={
                                                props.display
                                                    ? "perudo-display-bid"
                                                    : "perudo-current-bid"
                                            }
                                            class="flex flex-wrap items-center justify-between gap-3"
                                        >
                                            <div>
                                                <span class="font-bebas text-sm tracking-wide">
                                                    {name(bid().playerId)}’S BID
                                                </span>
                                                <div
                                                    class="flex items-center gap-3"
                                                    aria-label={`${bid().quantity} dice showing ${bid().faceValue}`}
                                                >
                                                    <strong
                                                        class={`font-bebas ${props.display ? "text-7xl" : "text-5xl"}`}
                                                    >
                                                        {bid().quantity} ×
                                                    </strong>
                                                    <PerudoDie
                                                        face={bid().faceValue}
                                                        size={
                                                            props.display
                                                                ? 64
                                                                : 44
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div class="min-w-0">
                                                <span class="font-bebas text-sm tracking-wide">
                                                    NEXT
                                                </span>
                                                <div class="flex items-center gap-2">
                                                    <Show when={actor()}>
                                                        {(player) => (
                                                            <PlayerAvatar
                                                                id={player().id}
                                                                name={
                                                                    player()
                                                                        .name
                                                                }
                                                                class="h-9 w-9 text-xl"
                                                            />
                                                        )}
                                                    </Show>
                                                    <span class="break-words font-bebas text-2xl">
                                                        {actor()?.name}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Show>
                            </>
                        }
                    >
                        {(challenge) => (
                            <div
                                data-testid={
                                    props.display
                                        ? "perudo-display-result"
                                        : "perudo-challenge-result"
                                }
                            >
                                <span class="font-bebas text-sm tracking-wide">
                                    CHALLENGE RESULT
                                </span>
                                <div
                                    class="my-2 flex flex-wrap items-center gap-3"
                                    aria-label={`${challenge().actualCount} ${challenge().bid.faceValue}s found; bid was ${challenge().bid.quantity}`}
                                >
                                    <span
                                        class={`font-bebas ${props.display ? "text-6xl" : "text-4xl"}`}
                                    >
                                        {challenge().bid.quantity} ×
                                    </span>
                                    <PerudoDie
                                        face={challenge().bid.faceValue}
                                        size={props.display ? 64 : 44}
                                    />
                                    <span
                                        aria-hidden="true"
                                        class="font-bebas text-3xl"
                                    >
                                        →
                                    </span>
                                    <strong
                                        class={`font-bebas text-sun ${props.display ? "text-6xl" : "text-4xl"}`}
                                    >
                                        {challenge().actualCount}
                                    </strong>
                                    <span class="font-bebas text-lg">
                                        FOUND
                                    </span>
                                </div>
                                <div class="flex items-center gap-2 border-t border-cream/30 pt-2">
                                    <PlayerAvatar
                                        id={challenge().loserId}
                                        name={name(challenge().loserId)}
                                        class="h-9 w-9 text-xl"
                                    />
                                    <span
                                        class={`min-w-0 break-words font-bebas ${props.display ? "text-3xl" : "text-xl"}`}
                                    >
                                        {name(challenge().loserId)} · −1 DIE
                                    </span>
                                </div>
                            </div>
                        )}
                    </Show>
                }
            >
                <span class="font-bebas text-sm tracking-wide">GAME OVER</span>
                <h2
                    class={`break-words font-bebas ${props.display ? "text-6xl" : "text-4xl"}`}
                >
                    {props.view.winners?.map(name).join(" & ") || "GAME ENDED"}
                </h2>
                <Show when={props.view.winners?.length}>
                    <span class="font-bebas text-lg text-sun">WINNER</span>
                </Show>
            </Show>
            <div
                class={`flex flex-wrap items-center justify-between gap-2 border-t border-cream/30 pt-2 ${props.display ? "text-lg" : "text-sm"}`}
            >
                <span>{props.view.totalDiceInPlay} DICE IN PLAY</span>
                <span class="flex items-center gap-2">
                    <PerudoDie face={1} size={20} />
                    <span>
                        {props.view.palificoRound
                            ? "Palifico · no wilds"
                            : "Ones are wild"}
                    </span>
                </span>
            </div>
        </div>
    );
}
