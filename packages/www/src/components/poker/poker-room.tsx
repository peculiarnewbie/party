import { createEffect, createSignal, onCleanup, Show, For } from "solid-js";
import type { Component } from "solid-js";
import type { PokerActionType } from "~/game/poker";
import type { PokerConnection } from "~/game/poker/connection";
import { ActionControls } from "./action-controls";
import { CommunityBoard } from "./community-board";
import { EventLog } from "./event-log";
import { HeroHand } from "./hero-hand";
import { PotDisplay } from "./pot-display";
import { ResultsOverlay } from "./results-overlay";
import { TableSeat } from "./table-seat";

export const PokerRoom: Component<{
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: PokerConnection;
    title: string;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}> = (props) => {
    const gameView = () => props.connection.view();
    const [amount, setAmount] = createSignal("20");
    const [actionError, setActionError] = createSignal<string | null>(null);

    createEffect(() => {
        const view = gameView();
        if (!view) return;
        setActionError(null);
        if (view.minBetOrRaise !== null) {
            setAmount(String(view.minBetOrRaise));
        }
    });

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "poker:action_result") {
                const error = (event.data as { error?: string }).error;
                if (error) setActionError(error);
            }
        }),
    );

    const actingPlayerName = () => {
        const view = gameView();
        if (!view?.actingPlayerId) return "Waiting";
        return (
            view.players.find((player) => player.id === view.actingPlayerId)
                ?.name ?? "Waiting"
        );
    };

    const mySeat = () =>
        gameView()?.players.find((player) => player.id === props.playerId) ??
        null;

    const otherSeats = () =>
        (gameView()?.players ?? []).filter((player) => player.id !== props.playerId);

    const sendAction = (type: PokerActionType, numericAmount?: number) => {
        if (!props.playerId) return;

        const data =
            type === "bet" || type === "raise"
                ? { type, amount: numericAmount ?? Number(amount()) }
                : { type };

        props.connection.send({
            type: "poker:act",
            data: data as never,
        });
    };

    return (
        <div
            data-testid="poker-room"
            class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla flex flex-col"
        >
            <div class="flex items-center justify-between px-4 py-2 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a] flex-wrap gap-2">
                <div class="flex items-center gap-3">
                    <Show
                        when={gameView()?.actingPlayerId === props.playerId}
                        fallback={
                            <span
                                data-testid="poker-turn-banner"
                                class="font-bebas text-[.85rem] tracking-[.12em] text-[#1a1a1a] px-3 py-1 bg-[#ddd5c4] border border-[#b8ae9e]"
                            >
                                {actingPlayerName().toUpperCase()}'S TURN
                            </span>
                        }
                    >
                        <span
                            data-testid="poker-turn-banner"
                            class="font-bebas text-[.85rem] tracking-[.12em] text-[#ddd5c4] px-3 py-1 bg-[#c0261a]"
                        >
                            YOUR TURN
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-2 flex-wrap">
                    <span
                        data-testid="poker-title"
                        class="font-bebas text-[.72rem] tracking-[.18em] text-[#5a5040] px-3 py-1 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        {props.title.toUpperCase()}
                    </span>
                    <span
                        data-testid="poker-hand-number"
                        class="font-bebas text-[.72rem] tracking-[.18em] text-[#5a5040] px-3 py-1 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        HAND {gameView()?.handNumber ?? 0}
                    </span>
                    <span
                        data-testid="poker-street"
                        class="font-bebas text-[.72rem] tracking-[.18em] text-[#5a5040] px-3 py-1 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        {gameView()?.street?.replaceAll("_", " ").toUpperCase() ?? "LOADING"}
                    </span>
                    <Show when={props.isHost && gameView()?.street !== "tournament_over"}>
                        <button
                            type="button"
                            data-testid="poker-end-button"
                            onClick={props.onEndGame}
                            class="font-bebas text-[.75rem] tracking-[.16em] border-2 border-[#1a1a1a] bg-[#ddd5c4] px-3 py-1 cursor-pointer transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                        >
                            END GAME
                        </button>
                    </Show>
                    <span class="font-bebas text-[.65rem] tracking-[.25em] text-[#9a9080]">
                        ROOM {props.roomId.toUpperCase()}
                    </span>
                </div>
            </div>

            <div class="flex-1 px-4 py-6 max-w-6xl mx-auto w-full">
                <div class="grid grid-cols-[1.5fr_.95fr] gap-6 max-lg:grid-cols-1">
                    <div class="space-y-5">
                        <div class="flex flex-wrap justify-center gap-3">
                            <For each={otherSeats()}>
                                {(player) => (
                                    <TableSeat
                                        player={player}
                                        isMe={false}
                                    />
                                )}
                            </For>
                        </div>

                        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] px-4 py-6 shadow-[3px_3px_0_#1a1a1a]">
                            <CommunityBoard board={gameView()?.board ?? []} />
                            <div class="mt-5">
                                <PotDisplay pots={gameView()?.pots ?? []} />
                            </div>
                            <Show when={(gameView()?.spectators.length ?? 0) > 0}>
                                <div class="mt-5 text-center">
                                    <div class="font-bebas text-[.65rem] tracking-[.22em] text-[#7a7060]">
                                        SPECTATORS
                                    </div>
                                    <div
                                        data-testid="poker-spectator-list"
                                        class="font-bebas text-[.95rem] tracking-[.08em] text-[#1a1a1a] mt-1"
                                    >
                                        {gameView()
                                            ?.spectators.map((spectator) => spectator.name)
                                            .join(" · ")}
                                    </div>
                                </div>
                            </Show>
                        </div>

                        <HeroHand
                            cards={gameView()?.myHoleCards ?? []}
                            cardCount={gameView()?.myHoleCardCount ?? 0}
                            isSpectator={gameView()?.isSpectator ?? false}
                            stack={gameView()?.myStack ?? 0}
                            status={gameView()?.myStatus ?? null}
                        />
                    </div>

                    <div class="space-y-5">
                        <ActionControls
                            legalActions={gameView()?.legalActions ?? []}
                            callAmount={gameView()?.callAmount ?? 0}
                            minBetOrRaise={gameView()?.minBetOrRaise ?? null}
                            maxBet={gameView()?.maxBet ?? 0}
                            amount={amount()}
                            setAmount={setAmount}
                            isSpectator={gameView()?.isSpectator ?? true}
                            isMyTurn={gameView()?.actingPlayerId === props.playerId}
                            onAction={sendAction}
                        />
                        <Show when={actionError()}>
                            <div
                                data-testid="poker-action-error"
                                class="border-2 border-[#c0261a] bg-[#ddd5c4] px-4 py-3 font-bebas text-[.8rem] tracking-[.14em] text-[#c0261a]"
                            >
                                {actionError()}
                            </div>
                        </Show>
                        <Show when={mySeat()}>
                            {(seat) => (
                                <TableSeat
                                    player={seat()}
                                    isMe
                                />
                            )}
                        </Show>
                        <EventLog events={gameView()?.eventLog ?? []} />
                    </div>
                </div>
            </div>

            <Show when={gameView()?.street === "tournament_over"}>
                <ResultsOverlay
                    players={gameView()?.players ?? []}
                    winnerIds={gameView()?.winnerIds ?? null}
                    endedByHost={gameView()?.endedByHost ?? false}
                    isHost={props.isHost}
                    onReturnToLobby={props.onReturnToLobby}
                />
            </Show>
        </div>
    );
};
