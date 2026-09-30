import { For, Show } from "solid-js";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { CREATURE_LABELS, groupCreatures } from "./creatures";
import { CreatureCard } from "./creature-card";
import type { CockroachPokerTableView } from "~/game/cockroach-poker/table-view";

export function CockroachPokerBoard(props: {
    view: Pick<
        CockroachPokerTableView,
        "players" | "activePlayerId" | "loserId"
    >;
    display?: boolean;
}) {
    return (
        <section
            aria-label="Face-up collections"
            data-testid="cockroach-poker-board"
        >
            <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2
                    class={`font-bebas tracking-wider ${props.display ? "text-3xl" : "text-2xl"}`}
                >
                    Collections
                </h2>
                <p class={props.display ? "text-lg" : "text-sm text-muted"}>
                    Four of one creature loses
                </p>
            </div>
            <div
                class={`grid gap-3 ${props.display ? "grid-cols-2 xl:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}
            >
                <For each={props.view.players}>
                    {(player, index) => (
                        <article
                            class={`min-w-0 border-2 border-ink p-3 shadow-ink ${props.view.loserId === player.id ? "bg-tomato text-cream" : props.view.activePlayerId === player.id ? "bg-sun text-ink" : "bg-cream text-ink"}`}
                        >
                            <div class="flex items-center gap-3">
                                <PlayerAvatar
                                    id={player.id}
                                    name={player.name}
                                    index={index()}
                                    class="h-10 w-10 text-xl"
                                />
                                <div class="min-w-0 flex-1">
                                    <h3
                                        class={`break-words font-bebas leading-tight tracking-wide ${props.display ? "text-3xl" : "text-xl"}`}
                                    >
                                        {player.name}
                                    </h3>
                                    <p
                                        class={
                                            props.display
                                                ? "text-lg"
                                                : "text-sm"
                                        }
                                    >
                                        {player.handCount} in hand
                                    </p>
                                </div>
                                <Show
                                    when={
                                        props.view.activePlayerId ===
                                            player.id && !props.view.loserId
                                    }
                                >
                                    <span class="font-bebas tracking-wide">
                                        TURN
                                    </span>
                                </Show>
                                <Show when={props.view.loserId === player.id}>
                                    <span class="font-bebas tracking-wide">
                                        LOSES
                                    </span>
                                </Show>
                            </div>
                            <Show
                                when={player.faceUpCards.length}
                                fallback={
                                    <p
                                        class={`mt-3 ${props.display ? "text-lg" : "text-sm"}`}
                                    >
                                        No face-up cards
                                    </p>
                                }
                            >
                                <div class="mt-3 flex flex-wrap gap-2">
                                    <For
                                        each={groupCreatures(
                                            player.faceUpCards,
                                        )}
                                    >
                                        {(group) => (
                                            <span
                                                aria-label={`${CREATURE_LABELS[group.creature]} ${group.count}/4`}
                                                class={`flex w-[68px] flex-col items-center gap-1 border-2 bg-card px-1 py-2 shadow-ink-sm ${group.count >= 3 ? "border-tomato text-tomato" : "border-ink text-ink"}`}
                                            >
                                                <CreatureCard
                                                    creature={group.creature}
                                                    framed={false}
                                                />
                                                <span class="font-bebas text-lg leading-none">
                                                    {group.count}/4
                                                </span>
                                            </span>
                                        )}
                                    </For>
                                </div>
                            </Show>
                        </article>
                    )}
                </For>
            </div>
        </section>
    );
}

export function CockroachPokerStatus(props: {
    view: CockroachPokerTableView;
    display?: boolean;
}) {
    const name = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const playerIndex = (id: string) =>
        props.view.players.findIndex((player) => player.id === id);
    const result = () =>
        props.view.lastResult?.type === "call_resolved"
            ? props.view.lastResult
            : null;
    const resultDescription = () => {
        const resolved = result();
        return resolved
            ? `It was a ${CREATURE_LABELS[resolved.actualCard]}. ${name(resolved.callerId)} called ${resolved.calledTrue ? "true" : "false"} and was ${resolved.wasCorrect ? "right" : "wrong"}. ${name(resolved.cardTakerId)} takes the card.`
            : undefined;
    };
    return (
        <section
            aria-label="Current play"
            class={`table-mat border-2 border-ink text-cream shadow-ink ${props.display ? "p-8 lg:p-10" : "p-4"}`}
        >
            <Show
                when={props.view.phase === "game_over"}
                fallback={
                    <Show
                        when={result()}
                        fallback={
                            <Show
                                when={props.view.offerChain}
                                fallback={
                                    <div class="flex items-center justify-center gap-6">
                                        <StatusPlayer
                                            id={props.view.activePlayerId}
                                            index={playerIndex(
                                                props.view.activePlayerId,
                                            )}
                                            name={name(
                                                props.view.activePlayerId,
                                            )}
                                            display={props.display}
                                            badge="TO OFFER"
                                        />
                                        <CardBack display={props.display} />
                                    </div>
                                }
                            >
                                {(chain) => (
                                    <div
                                        class={`flex items-center justify-center ${props.display ? "gap-8" : "gap-3"}`}
                                    >
                                        <StatusPlayer
                                            id={chain().currentOffererId}
                                            index={playerIndex(
                                                chain().currentOffererId,
                                            )}
                                            name={name(
                                                chain().currentOffererId,
                                            )}
                                            display={props.display}
                                        />
                                        <div class="flex flex-col items-center gap-2">
                                            <span class="font-bebas tracking-widest text-sm">
                                                CLAIM
                                            </span>
                                            <CreatureCard
                                                creature={chain().currentClaim}
                                                hero={props.display}
                                            />
                                        </div>
                                        <TransferArrow
                                            display={props.display}
                                        />
                                        <StatusPlayer
                                            id={chain().currentReceiverId}
                                            index={playerIndex(
                                                chain().currentReceiverId,
                                            )}
                                            name={name(
                                                chain().currentReceiverId,
                                            )}
                                            display={props.display}
                                            badge="TURN"
                                        />
                                    </div>
                                )}
                            </Show>
                        }
                    >
                        {(resolved) => (
                            <div
                                role="status"
                                aria-label={resultDescription()}
                                class={`flex flex-wrap items-center justify-center ${props.display ? "gap-8" : "gap-4"}`}
                            >
                                <div
                                    class={`flex items-center gap-3 ${props.display ? "flex-col" : "w-full justify-center"}`}
                                >
                                    <StatusPlayer
                                        id={resolved().callerId}
                                        index={playerIndex(resolved().callerId)}
                                        name={name(resolved().callerId)}
                                        display={props.display}
                                        compact={!props.display}
                                    />
                                    <span
                                        class={`flex items-center gap-2 border-2 border-ink px-3 py-1 font-bebas text-xl tracking-wide ${resolved().wasCorrect ? "bg-teal" : "bg-tomato"}`}
                                    >
                                        <svg
                                            role="img"
                                            aria-label={
                                                resolved().wasCorrect
                                                    ? "Correct call"
                                                    : "Incorrect call"
                                            }
                                            viewBox="0 0 24 24"
                                            class="h-6 w-6"
                                            fill="none"
                                            stroke="currentColor"
                                            stroke-width="3"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        >
                                            <path
                                                d={
                                                    resolved().wasCorrect
                                                        ? "M4 12l5 5L20 5"
                                                        : "m6 6 12 12M18 6 6 18"
                                                }
                                            />
                                        </svg>
                                        {resolved().calledTrue
                                            ? "TRUE"
                                            : "FALSE"}
                                    </span>
                                </div>
                                <CreatureCard
                                    creature={resolved().actualCard}
                                    large={!props.display}
                                    hero={props.display}
                                />
                                <TransferArrow display={props.display} />
                                <StatusPlayer
                                    id={resolved().cardTakerId}
                                    index={playerIndex(resolved().cardTakerId)}
                                    name={name(resolved().cardTakerId)}
                                    display={props.display}
                                    badge="NEXT OFFER"
                                />
                            </div>
                        )}
                    </Show>
                }
            >
                <div class="flex flex-col items-center gap-3">
                    <p class="font-bebas text-lg tracking-widest">GAME OVER</p>
                    <Show
                        when={props.view.loserId}
                        fallback={<p class="font-bebas text-3xl">Game ended</p>}
                    >
                        {(id) => (
                            <StatusPlayer
                                id={id()}
                                index={playerIndex(id())}
                                name={name(id())}
                                display={props.display}
                                badge="LOSES"
                            />
                        )}
                    </Show>
                    <p class={props.display ? "text-xl" : "text-sm"}>
                        {props.view.loseReason === "four_of_a_kind"
                            ? "4 matching creatures"
                            : props.view.loseReason === "empty_hand"
                              ? "Empty hand"
                              : ""}
                    </p>
                </div>
            </Show>
        </section>
    );
}

function StatusPlayer(props: {
    id: string;
    index: number;
    name: string;
    display?: boolean;
    compact?: boolean;
    badge?: string;
}) {
    return (
        <div
            class={`flex min-w-0 items-center ${props.compact ? "gap-2" : "max-w-[160px] flex-col gap-2 text-center"}`}
        >
            <PlayerAvatar
                id={props.id}
                index={props.index}
                name={props.name}
                class={
                    props.display ? "h-20 w-20 text-4xl" : "h-10 w-10 text-xl"
                }
            />
            <span
                class={`break-words font-bebas tracking-wide ${props.display ? "text-3xl" : "text-lg"}`}
            >
                {props.name}
            </span>
            <Show when={props.badge}>
                <span class="border-2 border-ink bg-sun px-2 py-1 font-bebas text-sm tracking-wide text-ink">
                    {props.badge}
                </span>
            </Show>
        </div>
    );
}

function TransferArrow(props: { display?: boolean }) {
    return (
        <svg
            aria-hidden="true"
            viewBox="0 0 40 24"
            class={props.display ? "h-10 w-16 shrink-0" : "h-6 w-7 shrink-0"}
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path d="M3 12h32M25 3l10 9-10 9" />
        </svg>
    );
}

function CardBack(props: { display?: boolean }) {
    return (
        <div
            aria-hidden="true"
            class={`relative rotate-6 border-2 border-ink bg-card p-2 shadow-ink-lg ${props.display ? "h-44 w-32" : "h-24 w-16"}`}
        >
            <div class="table-mat flex h-full items-center justify-center border-2 border-ink">
                <svg
                    viewBox="0 0 40 60"
                    class={props.display ? "h-20 w-16" : "h-12 w-8"}
                    fill="none"
                    stroke="currentColor"
                    stroke-width="4"
                    stroke-linecap="round"
                >
                    <path d="M9 17c0-14 25-14 25 0 0 10-14 10-14 22" />
                    <circle cx="20" cy="51" r="2" fill="currentColor" />
                </svg>
            </div>
        </div>
    );
}
