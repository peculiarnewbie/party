import { For, Show, Switch, Match } from "solid-js";
import { SvgSkullDisc } from "~/assets/svg-skull-disc";
import { PlayerAvatar, avatarColors } from "~/components/casino/player-avatar";
import type { SkullTableView } from "~/game/skull/table-view";

export function skullPalette(id: string, index: number) {
    return {
        base: avatarColors(id, index)[0],
        accent: "#e8dfc8",
        line: "#1a1a1a",
        center: "#f7f2de",
    };
}

export const SKULL_PHASE_LABELS = {
    turn_prep: "PLACE A DISC",
    building: "BUILD OR BID",
    auction: "BIDDING",
    attempt: "FLIP",
    penalty: "LOSE A DISC",
    next_starter: "NEXT STARTER",
    game_over: "GAME OVER",
} as const;

export function SkullStatus(props: {
    view: SkullTableView;
    display?: boolean;
}) {
    const result = () => props.view.lastPublicResult;
    const resolution = () => {
        const event = result();
        return event?.type === "attempt_succeeded" ||
            event?.type === "attempt_failed"
            ? event
            : null;
    };
    const actorId = () =>
        props.view.winnerId ??
        props.view.pendingNextStarterChooserId ??
        props.view.penaltyChooserId ??
        props.view.attempt?.challengerId ??
        props.view.currentPlayerId;
    const actor = () =>
        props.view.players.find((player) => player.id === actorId());
    const bidder = () =>
        props.view.players.find(
            (player) => player.id === props.view.highestBidderId,
        );
    return (
        <div
            class="table-mat border-3 border-ink bg-navy p-4 text-cream shadow-ink"
            role="status"
            aria-label={`${SKULL_PHASE_LABELS[props.view.phase]}: ${actor()?.name ?? ""}`}
        >
            <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex min-w-0 items-center gap-4">
                    <PlayerAvatar
                        id={actorId()}
                        name={actor()?.name ?? "?"}
                        index={props.view.players.findIndex(
                            (player) => player.id === actorId(),
                        )}
                        class={
                            props.display
                                ? "h-20 w-20 text-5xl"
                                : "h-12 w-12 text-3xl"
                        }
                    />
                    <div class="min-w-0">
                        <p class="font-bebas text-sm tracking-widest text-cream/80">
                            {SKULL_PHASE_LABELS[props.view.phase]}
                        </p>
                        <h2
                            class={`break-words font-bebas leading-none ${props.display ? "text-5xl" : "text-3xl"}`}
                        >
                            {actor()?.name ?? "—"}
                        </h2>
                    </div>
                </div>
                <Switch>
                    <Match when={props.view.attempt}>
                        {(attempt) => (
                            <div
                                class="flex items-center gap-3"
                                aria-label={`${attempt().revealedCount} of ${attempt().target} discs revealed`}
                            >
                                <SvgSkullDisc
                                    disc="flower"
                                    palette={skullPalette(
                                        actorId(),
                                        props.view.players.findIndex(
                                            (player) => player.id === actorId(),
                                        ),
                                    )}
                                    class={
                                        props.display
                                            ? "h-24 w-24"
                                            : "h-16 w-16"
                                    }
                                />
                                <span
                                    class={`font-bebas ${props.display ? "text-6xl" : "text-4xl"}`}
                                >
                                    {attempt().revealedCount}
                                    <span class="text-cream/60">
                                        {" "}
                                        / {attempt().target}
                                    </span>
                                </span>
                            </div>
                        )}
                    </Match>
                    <Match when={props.view.highestBid !== null}>
                        <div class="flex items-center gap-3">
                            <SvgSkullDisc
                                disc="flower"
                                palette={skullPalette(
                                    props.view.highestBidderId ?? "",
                                    props.view.players.findIndex(
                                        (player) =>
                                            player.id ===
                                            props.view.highestBidderId,
                                    ),
                                )}
                                class="h-16 w-16"
                            />
                            <div class="text-right">
                                <p class="font-bebas text-4xl">
                                    {props.view.highestBid}
                                </p>
                                <p class="text-sm">{bidder()?.name}</p>
                            </div>
                        </div>
                    </Match>
                </Switch>
            </div>
            <Show when={resolution()}>
                {(event) => (
                    <div
                        class="mt-3 flex items-center gap-3 border-t-2 border-cream/30 pt-3"
                        aria-label={`${props.view.players.find((player) => player.id === event().challengerId)?.name}: challenge ${event().type === "attempt_succeeded" ? "succeeded" : "failed"}`}
                    >
                        <SvgSkullDisc
                            disc={
                                event().type === "attempt_succeeded"
                                    ? "flower"
                                    : "skull"
                            }
                            palette={skullPalette(
                                event().challengerId,
                                props.view.players.findIndex(
                                    (player) =>
                                        player.id === event().challengerId,
                                ),
                            )}
                            class="h-12 w-12"
                        />
                        <span class="font-bebas text-2xl">
                            {
                                props.view.players.find(
                                    (player) =>
                                        player.id === event().challengerId,
                                )?.name
                            }
                        </span>
                        <span
                            class={`ml-auto border-2 border-ink px-3 py-1 font-bebas text-xl ${event().type === "attempt_succeeded" ? "bg-teal" : "bg-tomato"}`}
                        >
                            {event().type === "attempt_succeeded"
                                ? "CLEARED"
                                : "SKULL"}
                        </span>
                    </div>
                )}
            </Show>
        </div>
    );
}

export function SkullBoard(props: {
    view: SkullTableView;
    display?: boolean;
    selectable?: readonly string[];
    onFlip?: (id: string) => void;
}) {
    return (
        <div
            data-testid="skull-board"
            class={`grid gap-4 ${props.display ? "grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3"}`}
        >
            <For each={props.view.players}>
                {(player, index) => (
                    <div
                        class={`min-w-0 border-3 border-ink p-3 shadow-ink ${player.eliminated ? "bg-kraft opacity-60" : player.isCurrentPlayer ? "bg-sun" : "bg-cream"}`}
                    >
                        <div class="flex items-center gap-3">
                            <PlayerAvatar
                                id={player.id}
                                name={player.name}
                                index={index()}
                            />
                            <h3
                                class={`min-w-0 flex-1 break-words font-bebas ${props.display ? "text-3xl" : "text-2xl"}`}
                            >
                                {player.name}
                            </h3>
                            <span
                                class="font-bebas text-xl"
                                aria-label={`${player.successfulChallenges} of 2 wins`}
                            >
                                {player.successfulChallenges}/2
                            </span>
                        </div>
                        <div class="my-4 grid grid-cols-2 gap-3">
                            <div
                                role="group"
                                aria-label={`${player.name}'s hand: ${player.handCount} discs`}
                                class="min-w-0"
                            >
                                <p class="mb-2 font-bebas text-sm tracking-widest text-muted">
                                    HAND
                                </p>
                                <div class="flex items-center">
                                    <For
                                        each={Array.from({
                                            length: player.handCount,
                                        })}
                                        keyed={false}
                                    >
                                        {() => (
                                            <div class="-ml-4 first:ml-0">
                                                <SvgSkullDisc
                                                    disc="hidden"
                                                    palette={skullPalette(
                                                        player.id,
                                                        index(),
                                                    )}
                                                    class={
                                                        props.display
                                                            ? "h-14 w-14 2xl:h-16 2xl:w-16"
                                                            : "h-11 w-11"
                                                    }
                                                />
                                            </div>
                                        )}
                                    </For>
                                    <Show when={player.handCount === 0}>
                                        <span class="font-bebas text-2xl text-muted">
                                            —
                                        </span>
                                    </Show>
                                </div>
                            </div>
                            <div
                                role="group"
                                aria-label={`${player.name}'s played discs: ${player.faceDownCount} hidden, ${player.revealedDiscs.length} revealed`}
                                class="min-w-0 border-l-2 border-ink/30 pl-3"
                            >
                                <p class="mb-2 font-bebas text-sm tracking-widest text-muted">
                                    PLAYED
                                </p>
                                <div class="flex flex-wrap items-center gap-1">
                                    <For
                                        each={Array.from({
                                            length: player.faceDownCount,
                                        })}
                                        keyed={false}
                                    >
                                        {() => (
                                            <SvgSkullDisc
                                                disc="hidden"
                                                palette={skullPalette(
                                                    player.id,
                                                    index(),
                                                )}
                                                class={
                                                    props.display
                                                        ? "h-16 w-16"
                                                        : "h-11 w-11"
                                                }
                                            />
                                        )}
                                    </For>
                                    <For
                                        each={player.revealedDiscs}
                                        keyed={false}
                                    >
                                        {(disc) => (
                                            <div
                                                aria-label={`Revealed ${disc()}`}
                                            >
                                                <SvgSkullDisc
                                                    disc={disc()}
                                                    palette={skullPalette(
                                                        player.id,
                                                        index(),
                                                    )}
                                                    class={
                                                        props.display
                                                            ? "h-16 w-16"
                                                            : "h-11 w-11"
                                                    }
                                                />
                                            </div>
                                        )}
                                    </For>
                                    <Show when={player.matCount === 0}>
                                        <span class="font-bebas text-2xl text-muted">
                                            —
                                        </span>
                                    </Show>
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center justify-between gap-2 font-bebas tracking-wide text-muted">
                            <span>
                                {player.handCount + player.matCount} DISCS LEFT
                            </span>
                            <span>
                                {player.eliminated
                                    ? "OUT"
                                    : player.hasPassed
                                      ? "PASSED"
                                      : player.isHighestBidder
                                        ? "HIGH BID"
                                        : ""}
                            </span>
                        </div>
                        <Show when={props.selectable?.includes(player.id)}>
                            <button
                                type="button"
                                aria-label={`Flip top disc: ${player.name}`}
                                onClick={() => props.onFlip?.(player.id)}
                                class="mt-3 min-h-12 w-full border-2 border-ink bg-navy font-bebas text-xl text-cream shadow-ink-sm focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-navy"
                            >
                                FLIP TOP DISC
                            </button>
                        </Show>
                    </div>
                )}
            </For>
        </div>
    );
}
