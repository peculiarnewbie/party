import { createEffect, createSignal, For, Show, onCleanup } from "solid-js";
import { TableButton, TableLayout } from "~/components/casino";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { GoFishFelt } from "./go-fish-felt";
import { PlayerHand } from "./player-hand";
import { BooksDisplay } from "./books-display";
import { TurnActions } from "./turn-actions";
import { FishArt, GoFishStatus } from "./go-fish-status";
import type { Rank } from "~/assets/card-deck/types";
import type { GoFishConnection } from "~/game/go-fish/connection";
import type { PartyLayout } from "~/components/party-layout-controls";

export function GoFishRoom(props: {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: GoFishConnection;
    initialLayout?: PartyLayout;
    onEndGame?: () => void;
    onReturnToLobby?: () => void;
}) {
    const view = () => props.connection.view();
    const phone = () => props.initialLayout === "controller";
    const [opponent, setOpponent] = createSignal<string | null>(null);
    const [rank, setRank] = createSignal<Rank | null>(null);
    const [error, setError] = createSignal<string | null>(null);
    createEffect(view, () => {
        setError(null);
    });
    const myTurn = () =>
        view()?.currentPlayerId === props.playerId && !view()?.gameOver;
    const canAsk = () => myTurn() && view()?.turnPhase === "awaiting_ask";
    const opponents = () =>
        view()?.players.filter((player) => player.id !== props.playerId) ?? [];
    const actor = () =>
        view()?.players.find((player) => player.id === view()?.currentPlayerId)
            ?.name ?? "Player";
    const clear = () => {
        setOpponent(null);
        setRank(null);
    };
    createEffect(
        () =>
            `${view()?.currentPlayerId}:${view()?.turnPhase}:${view()?.gameOver}`,
        () => clear(),
    );
    onCleanup(
        props.connection.subscribe((event) => {
            if (
                (event.type === "go_fish:ask_result" ||
                    event.type === "go_fish:draw_result") &&
                "error" in event.data
            ) {
                setError(event.data.error);
                clear();
            }
        }),
    );
    const ask = (targetId: string | null, selected: Rank | null) => {
        if (!canAsk() || !targetId || !selected) return;
        props.connection.send({
            type: "go_fish:ask",
            data: { targetId, rank: selected },
        });
        clear();
    };
    const selectOpponent = (id: string) => {
        setOpponent(id);
        ask(id, rank());
    };
    const selectRank = (value: Rank) => {
        setRank(value);
        ask(opponent(), value);
    };
    const hand = () => (
        <div class="min-w-0 space-y-3">
            <PlayerHand
                cards={view()?.myHand ?? []}
                selectedRank={rank()}
                onSelectRank={selectRank}
                disabled={!canAsk()}
            />
            <div
                class="border-3 border-ink bg-cream p-3 shadow-ink"
                data-testid="go-fish-actions"
            >
                <TurnActions
                    isMyTurn={myTurn()}
                    turnPhase={view()?.turnPhase ?? "awaiting_ask"}
                    selectedOpponent={opponent()}
                    selectedOpponentName={
                        opponents().find((player) => player.id === opponent())
                            ?.name ?? null
                    }
                    selectedRank={rank()}
                    onCancel={clear}
                    currentPlayerName={actor()}
                />
                <Show when={myTurn() && view()?.turnPhase === "go_fish"}>
                    <TableButton
                        tone="tomato"
                        class="flex w-full items-center justify-center gap-3"
                        onClick={() =>
                            props.connection.send({
                                type: "go_fish:draw",
                                data: {},
                            })
                        }
                    >
                        <FishArt class="h-10 w-14" />
                        Go Fish!
                    </TableButton>
                </Show>
                <BooksDisplay
                    books={
                        view()?.players.find(
                            (player) => player.id === props.playerId,
                        )?.books ?? []
                    }
                />
            </div>
        </div>
    );
    return (
        <div
            data-testid="go-fish-room"
            data-layout={phone() ? "controller" : "table"}
            class={`${phone() ? "min-h-dvh" : "h-dvh min-h-0"} paper flex flex-col font-karla text-ink`}
        >
            <header class="flex flex-wrap items-center justify-between gap-2 border-b-3 border-ink bg-kraft px-3 py-2">
                <h1 class="font-bebas text-2xl">GO FISH</h1>
                <span
                    class={`font-bebas text-lg ${myTurn() ? "text-tomato" : "text-ink"}`}
                >
                    {view()?.gameOver
                        ? "FINAL BOOKS"
                        : myTurn()
                          ? "YOUR TURN"
                          : `${actor().toUpperCase()}'S TURN`}
                </span>
                <Show
                    when={props.isHost && props.onEndGame && !view()?.gameOver}
                >
                    <TableButton
                        size="compact"
                        onClick={() => props.onEndGame?.()}
                    >
                        END
                    </TableButton>
                </Show>
            </header>
            <Show when={error()}>
                {(message) => (
                    <p
                        role="alert"
                        class="m-3 border-2 border-tomato bg-cream p-3 text-tomato"
                    >
                        {message()}
                    </p>
                )}
            </Show>
            <Show
                when={!view()?.gameOver}
                fallback={
                    <section
                        class="mx-auto my-4 w-[calc(100%-24px)] max-w-3xl border-3 border-ink bg-cream p-4 shadow-ink"
                        data-testid="go-fish-game-over"
                    >
                        <h2 class="font-bebas text-xl">GAME OVER</h2>
                        <h3 class="mb-4 font-bebas text-4xl text-teal">
                            {view()?.winner?.includes(props.playerId ?? "")
                                ? "YOU WIN!"
                                : `${
                                      view()
                                          ?.players.filter((player) =>
                                              view()?.winner?.includes(
                                                  player.id,
                                              ),
                                          )
                                          .map((player) =>
                                              player.name.toUpperCase(),
                                          )
                                          .join(" & ") || "DRAW"
                                  }${view()?.winner?.length ? " WINS!" : ""}`}
                        </h3>
                        <For
                            each={[...(view()?.players ?? [])].sort(
                                (a, b) => b.books.length - a.books.length,
                            )}
                            keyed={false}
                        >
                            {(player) => (
                                <div class="border-t border-ink/20 py-3">
                                    <div class="flex items-center gap-3">
                                        <PlayerAvatar
                                            id={player().id}
                                            name={player().name}
                                        />
                                        <span class="min-w-0 flex-1 truncate font-bebas text-2xl">
                                            {player().name}
                                        </span>
                                        <span class="font-bebas text-xl">
                                            {player().books.length} BOOKS
                                        </span>
                                    </div>
                                    <BooksDisplay
                                        books={player().books}
                                        label=""
                                    />
                                </div>
                            )}
                        </For>
                        <Show when={props.isHost && props.onReturnToLobby}>
                            <TableButton
                                class="mt-4 w-full"
                                onClick={() => props.onReturnToLobby?.()}
                            >
                                Back to Lobby
                            </TableButton>
                        </Show>
                    </section>
                }
            >
                <Show
                    when={phone()}
                    fallback={
                        <>
                            <Show when={view()?.lastAction}>
                                <div class="mx-auto w-full max-w-3xl px-3 pt-3">
                                    <Show when={view()}>
                                        {(current) => (
                                            <GoFishStatus view={current()} />
                                        )}
                                    </Show>
                                </div>
                            </Show>
                            <TableLayout
                                table={
                                    <GoFishFelt
                                        fit
                                        players={view()?.players ?? []}
                                        heroId={props.playerId}
                                        currentPlayerId={
                                            view()?.currentPlayerId ?? ""
                                        }
                                        selectedOpponent={opponent()}
                                        canAsk={canAsk()}
                                        drawPileCount={
                                            view()?.drawPileCount ?? 0
                                        }
                                        onSelect={selectOpponent}
                                    />
                                }
                            >
                                <div class="mx-auto w-full max-w-3xl">
                                    {hand()}
                                </div>
                            </TableLayout>
                        </>
                    }
                >
                    <main class="mx-auto w-full max-w-lg space-y-4 p-3 pb-6">
                        <Show when={view()}>
                            {(current) => <GoFishStatus view={current()} />}
                        </Show>
                        <div class="flex items-center justify-between gap-2 font-bebas text-sm">
                            <span>{canAsk() ? "ASK A PLAYER" : "PLAYERS"}</span>
                            <span>{view()?.drawPileCount ?? 0} LEFT</span>
                        </div>
                        <div
                            class="grid grid-cols-2 gap-2"
                            data-testid="go-fish-opponents"
                        >
                            <For each={opponents()} keyed={false}>
                                {(player) => (
                                    <button
                                        type="button"
                                        disabled={!canAsk()}
                                        aria-pressed={
                                            opponent() === player().id
                                                ? "true"
                                                : "false"
                                        }
                                        onClick={() =>
                                            selectOpponent(player().id)
                                        }
                                        class={`flex min-h-16 min-w-0 items-center gap-2 border-2 border-ink p-2 text-left shadow-ink-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-navy ${opponent() === player().id ? "bg-sun" : "bg-cream"}`}
                                    >
                                        <PlayerAvatar
                                            id={player().id}
                                            name={player().name}
                                            class="h-8 w-8 text-xl"
                                        />
                                        <div class="min-w-0">
                                            <span class="block truncate font-bebas text-xl">
                                                {player().name}
                                            </span>
                                            <span class="block text-[11px] leading-tight">
                                                {player().cardCount}{" "}
                                                {player().cardCount === 1
                                                    ? "card"
                                                    : "cards"}{" "}
                                                · {player().books.length}{" "}
                                                {player().books.length === 1
                                                    ? "book"
                                                    : "books"}
                                            </span>
                                        </div>
                                    </button>
                                )}
                            </For>
                        </div>
                        {hand()}
                    </main>
                </Show>
            </Show>
        </div>
    );
}
