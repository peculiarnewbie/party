import {
    createEffect,
    createSignal,
    untrack,
    For,
    onCleanup,
    Show,
} from "solid-js";
import { TableButton } from "~/components/casino/table-button";
import { TablePanel } from "~/components/casino/table-panel";
import { SpicyBoard, SpicyStatus } from "./spicy-board";
import {
    SpicyCardFace,
    SpiceArt,
    SPICE_LABELS,
    spicyCardLabel,
} from "./spicy-card";
import { spicyTableViewFromPlayer } from "~/game/spicy/table-view";
import type { SpiceType } from "~/game/spicy";
import type {
    SpicyConnection,
    SpicyClientOutgoing,
} from "~/game/spicy/connection";
import type { PartyLayout } from "~/components/party-layout-controls";

interface SpicyRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    initialLayout?: PartyLayout;
    connection: SpicyConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export function SpicyRoom(props: SpicyRoomProps) {
    const view = () => props.connection.view();
    const controller = () => props.initialLayout === "controller";
    const [selectedId, setSelectedId] = createSignal<string | null>(null);
    const [number, setNumber] = createSignal(1);
    const [spice, setSpice] = createSignal<SpiceType>("chili");
    const [error, setError] = createSignal<string | null>(null);
    const selected = () =>
        view()?.myHand.find((card) => card.id === selectedId());
    createEffect(
        () => view(),
        (current) =>
            untrack(() => {
                if (!current) return;
                if (!current.myHand.some((card) => card.id === selectedId()))
                    setSelectedId(current.myHand[0]?.id ?? null);
                if (!current.allowedDeclarationNumbers.includes(number()))
                    setNumber(current.allowedDeclarationNumbers[0] ?? 1);
                if (!current.allowedDeclarationSpices.includes(spice()))
                    setSpice(current.allowedDeclarationSpices[0] ?? "chili");
                setError(null);
            }),
    );
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "spicy:error") setError(event.data.message);
        }),
    );
    const send = (message: SpicyClientOutgoing) => {
        setError(null);
        props.connection.send(message);
    };
    const play = () => {
        const card = selected();
        if (!card || !view()?.canPlayCard) return;
        send({
            type: "spicy:play_card",
            data: {
                cardId: card.id,
                declaredNumber: number(),
                declaredSpice: spice(),
            },
        });
    };
    return (
        <div class="paper min-h-[calc(100dvh-52px)]">
            <main
                data-testid="spicy-room"
                class={`mx-auto space-y-4 p-3 sm:p-5 font-karla text-ink ${controller() ? "max-w-lg" : "max-w-5xl"}`}
            >
                <header class="flex items-center justify-between gap-3">
                    <div>
                        <h1 class="font-bebas text-4xl">SPICY</h1>
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
                            END GAME
                        </TableButton>
                    </Show>
                </header>
                <Show
                    when={view()}
                    fallback={<p role="status">Connecting to the game…</p>}
                >
                    {(current) => (
                        <>
                            <SpicyStatus
                                view={spicyTableViewFromPlayer(current())}
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
                            <Show
                                when={
                                    current().canChallenge ||
                                    current().canConfirmLastCard
                                }
                            >
                                <TablePanel>
                                    <div class="grid grid-cols-2 gap-3">
                                        <Show when={current().canChallenge}>
                                            <TableButton
                                                label="Challenge number"
                                                tone="tomato"
                                                onClick={() =>
                                                    send({
                                                        type: "spicy:challenge",
                                                        data: {
                                                            trait: "number",
                                                        },
                                                    })
                                                }
                                            >
                                                <span class="font-bebas text-3xl">
                                                    {
                                                        current().stackTop
                                                            ?.declaredNumber
                                                    }
                                                </span>
                                                <span class="block text-base">
                                                    CALL NUMBER
                                                </span>
                                            </TableButton>
                                            <TableButton
                                                label="Challenge spice"
                                                tone="tomato"
                                                onClick={() =>
                                                    send({
                                                        type: "spicy:challenge",
                                                        data: {
                                                            trait: "spice",
                                                        },
                                                    })
                                                }
                                            >
                                                <div class="flex justify-center">
                                                    <SpiceArt
                                                        spice={
                                                            current().stackTop
                                                                ?.declaredSpice ??
                                                            "chili"
                                                        }
                                                        class="h-12 w-12"
                                                    />
                                                </div>
                                                <span class="block text-base">
                                                    CALL SPICE
                                                </span>
                                            </TableButton>
                                        </Show>
                                        <Show
                                            when={current().canConfirmLastCard}
                                        >
                                            <TableButton
                                                class="col-span-2"
                                                tone="teal"
                                                onClick={() =>
                                                    send({
                                                        type: "spicy:confirm_last_card",
                                                        data: {},
                                                    })
                                                }
                                            >
                                                ACCEPT LAST CARD
                                            </TableButton>
                                        </Show>
                                    </div>
                                </TablePanel>
                            </Show>
                            <Show when={current().phase !== "game_over"}>
                                <TablePanel>
                                    <h2 class="mb-3 font-bebas text-xl">
                                        YOUR HAND · {current().myHand.length}
                                    </h2>
                                    <div class="flex flex-wrap justify-center gap-3">
                                        <For
                                            each={current().myHand}
                                            keyed={false}
                                        >
                                            {(card) => (
                                                <button
                                                    type="button"
                                                    aria-label={`Select ${spicyCardLabel(card())}`}
                                                    aria-pressed={
                                                        selectedId() ===
                                                        card().id
                                                            ? "true"
                                                            : "false"
                                                    }
                                                    disabled={
                                                        !current().canPlayCard
                                                    }
                                                    onClick={() =>
                                                        setSelectedId(card().id)
                                                    }
                                                    class={`relative transition-transform focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-navy ${selectedId() === card().id ? "-translate-y-1 outline-3 outline-offset-2 outline-teal" : ""}`}
                                                >
                                                    <SpicyCardFace
                                                        card={card()}
                                                    />
                                                    <Show
                                                        when={
                                                            selectedId() ===
                                                            card().id
                                                        }
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            class="absolute right-1 top-1 bg-teal px-1 text-cream"
                                                        >
                                                            ✓
                                                        </span>
                                                    </Show>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </TablePanel>
                                <Show when={current().canPlayCard}>
                                    <TablePanel>
                                        <h2 class="mb-3 font-bebas text-xl">
                                            YOUR CLAIM
                                        </h2>
                                        <div class="space-y-3">
                                            <div class="flex flex-wrap justify-center gap-2">
                                                <For
                                                    each={
                                                        current()
                                                            .allowedDeclarationNumbers
                                                    }
                                                >
                                                    {(value) => (
                                                        <button
                                                            type="button"
                                                            aria-label={`Claim number ${value}`}
                                                            aria-pressed={
                                                                number() ===
                                                                value
                                                                    ? "true"
                                                                    : "false"
                                                            }
                                                            onClick={() =>
                                                                setNumber(value)
                                                            }
                                                            class={`min-h-11 min-w-11 border-2 border-ink font-bebas text-2xl shadow-ink-sm focus-visible:outline-3 focus-visible:outline-navy ${number() === value ? "bg-navy text-cream" : "bg-cream"}`}
                                                        >
                                                            {value}
                                                        </button>
                                                    )}
                                                </For>
                                            </div>
                                            <div class="flex flex-wrap justify-center gap-3">
                                                <For
                                                    each={
                                                        current()
                                                            .allowedDeclarationSpices
                                                    }
                                                >
                                                    {(value) => (
                                                        <button
                                                            type="button"
                                                            aria-label={`Claim ${SPICE_LABELS[value]}`}
                                                            aria-pressed={
                                                                spice() ===
                                                                value
                                                                    ? "true"
                                                                    : "false"
                                                            }
                                                            onClick={() =>
                                                                setSpice(value)
                                                            }
                                                            class={`border-2 border-ink p-2 shadow-ink-sm focus-visible:outline-3 focus-visible:outline-navy ${spice() === value ? "bg-sun" : "bg-cream"}`}
                                                        >
                                                            <SpiceArt
                                                                spice={value}
                                                                class="h-16 w-16"
                                                            />
                                                        </button>
                                                    )}
                                                </For>
                                            </div>
                                            <TableButton
                                                disabled={
                                                    !selected() ||
                                                    !current().allowedDeclarationNumbers.includes(
                                                        number(),
                                                    ) ||
                                                    !current().allowedDeclarationSpices.includes(
                                                        spice(),
                                                    )
                                                }
                                                class="w-full"
                                                tone="navy"
                                                onClick={play}
                                            >
                                                PLAY FACE DOWN
                                            </TableButton>
                                            <Show when={current().canPass}>
                                                <TableButton
                                                    class="w-full"
                                                    onClick={() =>
                                                        send({
                                                            type: "spicy:pass",
                                                            data: {},
                                                        })
                                                    }
                                                >
                                                    PASS + DRAW
                                                </TableButton>
                                            </Show>
                                        </div>
                                    </TablePanel>
                                </Show>
                            </Show>
                            <Show
                                when={
                                    controller() &&
                                    current().phase !== "game_over"
                                }
                                fallback={
                                    <>
                                        <Show
                                            when={
                                                current().phase === "game_over"
                                            }
                                        >
                                            <h2 class="font-bebas text-xl">
                                                FINAL SCORES
                                            </h2>
                                        </Show>
                                        <SpicyBoard
                                            view={spicyTableViewFromPlayer(
                                                current(),
                                            )}
                                        />
                                    </>
                                }
                            >
                                <details class="border-2 border-ink bg-cream p-3">
                                    <summary class="cursor-pointer font-bebas text-xl">
                                        SHOW TABLE
                                    </summary>
                                    <div class="mt-3">
                                        <SpicyBoard
                                            view={spicyTableViewFromPlayer(
                                                current(),
                                            )}
                                        />
                                    </div>
                                </details>
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
