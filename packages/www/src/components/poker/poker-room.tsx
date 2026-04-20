import { createEffect, createSignal, onCleanup, Show, For } from "solid-js";
import type { Component } from "solid-js";
import type { PokerActionType, PokerEvent } from "~/game/poker";
import type { PokerConnection } from "~/game/poker/connection";
import { ActionControls } from "./action-controls";
import { CommunityBoard } from "./community-board";
import { EventLog } from "./event-log";
import { HandResultBanner } from "./hand-result-banner";
import { HeroHand } from "./hero-hand";
import { PotDisplay } from "./pot-display";
import { ResultsOverlay } from "./results-overlay";
import { StreetBanner } from "./street-banner";
import { TableSeat } from "./table-seat";

function getLastActionText(event: PokerEvent): string {
    const msg = event.message;
    if (msg.includes("folded")) return "Folded";
    if (msg.includes("checked")) return "Checked";
    if (msg.includes("called")) return "Called";
    if (msg.includes("raised to")) return "Raised";
    if (msg.includes("bet")) return "Bet";
    if (msg.includes("all-in")) return "All-in";
    return "";
}

function computeLastActions(events: PokerEvent[]): Record<string, string> {
    const actions: Record<string, string> = {};
    for (const event of events) {
        if (event.type === "player_action" && event.playerId) {
            const text = getLastActionText(event);
            if (text) {
                actions[event.playerId] = text;
            }
        }
    }
    return actions;
}

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

    const otherSeats = () =>
        (gameView()?.players ?? []).filter((player) => player.id !== props.playerId);

    const lastActions = () => computeLastActions(gameView()?.eventLog ?? []);

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

    const view = () => gameView();

    return (
        <div
            data-testid="poker-room"
            class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla flex flex-col"
        >
            <div class="flex items-center justify-between px-3 py-1.5 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a] flex-wrap gap-2">
                <div class="flex items-center gap-2">
                    <Show
                        when={gameView()?.actingPlayerId === props.playerId}
                        fallback={
                            <span
                                data-testid="poker-turn-banner"
                                class="font-bebas text-[.75rem] tracking-[.12em] text-[#1a1a1a] px-2 py-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                            >
                                {actingPlayerName().toUpperCase()}'S TURN
                            </span>
                        }
                    >
                        <span
                            data-testid="poker-turn-banner"
                            class="font-bebas text-[.75rem] tracking-[.12em] text-[#ddd5c4] px-2 py-0.5 bg-[#c0261a] animate-pulse-fast"
                        >
                            YOUR TURN
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-1.5 flex-wrap">
                    <span
                        data-testid="poker-title"
                        class="font-bebas text-[.65rem] tracking-[.18em] text-[#5a5040] px-2 py-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        {props.title.toUpperCase()}
                    </span>
                    <span
                        data-testid="poker-hand-number"
                        class="font-bebas text-[.65rem] tracking-[.18em] text-[#5a5040] px-2 py-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        HAND {gameView()?.handNumber ?? 0}
                    </span>
                    <span
                        data-testid="poker-street"
                        class="font-bebas text-[.65rem] tracking-[.18em] text-[#5a5040] px-2 py-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        {gameView()?.street?.replaceAll("_", " ").toUpperCase() ?? "LOADING"}
                    </span>
                    <Show when={props.isHost && gameView()?.street !== "tournament_over"}>
                        <button
                            type="button"
                            data-testid="poker-end-button"
                            onClick={props.onEndGame}
                            class="font-bebas text-[.65rem] tracking-[.16em] border-2 border-[#1a1a1a] bg-[#ddd5c4] px-2 py-0.5 cursor-pointer transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                        >
                            END GAME
                        </button>
                    </Show>
                    <span class="font-bebas text-[.6rem] tracking-[.25em] text-[#9a9080]">
                        ROOM {props.roomId.toUpperCase()}
                    </span>
                </div>
            </div>

            <div class="flex-1 px-3 py-4 max-w-6xl mx-auto w-full">
                <div class="grid grid-cols-[1.5fr_.95fr] gap-4 max-lg:grid-cols-1">
                    <div class="space-y-4 max-lg:contents">
                        <div class="flex flex-wrap justify-center gap-2 max-lg:order-2">
                            <For each={otherSeats()}>
                                {(player) => (
                                    <TableSeat
                                        player={player}
                                        isMe={false}
                                        lastAction={lastActions()[player.id]}
                                    />
                                )}
                            </For>
                        </div>

                        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] px-3 py-4 shadow-[3px_3px_0_#1a1a1a] max-lg:order-1">
                            <CommunityBoard board={gameView()?.board ?? []} />
                            <div class="mt-4">
                                <PotDisplay pots={gameView()?.pots ?? []} />
                            </div>
                            <Show when={(gameView()?.spectators.length ?? 0) > 0}>
                                <div class="mt-4 text-center">
                                    <div class="font-bebas text-[.6rem] tracking-[.22em] text-[#7a7060]">
                                        SPECTATORS
                                    </div>
                                    <div
                                        data-testid="poker-spectator-list"
                                        class="font-bebas text-[.85rem] tracking-[.08em] text-[#1a1a1a] mt-1"
                                    >
                                        {gameView()
                                            ?.spectators.map((spectator) => spectator.name)
                                            .join(" · ")}
                                    </div>
                                </div>
                            </Show>
                        </div>

                        <div class="max-lg:order-5">
                            <EventLog events={gameView()?.eventLog ?? []} />
                        </div>
                    </div>

                    <div class="space-y-3 max-lg:contents">
                        <div class="max-lg:order-3">
                            <HeroHand
                                cards={gameView()?.myHoleCards ?? []}
                                cardCount={gameView()?.myHoleCardCount ?? 0}
                                isSpectator={gameView()?.isSpectator ?? false}
                            />
                        </div>

                        <div class="max-lg:order-4">
                            <ActionControls
                                legalActions={gameView()?.legalActions ?? []}
                                callAmount={gameView()?.callAmount ?? 0}
                                minBetOrRaise={gameView()?.minBetOrRaise ?? null}
                                maxBet={gameView()?.maxBet ?? 0}
                                stack={gameView()?.myStack ?? 0}
                                amount={amount()}
                                setAmount={setAmount}
                                isSpectator={gameView()?.isSpectator ?? true}
                                isMyTurn={gameView()?.actingPlayerId === props.playerId}
                                onAction={sendAction}
                            />
                        </div>

                        <Show when={actionError()}>
                            <div
                                data-testid="poker-action-error"
                                class="border-2 border-[#c0261a] bg-[#ddd5c4] px-3 py-2 font-bebas text-[.75rem] tracking-[.14em] text-[#c0261a] max-lg:order-5"
                            >
                                {actionError()}
                            </div>
                        </Show>
                    </div>
                </div>
            </div>

            <StreetBanner street={view()?.street ?? "preflop"} />
            <HandResultBanner
                events={view()?.eventLog ?? []}
                players={view()?.players ?? []}
                handNumber={view()?.handNumber ?? 0}
                street={view()?.street ?? "preflop"}
            />

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
