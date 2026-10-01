import { createSignal, For, onCleanup, Show } from "solid-js";
import { TableButton } from "~/components/casino/table-button";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { PlayerBoard } from "./player-board";
import { Flip7Results, Flip7Status } from "./flip-7-status";
import type { PartyLayout } from "~/components/party-layout-controls";
import type {
    Flip7ClientOutgoing,
    Flip7Connection,
} from "~/game/flip-7/connection";

interface Flip7RoomProps {
    roomId: string;
    initialLayout?: PartyLayout;
    playerId: string | null;
    isHost: boolean;
    connection: Flip7Connection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export function Flip7Room(props: Flip7RoomProps) {
    const layout = () => props.initialLayout ?? "table";
    const phone = () => layout() === "controller";
    const view = () => props.connection.view();
    const [error, setError] = createSignal<string | null>(null);
    const send = (message: Flip7ClientOutgoing) => {
        if (!props.playerId) return;
        setError(null);
        props.connection.send(message);
    };
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "flip_7:error") setError(event.data.message);
        }),
    );
    const finished = () =>
        view()?.phase === "round_over" || view()?.phase === "game_over";
    const players = () =>
        view()?.players.filter(
            (player) => !phone() || player.id === props.playerId,
        ) ?? [];
    return (
        <section
            data-testid="flip-7-room"
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
                                    FLIP 7
                                </h1>
                                <p class="font-bebas text-sm tracking-wider text-muted">
                                    ROUND {state().roundNumber} · TARGET{" "}
                                    {state().targetScore}
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
                                    END GAME
                                </TableButton>
                            </Show>
                        </header>
                        <Flip7Status view={state()} />
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
                            class={`grid gap-4 ${phone() ? "" : "lg:grid-cols-[minmax(0,1fr)_320px]"}`}
                        >
                            <div class="space-y-4">
                                <div
                                    class={`grid gap-4 ${phone() ? "" : "grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))]"}`}
                                >
                                    <For each={players()} keyed={false}>
                                        {(player) => (
                                            <PlayerBoard
                                                player={player()}
                                                roundScore={
                                                    state().lastRoundResult?.scores.find(
                                                        (score) =>
                                                            score.playerId ===
                                                            player().id,
                                                    )?.score
                                                }
                                                isCurrent={
                                                    state().currentPlayerId ===
                                                    player().id
                                                }
                                                isWinner={
                                                    state().winners?.includes(
                                                        player().id,
                                                    ) ?? false
                                                }
                                            />
                                        )}
                                    </For>
                                </div>
                            </div>
                            <div class="space-y-4">
                                <Show when={state().requiresMyTargetChoice}>
                                    <div class="grid grid-cols-2 gap-3">
                                        <For
                                            each={state().players.filter(
                                                (player) =>
                                                    state().validTargetIds.includes(
                                                        player.id,
                                                    ),
                                            )}
                                            keyed={false}
                                        >
                                            {(player) => (
                                                <TableButton
                                                    tone="cream"
                                                    label={player().name}
                                                    class="flex min-w-0 items-center gap-2 px-2 !text-lg !tracking-normal"
                                                    onClick={() =>
                                                        send({
                                                            type: "flip_7:choose_target",
                                                            data: {
                                                                targetId:
                                                                    player().id,
                                                            },
                                                        })
                                                    }
                                                >
                                                    <PlayerAvatar
                                                        id={player().id}
                                                        name={player().name}
                                                        class="h-9 w-9 text-xl"
                                                    />
                                                    <span class="break-words">
                                                        {player().name}
                                                    </span>
                                                </TableButton>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                                <Show
                                    when={
                                        state().phase === "turn" &&
                                        (state().canHit || state().canStay)
                                    }
                                >
                                    <div class="grid grid-cols-2 gap-3">
                                        <TableButton
                                            tone="navy"
                                            disabled={!state().canHit}
                                            onClick={() =>
                                                send({
                                                    type: "flip_7:hit",
                                                    data: {},
                                                })
                                            }
                                        >
                                            HIT
                                        </TableButton>
                                        <TableButton
                                            tone="sun"
                                            disabled={!state().canStay}
                                            onClick={() =>
                                                send({
                                                    type: "flip_7:stay",
                                                    data: {},
                                                })
                                            }
                                        >
                                            STAY
                                        </TableButton>
                                    </div>
                                </Show>
                                <Show when={finished()}>
                                    <Flip7Results view={state()} />
                                    <Show when={props.isHost}>
                                        <Show
                                            when={
                                                state().phase === "round_over"
                                            }
                                            fallback={
                                                <TableButton
                                                    tone="navy"
                                                    class="w-full"
                                                    onClick={
                                                        props.onReturnToLobby
                                                    }
                                                >
                                                    RETURN TO LOBBY
                                                </TableButton>
                                            }
                                        >
                                            <TableButton
                                                tone="navy"
                                                class="w-full"
                                                onClick={() =>
                                                    send({
                                                        type: "flip_7:next_round",
                                                        data: {},
                                                    })
                                                }
                                            >
                                                NEXT ROUND
                                            </TableButton>
                                        </Show>
                                    </Show>
                                </Show>
                                <Show when={!phone()}>
                                    <div class="flex justify-between border-2 border-ink bg-kraft px-3 py-2 font-bebas tracking-wide">
                                        <span>
                                            DECK{" "}
                                            <strong>{state().deckCount}</strong>
                                        </span>
                                        <span>
                                            DISCARD{" "}
                                            <strong>
                                                {state().discardCount}
                                            </strong>
                                        </span>
                                    </div>
                                </Show>
                                <details class="border-t-2 border-ink/20 pt-2 text-sm">
                                    <summary class="min-h-11 cursor-pointer py-2 font-bebas tracking-wider">
                                        SCORING & CARDS
                                    </summary>
                                    <div class="space-y-2 pt-2">
                                        <p>
                                            Seven different numbers earns +15
                                            and ends the round. A duplicate
                                            busts your round.
                                        </p>
                                        <p>
                                            Add numbers, double them with ×2,
                                            then add bonuses. Stay to bank your
                                            points.
                                        </p>
                                        <p>
                                            Freeze banks a player’s cards. Flip
                                            Three draws three for them. Second
                                            Chance saves one duplicate.
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
