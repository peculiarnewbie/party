import {
    createEffect,
    createSignal,
    untrack,
    For,
    onCleanup,
    Show,
} from "solid-js";
import { SvgSkullDisc } from "~/assets/svg-skull-disc";
import { TableButton } from "~/components/casino/table-button";
import { TablePanel } from "~/components/casino/table-panel";
import { SkullBoard, SkullStatus, skullPalette } from "./skull-board";
import { skullTableViewFromPlayer } from "~/game/skull/table-view";
import type {
    SkullConnection,
    SkullClientOutgoing,
} from "~/game/skull/connection";
import type { PartyLayout } from "~/components/party-layout-controls";

interface SkullRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    initialLayout?: PartyLayout;
    connection: SkullConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export function SkullRoom(props: SkullRoomProps) {
    const view = () => props.connection.view();
    const controller = () => props.initialLayout === "controller";
    const [bid, setBid] = createSignal(1);
    const [error, setError] = createSignal<string | null>(null);
    const clamp = (value: number) =>
        Math.max(view()?.minBid ?? 1, Math.min(view()?.maxBid ?? 1, value));
    createEffect(
        () => [
            view()?.minBid,
            view()?.maxBid,
            view()?.phase,
            view()?.currentPlayerId,
        ],
        () => {
            untrack(() => setBid((value) => clamp(value)));
            setError(null);
        },
    );
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "skull:error") setError(event.data.message);
        }),
    );
    const send = (message: SkullClientOutgoing) => {
        setError(null);
        props.connection.send(message);
    };
    const palette = () =>
        skullPalette(
            props.playerId ?? "",
            view()?.players.findIndex(
                (player) => player.id === props.playerId,
            ) ?? 0,
        );
    return (
        <div class="paper min-h-[calc(100dvh-52px)]">
            <main
                data-testid="skull-room"
                class={`mx-auto space-y-4 p-3 sm:p-5 font-karla text-ink ${controller() ? "max-w-lg" : "max-w-5xl"}`}
            >
                <header class="flex items-center justify-between gap-3">
                    <div>
                        <h1 class="font-bebas text-4xl">SKULL</h1>
                        <p class="font-bebas text-sm tracking-widest text-muted">
                            ROOM {props.roomId.toUpperCase()}
                        </p>
                    </div>
                    <Show when={props.isHost && view()?.phase !== "game_over"}>
                        <TableButton
                            onClick={props.onEndGame}
                            tone="paper"
                            size="compact"
                            class="px-3"
                        >
                            END
                        </TableButton>
                    </Show>
                </header>
                <Show
                    when={view()}
                    fallback={<p role="status">Connecting to the game…</p>}
                >
                    {(current) => (
                        <>
                            <p class="font-bebas text-sm tracking-widest text-muted">
                                ROUND {current().roundNumber}
                            </p>
                            <SkullStatus
                                view={skullTableViewFromPlayer(current())}
                            />
                            <Show when={error()}>
                                {(message) => (
                                    <p
                                        role="alert"
                                        class="border-2 border-ink bg-cream p-3 text-tomato"
                                    >
                                        {message()}
                                    </p>
                                )}
                            </Show>
                            <Show when={current().phase !== "game_over"}>
                                <TablePanel class="[--table-panel-padding:12px]">
                                    <h2 class="mb-3 font-bebas text-xl">
                                        YOUR DISCS
                                    </h2>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div
                                            role="group"
                                            aria-label="Your hand"
                                        >
                                            <p class="mb-2 font-bebas text-sm tracking-widest text-muted">
                                                HAND
                                            </p>
                                            <div class="flex flex-wrap gap-2">
                                                <For
                                                    each={current().myHand}
                                                    keyed={false}
                                                >
                                                    {(disc) => (
                                                        <button
                                                            type="button"
                                                            aria-label={`Play ${disc()}`}
                                                            disabled={
                                                                !current()
                                                                    .canPlayDisc
                                                            }
                                                            onClick={() =>
                                                                send({
                                                                    type: "skull:play_disc",
                                                                    data: {
                                                                        disc: disc(),
                                                                    },
                                                                })
                                                            }
                                                            class="border-2 border-ink bg-cream p-1 shadow-ink-sm transition-transform enabled:hover:-translate-y-1 disabled:cursor-default focus-visible:outline-3 focus-visible:outline-navy"
                                                        >
                                                            <SvgSkullDisc
                                                                disc={disc()}
                                                                palette={palette()}
                                                                class="h-12 w-12"
                                                            />
                                                        </button>
                                                    )}
                                                </For>
                                                <Show
                                                    when={
                                                        current().myHand
                                                            .length === 0
                                                    }
                                                >
                                                    <span class="font-bebas text-2xl text-muted">
                                                        —
                                                    </span>
                                                </Show>
                                            </div>
                                        </div>
                                        <div
                                            role="group"
                                            aria-label="Your played discs"
                                            class="border-l-2 border-ink/30 pl-3"
                                        >
                                            <p class="mb-2 font-bebas text-sm tracking-widest text-muted">
                                                PLAYED
                                            </p>
                                            <div class="flex flex-wrap gap-2">
                                                <For
                                                    each={current().myMat}
                                                    keyed={false}
                                                >
                                                    {(disc) => (
                                                        <div
                                                            aria-label={`Played ${disc()}`}
                                                        >
                                                            <SvgSkullDisc
                                                                disc={disc()}
                                                                palette={palette()}
                                                                class="h-12 w-12"
                                                            />
                                                        </div>
                                                    )}
                                                </For>
                                                <Show
                                                    when={
                                                        current().myMat
                                                            .length === 0
                                                    }
                                                >
                                                    <span class="font-bebas text-2xl text-muted">
                                                        —
                                                    </span>
                                                </Show>
                                            </div>
                                        </div>
                                    </div>
                                </TablePanel>
                                <Show
                                    when={
                                        current().canStartChallenge ||
                                        current().canRaiseBid ||
                                        current().canPassBid
                                    }
                                >
                                    <TablePanel>
                                        <div class="space-y-3">
                                            <Show
                                                when={
                                                    current()
                                                        .canStartChallenge ||
                                                    current().canRaiseBid
                                                }
                                            >
                                                <div class="flex items-center justify-center gap-5">
                                                    <TableButton
                                                        label="Decrease bid"
                                                        disabled={
                                                            bid() <=
                                                            current().minBid
                                                        }
                                                        onClick={() =>
                                                            setBid((value) =>
                                                                clamp(
                                                                    value - 1,
                                                                ),
                                                            )
                                                        }
                                                        size="square"
                                                    >
                                                        −
                                                    </TableButton>
                                                    <span
                                                        class="font-bebas text-5xl"
                                                        aria-label={`Bid ${bid()}`}
                                                    >
                                                        {bid()}
                                                    </span>
                                                    <TableButton
                                                        label="Increase bid"
                                                        disabled={
                                                            bid() >=
                                                            current().maxBid
                                                        }
                                                        onClick={() =>
                                                            setBid((value) =>
                                                                clamp(
                                                                    value + 1,
                                                                ),
                                                            )
                                                        }
                                                        size="square"
                                                    >
                                                        +
                                                    </TableButton>
                                                </div>
                                                <TableButton
                                                    class="w-full"
                                                    tone="navy"
                                                    onClick={() =>
                                                        send({
                                                            type: current()
                                                                .canStartChallenge
                                                                ? "skull:start_challenge"
                                                                : "skull:raise_bid",
                                                            data: {
                                                                bid: bid(),
                                                            },
                                                        })
                                                    }
                                                >
                                                    {current().canStartChallenge
                                                        ? "START CHALLENGE"
                                                        : "RAISE BID"}
                                                </TableButton>
                                            </Show>
                                            <Show when={current().canPassBid}>
                                                <TableButton
                                                    class="w-full"
                                                    onClick={() =>
                                                        send({
                                                            type: "skull:pass_bid",
                                                            data: {},
                                                        })
                                                    }
                                                >
                                                    PASS
                                                </TableButton>
                                            </Show>
                                        </div>
                                    </TablePanel>
                                </Show>
                                <Show when={current().needsDiscardChoice}>
                                    <TablePanel>
                                        <h2 class="mb-3 font-bebas text-xl">
                                            CHOOSE A DISC TO LOSE
                                        </h2>
                                        <div class="flex flex-wrap gap-3">
                                            <For
                                                each={
                                                    current()
                                                        .discardableDiscIndices
                                                }
                                            >
                                                {(index) => (
                                                    <button
                                                        type="button"
                                                        aria-label={`Lose disc ${index + 1}`}
                                                        onClick={() =>
                                                            send({
                                                                type: "skull:discard_lost_disc",
                                                                data: {
                                                                    discIndex:
                                                                        index,
                                                                },
                                                            })
                                                        }
                                                        class="border-2 border-ink bg-cream p-2 shadow-ink-sm focus-visible:outline-3 focus-visible:outline-navy"
                                                    >
                                                        <SvgSkullDisc
                                                            disc={
                                                                current()
                                                                    .penaltyPlayerId ===
                                                                props.playerId
                                                                    ? (current()
                                                                          .myHand[
                                                                          index
                                                                      ] ??
                                                                      "hidden")
                                                                    : "hidden"
                                                            }
                                                            palette={palette()}
                                                            class="h-16 w-16"
                                                        />
                                                        <span class="font-bebas">
                                                            {index + 1}
                                                        </span>
                                                    </button>
                                                )}
                                            </For>
                                        </div>
                                    </TablePanel>
                                </Show>
                                <Show when={current().canChooseNextStarter}>
                                    <TablePanel>
                                        <h2 class="mb-3 font-bebas text-xl">
                                            NEXT STARTER
                                        </h2>
                                        <div class="grid grid-cols-2 gap-3">
                                            <For
                                                each={current().players.filter(
                                                    (player) =>
                                                        current().nextStarterOptions.includes(
                                                            player.id,
                                                        ),
                                                )}
                                            >
                                                {(player) => (
                                                    <TableButton
                                                        onClick={() =>
                                                            send({
                                                                type: "skull:choose_next_starter",
                                                                data: {
                                                                    playerId:
                                                                        player.id,
                                                                },
                                                            })
                                                        }
                                                        size="compact"
                                                    >
                                                        {player.name}
                                                    </TableButton>
                                                )}
                                            </For>
                                        </div>
                                    </TablePanel>
                                </Show>
                            </Show>
                            <Show
                                when={
                                    controller() &&
                                    current().selectableFlipOwnerIds.length > 0
                                }
                            >
                                <TablePanel>
                                    <h2 class="mb-3 font-bebas text-xl">
                                        FLIP A STACK
                                    </h2>
                                    <div class="grid grid-cols-2 gap-3">
                                        <For
                                            each={current().players.filter(
                                                (player) =>
                                                    current().selectableFlipOwnerIds.includes(
                                                        player.id,
                                                    ),
                                            )}
                                        >
                                            {(player) => (
                                                <button
                                                    type="button"
                                                    aria-label={`Flip top disc: ${player.name}`}
                                                    onClick={() =>
                                                        send({
                                                            type: "skull:flip_disc",
                                                            data: {
                                                                ownerId:
                                                                    player.id,
                                                            },
                                                        })
                                                    }
                                                    class="flex min-w-0 items-center gap-2 border-2 border-ink bg-cream p-2 shadow-ink-sm focus-visible:outline-3 focus-visible:outline-navy"
                                                >
                                                    <SvgSkullDisc
                                                        disc="hidden"
                                                        palette={skullPalette(
                                                            player.id,
                                                            current().players.findIndex(
                                                                (item) =>
                                                                    item.id ===
                                                                    player.id,
                                                            ),
                                                        )}
                                                        class="h-12 w-12 shrink-0"
                                                    />
                                                    <span class="min-w-0 break-words text-left font-bebas text-xl">
                                                        {player.name}
                                                        <span class="block text-sm text-muted">
                                                            {
                                                                player.faceDownCount
                                                            }{" "}
                                                            LEFT
                                                        </span>
                                                    </span>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </TablePanel>
                            </Show>
                            <Show
                                when={!controller()}
                                fallback={
                                    <details class="border-2 border-ink bg-cream p-3">
                                        <summary class="cursor-pointer font-bebas text-xl">
                                            SHOW TABLE
                                        </summary>
                                        <div class="mt-3">
                                            <SkullBoard
                                                view={skullTableViewFromPlayer(
                                                    current(),
                                                )}
                                            />
                                        </div>
                                    </details>
                                }
                            >
                                <SkullBoard
                                    view={skullTableViewFromPlayer(current())}
                                    selectable={
                                        current().selectableFlipOwnerIds
                                    }
                                    onFlip={(id) =>
                                        send({
                                            type: "skull:flip_disc",
                                            data: { ownerId: id },
                                        })
                                    }
                                />
                            </Show>
                            <Show
                                when={
                                    current().phase === "game_over" &&
                                    props.isHost
                                }
                            >
                                <TableButton
                                    class="w-full"
                                    tone="navy"
                                    onClick={props.onReturnToLobby}
                                >
                                    RETURN TO LOBBY
                                </TableButton>
                            </Show>
                        </>
                    )}
                </Show>
            </main>
        </div>
    );
}
