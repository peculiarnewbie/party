import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onCleanup,
    Show,
} from "solid-js";
import { TableButton } from "~/components/casino/table-button";
import { PerudoDie } from "./perudo-art";
import { PerudoBoard, PerudoStatus } from "./perudo-board";
import { isValidBid } from "~/game/perudo/engine";
import type { PartyLayout } from "~/components/party-layout-controls";
import type {
    PerudoClientOutgoing,
    PerudoConnection,
} from "~/game/perudo/connection";
import type { FaceValue } from "~/game/perudo/types";

interface PerudoRoomProps {
    roomId: string;
    initialLayout?: PartyLayout;
    playerId: string | null;
    isHost: boolean;
    connection: PerudoConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}
const FACES: FaceValue[] = [1, 2, 3, 4, 5, 6];

export function PerudoRoom(props: PerudoRoomProps) {
    const layout = () => props.initialLayout ?? "table";
    const phone = () => layout() === "controller";
    const view = () => props.connection.view();
    const me = () =>
        view()?.players.find((player) => player.id === props.playerId);
    const [quantity, setQuantity] = createSignal(1);
    const [face, setFace] = createSignal<FaceValue>(1);
    const [error, setError] = createSignal<string | null>(null);
    const bidDefaults = createMemo(
        () => {
            const state = view();
            return {
                key: JSON.stringify([
                    state?.roundNumber,
                    state?.phase,
                    state?.currentPlayerId,
                    state?.currentBid,
                    state?.nextHigherBid,
                ]),
                quantity:
                    state?.nextHigherBid?.quantity ??
                    state?.currentBid?.quantity ??
                    1,
                face:
                    state?.nextHigherBid?.faceValue ??
                    state?.currentBid?.faceValue ??
                    1,
            };
        },
        { equals: (previous, next) => previous.key === next.key },
    );
    createEffect(bidDefaults, (defaults) => {
        setQuantity(defaults.quantity);
        setFace(defaults.face);
        setError(null);
    });
    const validity = () =>
        isValidBid(
            { quantity: quantity(), faceValue: face() },
            view()?.currentBid ?? null,
            view()?.totalDiceInPlay ?? 0,
        );
    const send = (message: PerudoClientOutgoing) => {
        if (!props.playerId) return;
        setError(null);
        props.connection.send(message);
    };
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "perudo:error") setError(event.data.message);
        }),
    );
    return (
        <section
            data-testid="perudo-room"
            data-layout={layout()}
            class="paper min-h-screen font-karla text-ink"
        >
            <Show when={view()}>
                {(state) => (
                    <div
                        class={`mx-auto space-y-4 px-3 py-4 ${phone() ? "max-w-md" : "max-w-6xl"}`}
                    >
                        <header class="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h1 class="font-bebas text-4xl leading-none">
                                    PERUDO
                                </h1>
                                <p class="font-bebas text-sm tracking-wider text-muted">
                                    ROUND {state().roundNumber}
                                </p>
                            </div>
                            <Show
                                when={
                                    props.isHost &&
                                    state().phase !== "game_over"
                                }
                            >
                                <TableButton
                                    size="compact"
                                    tone="tomato"
                                    class="px-3"
                                    onClick={props.onEndGame}
                                >
                                    END
                                </TableButton>
                            </Show>
                        </header>
                        <PerudoStatus view={state()} />
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
                        <div
                            class={`grid gap-4 ${phone() ? "" : "lg:grid-cols-[minmax(0,1fr)_340px]"}`}
                        >
                            <Show
                                when={
                                    !phone() ||
                                    state().phase === "revealing" ||
                                    state().phase === "game_over"
                                }
                            >
                                <PerudoBoard view={state()} />
                            </Show>
                            <div class="space-y-4">
                                <Show
                                    when={
                                        state().phase !== "game_over" &&
                                        state().phase !== "revealing" &&
                                        me()
                                    }
                                >
                                    <div
                                        data-testid="perudo-my-dice"
                                        class="border-3 border-ink bg-cream p-3 shadow-ink"
                                    >
                                        <div class="mb-3 flex justify-between font-bebas text-sm tracking-wider">
                                            <span>YOUR DICE</span>
                                            <Show when={me()?.eliminated}>
                                                <span class="text-tomato">
                                                    OUT
                                                </span>
                                            </Show>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <For
                                                each={me()?.dice ?? []}
                                                keyed={false}
                                            >
                                                {(die) => (
                                                    <PerudoDie
                                                        face={die()}
                                                        size={36}
                                                    />
                                                )}
                                            </For>
                                        </div>
                                    </div>
                                </Show>
                                <Show
                                    when={
                                        state().phase === "round_start" &&
                                        state().isMyTurn
                                    }
                                >
                                    <TableButton
                                        tone="sun"
                                        class="w-full"
                                        onClick={() =>
                                            send({
                                                type: "perudo:start_round",
                                                data: {},
                                            })
                                        }
                                    >
                                        OPEN BIDDING
                                    </TableButton>
                                </Show>
                                <Show
                                    when={
                                        state().phase === "bidding" &&
                                        (state().canBid || state().canChallenge)
                                    }
                                >
                                    <div class="space-y-3 border-3 border-ink bg-kraft p-3 shadow-ink">
                                        <div class="flex items-center justify-between gap-3">
                                            <label
                                                for={`perudo-quantity-${props.roomId}`}
                                                class="font-bebas text-lg"
                                            >
                                                YOUR BID
                                            </label>
                                            <div class="flex items-center gap-2">
                                                <select
                                                    id={`perudo-quantity-${props.roomId}`}
                                                    aria-label="Bid quantity"
                                                    class="min-h-12 w-16 border-2 border-ink bg-cream px-2 font-bebas text-2xl"
                                                    value={String(quantity())}
                                                    onChange={(event) =>
                                                        setQuantity(
                                                            Number(
                                                                event
                                                                    .currentTarget
                                                                    .value,
                                                            ),
                                                        )
                                                    }
                                                >
                                                    <For
                                                        each={Array.from(
                                                            {
                                                                length: state()
                                                                    .totalDiceInPlay,
                                                            },
                                                            (_, index) =>
                                                                index + 1,
                                                        )}
                                                        keyed={false}
                                                    >
                                                        {(value) => (
                                                            <option
                                                                value={value()}
                                                                selected={
                                                                    quantity() ===
                                                                    value()
                                                                }
                                                            >
                                                                {value()}
                                                            </option>
                                                        )}
                                                    </For>
                                                </select>
                                                <span class="font-bebas text-2xl">
                                                    ×
                                                </span>
                                                <PerudoDie
                                                    face={face()}
                                                    size={40}
                                                />
                                            </div>
                                        </div>
                                        <div
                                            role="group"
                                            aria-label="Bid face"
                                            class="grid grid-cols-3 gap-2 min-[380px]:grid-cols-6"
                                        >
                                            <For each={FACES} keyed={false}>
                                                {(value) => (
                                                    <button
                                                        type="button"
                                                        aria-label={`Bid face ${value()}`}
                                                        aria-pressed={
                                                            face() === value()
                                                                ? "true"
                                                                : "false"
                                                        }
                                                        class={`flex min-h-12 items-center justify-center border-2 border-ink py-1 shadow-ink-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-navy ${face() === value() ? "bg-sun" : "bg-cream"}`}
                                                        onClick={() =>
                                                            setFace(value())
                                                        }
                                                    >
                                                        <span aria-hidden="true">
                                                            <PerudoDie
                                                                face={value()}
                                                                size={28}
                                                                matched={
                                                                    face() ===
                                                                    value()
                                                                }
                                                            />
                                                        </span>
                                                    </button>
                                                )}
                                            </For>
                                        </div>
                                        <Show when={!validity().valid}>
                                            <p
                                                role="status"
                                                class="text-sm text-tomato"
                                            >
                                                {validity().reason}
                                            </p>
                                        </Show>
                                        <div class="grid grid-cols-2 gap-3">
                                            <TableButton
                                                tone="navy"
                                                disabled={
                                                    !state().canBid ||
                                                    !validity().valid
                                                }
                                                onClick={() =>
                                                    send({
                                                        type: "perudo:bid",
                                                        data: {
                                                            quantity:
                                                                quantity(),
                                                            faceValue: face(),
                                                        },
                                                    })
                                                }
                                            >
                                                BID
                                            </TableButton>
                                            <TableButton
                                                tone="tomato"
                                                class="!text-xl !tracking-wide"
                                                disabled={!state().canChallenge}
                                                onClick={() =>
                                                    send({
                                                        type: "perudo:challenge",
                                                        data: {},
                                                    })
                                                }
                                            >
                                                CHALLENGE
                                            </TableButton>
                                        </div>
                                    </div>
                                </Show>
                                <Show
                                    when={
                                        state().phase === "revealing" &&
                                        state().revealTimerActive
                                    }
                                >
                                    <p class="text-center font-bebas text-sm tracking-wider text-muted">
                                        NEXT ROUND STARTS AUTOMATICALLY
                                    </p>
                                </Show>
                                <Show
                                    when={
                                        state().phase === "game_over" &&
                                        props.isHost
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
                                <details class="border-t-2 border-ink/20 pt-2 text-sm">
                                    <summary class="min-h-11 cursor-pointer py-2 font-bebas tracking-wider">
                                        BIDDING RULES
                                    </summary>
                                    <div class="space-y-2 pt-2">
                                        <p>
                                            Bid how many dice show a face across
                                            everyone’s cups. Raise the quantity,
                                            or use a higher face at the same
                                            quantity.
                                        </p>
                                        <p>
                                            Ones are wild except in a Palifico
                                            round. Challenge if you think the
                                            last bid is too high: the loser
                                            loses a die.
                                        </p>
                                    </div>
                                </details>
                            </div>
                        </div>
                    </div>
                )}
            </Show>
        </section>
    );
}
