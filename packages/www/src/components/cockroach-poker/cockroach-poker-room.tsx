import { createEffect, createSignal, For, Show, onCleanup } from "solid-js";
import { TableButton } from "~/components/casino/table-button";
import { TablePanel } from "~/components/casino/table-panel";
import {
    CockroachPokerBoard,
    CockroachPokerStatus,
} from "./cockroach-poker-board";
import { CREATURE_LABELS, groupCreatures } from "./creatures";
import { CreatureCard } from "./creature-card";
import { CREATURE_TYPES } from "~/game/cockroach-poker/schemas";
import type { CreatureType } from "~/game/cockroach-poker/schemas";
import type {
    CockroachPokerConnection,
    CockroachPokerClientOutgoing,
} from "~/game/cockroach-poker/connection";
import type { CockroachPokerTableView } from "~/game/cockroach-poker/table-view";
import type { PartyLayout } from "~/components/party-layout-controls";
import type { JSX } from "@solidjs/web";

interface CockroachPokerRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    initialLayout?: PartyLayout;
    connection: CockroachPokerConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export function CockroachPokerRoom(props: CockroachPokerRoomProps) {
    const view = () => props.connection.view();
    const [selectedCard, setSelectedCard] = createSignal<CreatureType | null>(
        null,
    );
    const [selectedTarget, setSelectedTarget] = createSignal<string | null>(
        null,
    );
    const [selectedClaim, setSelectedClaim] = createSignal<CreatureType | null>(
        null,
    );
    const [error, setError] = createSignal<string | null>(null);
    const controller = () => props.initialLayout === "controller";
    const peeked = () => view()?.offerChain?.peekedCard ?? null;
    const tableView = (): CockroachPokerTableView | null => {
        const current = view();
        if (!current) return null;
        const chain = current.offerChain;
        return {
            phase: current.phase,
            activePlayerId: current.activePlayerId,
            players: current.players,
            loserId: current.loserId,
            loseReason: current.loseReason,
            lastResult: current.lastResult,
            offerChain: chain
                ? {
                      currentOffererId: chain.currentOffererId,
                      currentReceiverId: chain.currentReceiverId,
                      currentClaim: chain.currentClaim,
                      seenByPlayerIds: chain.seenByPlayerIds,
                      receiverPeeked: chain.seenByPlayerIds.includes(
                          chain.currentReceiverId,
                      ),
                  }
                : null,
        };
    };
    createEffect(
        () => {
            const current = view();
            return JSON.stringify([
                current?.myId,
                current?.phase,
                current?.activePlayerId,
                current?.offerChain?.currentOffererId,
                current?.offerChain?.currentReceiverId,
                current?.myHand,
            ]);
        },
        () => {
            setSelectedCard(null);
            setSelectedTarget(null);
            setSelectedClaim(null);
            setError(null);
        },
    );
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "cockroach_poker:error")
                setError(event.data.message);
        }),
    );
    const send = (message: CockroachPokerClientOutgoing) => {
        setError(null);
        props.connection.send(message);
    };
    const submit = () => {
        const current = view();
        const target = selectedTarget();
        const claim = selectedClaim();
        if (!current || !target || !claim) return;
        if (current.phase === "offering") {
            const card = selectedCard();
            if (!card) return;
            const cardIndex = current.myHand.indexOf(card);
            if (cardIndex < 0) return;
            send({
                type: "cockroach_poker:offer_card",
                data: { targetId: target, cardIndex, claim },
            });
        } else if (peeked()) {
            send({
                type: "cockroach_poker:peek_and_pass",
                data: { targetId: target, newClaim: claim },
            });
        }
    };
    const canSubmit = () =>
        !!selectedTarget() &&
        !!selectedClaim() &&
        (view()?.phase === "offering" ? !!selectedCard() : !!peeked());
    const targets = () => {
        const current = view();
        const ids =
            current?.phase === "offering"
                ? current.validOfferTargets
                : current?.validPassTargets;
        return (
            current?.players.filter((player) => ids?.includes(player.id)) ?? []
        );
    };
    return (
        <div class="paper min-h-[calc(100dvh-52px)]">
            <main
                data-testid="cockroach-poker-room"
                class={`mx-auto space-y-4 p-3 sm:p-5 font-karla text-ink ${controller() ? "max-w-lg" : "max-w-5xl"}`}
            >
                <header class="flex items-center justify-between gap-3">
                    <h1 class="font-bebas text-3xl sm:text-4xl leading-none tracking-wide">
                        COCKROACH POKER
                    </h1>
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
                                {current().phase === "offering"
                                    ? "OFFERING"
                                    : current().phase === "awaiting_response"
                                      ? "RESPONDING"
                                      : "RESULTS"}
                            </p>
                            <Show
                                when={
                                    !(
                                        controller() &&
                                        current().isMyTurn &&
                                        current().phase === "offering"
                                    ) && tableView()
                                }
                            >
                                {(table) => (
                                    <CockroachPokerStatus view={table()} />
                                )}
                            </Show>
                            <Show when={error()}>
                                {(message) => (
                                    <p
                                        role="alert"
                                        class="border-2 border-tomato bg-cream p-3 text-tomato"
                                    >
                                        {message()}
                                    </p>
                                )}
                            </Show>
                            <Show
                                when={current().phase === "game_over"}
                                fallback={
                                    <Show
                                        when={current().isMyTurn}
                                        fallback={
                                            <TablePanel class="space-y-3">
                                                <p class="font-bebas text-2xl tracking-wide">
                                                    Waiting for your turn
                                                </p>
                                                <Show when={peeked()}>
                                                    {(card) => (
                                                        <CreatureCard
                                                            creature={card()}
                                                        />
                                                    )}
                                                </Show>
                                                <details>
                                                    <summary class="cursor-pointer py-2 font-bold">
                                                        Your hand ·{" "}
                                                        {
                                                            current().myHand
                                                                .length
                                                        }{" "}
                                                        cards
                                                    </summary>
                                                    <div class="mt-2 flex flex-wrap gap-2">
                                                        <For
                                                            each={groupCreatures(
                                                                current()
                                                                    .myHand,
                                                            )}
                                                        >
                                                            {(group) => (
                                                                <CreatureCard
                                                                    creature={
                                                                        group.creature
                                                                    }
                                                                    count={
                                                                        group.count
                                                                    }
                                                                />
                                                            )}
                                                        </For>
                                                    </div>
                                                </details>
                                            </TablePanel>
                                        }
                                    >
                                        <TablePanel active class="space-y-4">
                                            <Show
                                                when={
                                                    current().phase ===
                                                    "offering"
                                                }
                                                fallback={
                                                    <Show
                                                        when={peeked()}
                                                        fallback={
                                                            <div class="space-y-4">
                                                                <div>
                                                                    <h2 class="font-bebas text-2xl tracking-wide">
                                                                        Call the
                                                                        claim
                                                                    </h2>
                                                                </div>
                                                                <div class="grid grid-cols-2 gap-3">
                                                                    <TableButton
                                                                        tone="teal"
                                                                        onClick={() =>
                                                                            send(
                                                                                {
                                                                                    type: "cockroach_poker:call_true",
                                                                                    data: {},
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        TRUE
                                                                    </TableButton>
                                                                    <TableButton
                                                                        tone="tomato"
                                                                        onClick={() =>
                                                                            send(
                                                                                {
                                                                                    type: "cockroach_poker:call_false",
                                                                                    data: {},
                                                                                },
                                                                            )
                                                                        }
                                                                    >
                                                                        FALSE
                                                                    </TableButton>
                                                                </div>
                                                                <Show
                                                                    when={
                                                                        !current()
                                                                            .offerChain
                                                                            ?.mustAccept
                                                                    }
                                                                    fallback={
                                                                        <p class="font-bebas text-sm tracking-wide">
                                                                            LAST
                                                                            RECEIVER
                                                                        </p>
                                                                    }
                                                                >
                                                                    <div class="border-t-2 border-ink pt-4">
                                                                        <TableButton
                                                                            tone="cream"
                                                                            class="w-full"
                                                                            onClick={() =>
                                                                                send(
                                                                                    {
                                                                                        type: "cockroach_poker:peek_card",
                                                                                        data: {},
                                                                                    },
                                                                                )
                                                                            }
                                                                        >
                                                                            PEEK
                                                                            &
                                                                            PASS
                                                                        </TableButton>
                                                                    </div>
                                                                </Show>
                                                            </div>
                                                        }
                                                    >
                                                        {(card) => (
                                                            <div
                                                                data-testid="cockroach-poker-private-peek"
                                                                class="flex justify-center"
                                                            >
                                                                <CreatureCard
                                                                    creature={card()}
                                                                    large
                                                                />
                                                            </div>
                                                        )}
                                                    </Show>
                                                }
                                            >
                                                <fieldset data-testid="cockroach-poker-hand">
                                                    <legend class="mb-2 font-bebas text-xl tracking-wide">
                                                        1 · Choose a card
                                                    </legend>
                                                    <div class="grid grid-cols-4 gap-2">
                                                        <For
                                                            each={groupCreatures(
                                                                current()
                                                                    .myHand,
                                                            )}
                                                        >
                                                            {(group) => (
                                                                <Choice
                                                                    card
                                                                    label={
                                                                        CREATURE_LABELS[
                                                                            group
                                                                                .creature
                                                                        ]
                                                                    }
                                                                    selected={
                                                                        selectedCard() ===
                                                                        group.creature
                                                                    }
                                                                    onClick={() =>
                                                                        setSelectedCard(
                                                                            group.creature,
                                                                        )
                                                                    }
                                                                >
                                                                    <CreatureCard
                                                                        creature={
                                                                            group.creature
                                                                        }
                                                                        count={
                                                                            group.count
                                                                        }
                                                                        framed={
                                                                            false
                                                                        }
                                                                    />
                                                                </Choice>
                                                            )}
                                                        </For>
                                                    </div>
                                                </fieldset>
                                            </Show>
                                            <Show
                                                when={
                                                    current().phase ===
                                                        "offering" || peeked()
                                                }
                                            >
                                                <fieldset>
                                                    <legend class="mb-2 font-bebas text-xl tracking-wide">
                                                        {current().phase ===
                                                        "offering"
                                                            ? "2"
                                                            : "1"}{" "}
                                                        · Pass to
                                                    </legend>
                                                    <div class="grid grid-cols-2 gap-2">
                                                        <For each={targets()}>
                                                            {(player) => (
                                                                <Choice
                                                                    label={
                                                                        player.name
                                                                    }
                                                                    selected={
                                                                        selectedTarget() ===
                                                                        player.id
                                                                    }
                                                                    onClick={() =>
                                                                        setSelectedTarget(
                                                                            player.id,
                                                                        )
                                                                    }
                                                                >
                                                                    <span class="min-w-0 [overflow-wrap:anywhere]">
                                                                        {
                                                                            player.name
                                                                        }
                                                                    </span>
                                                                </Choice>
                                                            )}
                                                        </For>
                                                    </div>
                                                </fieldset>
                                                <fieldset data-testid="cockroach-poker-claim">
                                                    <legend class="mb-2 font-bebas text-xl tracking-wide">
                                                        {current().phase ===
                                                        "offering"
                                                            ? "3"
                                                            : "2"}{" "}
                                                        · Claim it’s a…
                                                    </legend>
                                                    <div class="grid grid-cols-4 gap-2">
                                                        <For
                                                            each={
                                                                CREATURE_TYPES
                                                            }
                                                        >
                                                            {(creature) => (
                                                                <Choice
                                                                    card
                                                                    label={
                                                                        CREATURE_LABELS[
                                                                            creature
                                                                        ]
                                                                    }
                                                                    selected={
                                                                        selectedClaim() ===
                                                                        creature
                                                                    }
                                                                    onClick={() =>
                                                                        setSelectedClaim(
                                                                            creature,
                                                                        )
                                                                    }
                                                                >
                                                                    <CreatureCard
                                                                        creature={
                                                                            creature
                                                                        }
                                                                        framed={
                                                                            false
                                                                        }
                                                                    />
                                                                </Choice>
                                                            )}
                                                        </For>
                                                    </div>
                                                </fieldset>
                                                <TableButton
                                                    tone="navy"
                                                    disabled={!canSubmit()}
                                                    onClick={submit}
                                                    class="w-full"
                                                >
                                                    {current().phase ===
                                                    "offering"
                                                        ? "OFFER CARD"
                                                        : "PASS CARD"}
                                                </TableButton>
                                            </Show>
                                        </TablePanel>
                                    </Show>
                                }
                            >
                                <TablePanel class="space-y-3">
                                    <p class="font-bebas text-3xl tracking-wide">
                                        {current().loserId
                                            ? current().loserId ===
                                              current().myId
                                                ? "YOU LOSE"
                                                : "YOU WIN"
                                            : "GAME ENDED"}
                                    </p>
                                    <Show
                                        when={props.isHost}
                                        fallback={
                                            <p class="text-sm">
                                                Waiting for the host to return
                                                to the lobby.
                                            </p>
                                        }
                                    >
                                        <TableButton
                                            tone="navy"
                                            class="w-full"
                                            onClick={props.onReturnToLobby}
                                        >
                                            RETURN TO LOBBY
                                        </TableButton>
                                    </Show>
                                </TablePanel>
                            </Show>
                            <Show
                                when={!controller()}
                                fallback={
                                    <details class="border-2 border-ink bg-paper p-3">
                                        <summary class="cursor-pointer font-bebas text-xl tracking-wide">
                                            Show collections
                                        </summary>
                                        <div class="mt-3">
                                            <CockroachPokerBoard
                                                view={current()}
                                            />
                                        </div>
                                    </details>
                                }
                            >
                                <CockroachPokerBoard view={current()} />
                            </Show>
                        </>
                    )}
                </Show>
            </main>
        </div>
    );
}

function Choice(props: {
    label: string;
    selected: boolean;
    card?: boolean;
    onClick: () => void;
    children: JSX.Element;
}) {
    return (
        <button
            type="button"
            aria-label={props.label}
            aria-pressed={props.selected ? "true" : "false"}
            onClick={props.onClick}
            class={`flex items-center border-2 border-ink font-bebas shadow-ink-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy ${props.card ? `min-h-[68px] justify-center p-1 ${props.selected ? "bg-sun" : "bg-card"}` : `min-h-11 justify-between gap-2 px-2 py-1 text-left text-lg tracking-wide ${props.selected ? "bg-navy text-cream" : "bg-cream text-ink"}`}`}
        >
            {props.children}
        </button>
    );
}
