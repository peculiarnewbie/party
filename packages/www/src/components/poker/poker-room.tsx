import {
    createEffect,
    createMemo,
    createSignal,
    onCleanup,
    Show,
    For,
} from "solid-js";
import type { Component } from "solid-js";
import type { PokerActionType } from "~/game/poker";
import { evaluateBestHand } from "~/game/poker/engine";
import type { PokerConnection } from "~/game/poker/connection";
import type { Card } from "~/assets/card-deck/types";
import {
    CardSlot,
    buzz,
    Confetti,
    playSfx,
    SoundToggle,
    TableCard,
    TableLayout,
} from "~/components/casino";
import { ActionControls } from "./action-controls";
import { EventLog } from "./event-log";
import { HeroHand } from "./hero-hand";
import { ResultsOverlay } from "./results-overlay";
import { OpponentHands } from "./opponent-hands";
import { PokerFelt } from "./poker-felt";
import { potResults, winningsByPlayer } from "./hand-events";
import type { PokerVisibilityMode } from "~/game/poker/views";

function describeHand(cards: Card[], board: Card[]): string | null {
    if (cards.length === 0) return null;
    const all = [...cards, ...board];
    if (all.length >= 5) return evaluateBestHand(all).label;
    if (cards.length === 2 && cards[0].rank === cards[1].rank)
        return "Pocket Pair";
    if (cards.length === 2 && cards[0].suit === cards[1].suit) return "Suited";
    return null;
}

export const PokerRoom: Component<{
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: PokerConnection;
    title: string;
    initialLayout?: "table" | "controller";
    visibilityMode?: PokerVisibilityMode;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}> = (props) => {
    const gameView = () => props.connection.view();
    const [amount, setAmount] = createSignal("20");
    const [actionError, setActionError] = createSignal<string | null>(null);
    const layout = () => props.initialLayout ?? "table";
    const isController = () => layout() === "controller";
    const isMyTurn = () =>
        !!props.playerId && gameView()?.actingPlayerId === props.playerId;

    createEffect(gameView, (view) => {
        if (!view) return;
        setActionError(null);
        if (view.minBetOrRaise !== null) {
            setAmount(String(view.minBetOrRaise));
        }
    });

    createEffect(isMyTurn, (mine, previous) => {
        if (!mine || previous) return;
        playSfx("turn");
        buzz([60, 40, 60]);
    });

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "poker:action_result") {
                setActionError(event.data.error);
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
        (gameView()?.players ?? []).filter(
            (player) => player.id !== props.playerId,
        );
    const me = () =>
        gameView()?.players.find((player) => player.id === props.playerId);
    const pot = () =>
        (gameView()?.pots ?? []).reduce((total, pot) => total + pot.amount, 0);
    const finished = () =>
        ["hand_over", "tournament_over"].includes(gameView()?.street ?? "");
    const results = createMemo(() => {
        const view = gameView();
        if (!view || !finished()) return [];
        return potResults(view.eventLog, view.players);
    });
    const myWinnings = () =>
        props.playerId ? (winningsByPlayer(results())[props.playerId] ?? 0) : 0;
    createEffect(
        () => ({ won: myWinnings(), controller: isController() }),
        (next, previous) => {
            if (next.controller && next.won > 0 && !previous?.won)
                playSfx("win");
        },
    );
    const handLabel = () =>
        describeHand(gameView()?.myHoleCards ?? [], gameView()?.board ?? []);

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

    const controls = () => (
        <ActionControls
            legalActions={gameView()?.legalActions ?? []}
            callAmount={gameView()?.callAmount ?? 0}
            minBetOrRaise={gameView()?.minBetOrRaise ?? null}
            maxBet={gameView()?.maxBet ?? 0}
            stack={gameView()?.myStack ?? 0}
            amount={amount()}
            setAmount={setAmount}
            isSpectator={gameView()?.isSpectator ?? true}
            isMyTurn={isMyTurn()}
            onAction={sendAction}
            pot={pot()}
            committed={me()?.committedThisStreet ?? 0}
            waitingFor={
                gameView()?.actingPlayerId ? actingPlayerName() : undefined
            }
        />
    );

    const errorBanner = () => (
        <Show when={actionError()}>
            <div
                data-testid="poker-action-error"
                role="alert"
                class="border-2 border-[#1a1a1a] bg-[#c0261a] px-4 pt-2 pb-1.5 font-bebas tracking-[.12em] text-[#f7f2de] shadow-[4px_4px_0_#1a1a1a] animate-wiggle"
            >
                {actionError()}
            </div>
        </Show>
    );

    return (
        <div
            data-testid="poker-room"
            data-layout={layout()}
            class="relative h-dvh min-h-0 paper text-[#1a1a1a] font-karla flex flex-col overflow-x-hidden"
        >
            <Show when={isMyTurn()}>
                <div class="pointer-events-none fixed inset-0 z-30 border-[6px] border-[#c0261a] animate-pulse-fast" />
            </Show>

            <header class="flex items-center justify-between gap-2 px-3 py-2 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a] shrink-0">
                <Show
                    when={isMyTurn()}
                    fallback={
                        <span
                            data-testid="poker-turn-banner"
                            class="min-w-0 truncate font-bebas text-sm tracking-[.12em] text-[#1a1a1a] px-2.5 pt-1 pb-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                        >
                            {gameView()?.actingPlayerId
                                ? `${actingPlayerName().toUpperCase()}'S TURN`
                                : finished()
                                  ? "HAND OVER"
                                  : "SHUFFLING…"}
                        </span>
                    }
                >
                    <span
                        data-testid="poker-turn-banner"
                        class="font-bebas text-sm tracking-[.16em] text-[#f7f2de] px-2.5 pt-1 pb-0.5 bg-[#c0261a] border-2 border-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] animate-nudge"
                    >
                        YOUR TURN
                    </span>
                </Show>
                <div class="flex items-center gap-1.5 justify-end shrink-0">
                    <SoundToggle compact class="!px-1.5 !py-0.5" />
                    <span
                        data-testid="poker-title"
                        class="hidden sm:inline font-bebas text-xs tracking-[.16em] text-[#5a5040] px-2 pt-1 pb-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        {props.title.toUpperCase()}
                    </span>
                    <span
                        data-testid="poker-hand-number"
                        class="hidden sm:inline font-bebas text-xs tracking-[.16em] text-[#5a5040] px-2 pt-1 pb-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        HAND {gameView()?.handNumber ?? 0}
                    </span>
                    <span
                        data-testid="poker-street"
                        class="font-bebas text-xs tracking-[.16em] text-[#5a5040] px-2 pt-1 pb-0.5 bg-[#ddd5c4] border border-[#b8ae9e]"
                    >
                        {gameView()
                            ?.street?.replaceAll("_", " ")
                            .toUpperCase() ?? "LOADING"}
                    </span>
                    <Show
                        when={
                            props.isHost &&
                            gameView()?.street !== "tournament_over"
                        }
                    >
                        <button
                            type="button"
                            data-testid="poker-end-button"
                            onClick={props.onEndGame}
                            class="font-bebas text-xs tracking-[.16em] border-2 border-[#1a1a1a] bg-[#ddd5c4] text-[#c0261a] px-2 pt-1 pb-0.5 cursor-pointer transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                        >
                            END GAME
                        </button>
                    </Show>
                </div>
            </header>

            <Show
                when={isController()}
                fallback={
                    <TableLayout
                        table={
                            <div class="w-full h-full min-h-0 relative">
                                <PokerFelt
                                    fit
                                    players={gameView()?.players ?? []}
                                    board={gameView()?.board ?? []}
                                    pots={gameView()?.pots ?? []}
                                    street={gameView()?.street ?? "preflop"}
                                    handNumber={gameView()?.handNumber ?? 0}
                                    eventLog={gameView()?.eventLog ?? []}
                                    title={props.title}
                                    heroId={props.playerId}
                                    heroCards={gameView()?.myHoleCards ?? []}
                                    center={
                                        <Show when={results().length > 0}>
                                            <div class="rounded-[calc(var(--u)*0.6)] border-[length:calc(var(--u)*0.3)] border-[#1a1a1a] bg-[#f5c542] px-[calc(var(--u)*2)] pt-[calc(var(--u)*0.8)] pb-[calc(var(--u)*0.4)] text-center font-bebas tracking-wider text-[#1a1a1a] text-[calc(var(--u)*2.2)] whitespace-nowrap shadow-[calc(var(--u)*0.5)_calc(var(--u)*0.5)_0_#1a1a1a] animate-stamp-in [--stamp-rot:-2deg]">
                                                <For each={results()}>
                                                    {(result) => (
                                                        <div>
                                                            {result.message}
                                                        </div>
                                                    )}
                                                </For>
                                            </div>
                                        </Show>
                                    }
                                />
                                <Show
                                    when={
                                        (gameView()?.spectators.length ?? 0) > 0
                                    }
                                >
                                    <div class="absolute bottom-0 inset-x-0 text-center">
                                        <span class="font-bebas text-xs tracking-[.22em] text-[#9a9080]">
                                            SPECTATORS{" "}
                                        </span>
                                        <span
                                            data-testid="poker-spectator-list"
                                            class="font-bebas tracking-[.08em] text-[#1a1a1a]"
                                        >
                                            {gameView()
                                                ?.spectators.map(
                                                    (spectator) =>
                                                        spectator.name,
                                                )
                                                .join(" · ")}
                                        </span>
                                    </div>
                                </Show>
                            </div>
                        }
                    >
                        <div class="w-full max-w-3xl mx-auto space-y-2">
                            <Show when={gameView()?.isSpectator}>
                                <HeroHand
                                    cards={[]}
                                    cardCount={0}
                                    isSpectator
                                />
                            </Show>
                            {controls()}
                            {errorBanner()}
                            <details class="relative text-right">
                                <summary class="cursor-pointer font-bebas text-sm tracking-wider">
                                    Table log
                                </summary>
                                <div class="fixed right-3 bottom-14 z-40 w-[min(360px,calc(100vw-24px))] text-left">
                                    <EventLog
                                        events={gameView()?.eventLog ?? []}
                                    />
                                </div>
                            </details>
                        </div>
                    </TableLayout>
                }
            >
                <div class="flex-1 w-full max-w-md mx-auto px-3 pt-3 pb-16 space-y-3">
                    <div
                        data-testid="poker-controller-context"
                        class="table-mat relative overflow-hidden rounded-2xl border-[3px] border-[#1a1a1a] p-3 text-center text-[#f7f2de] shadow-[4px_4px_0_#1a1a1a]"
                    >
                        <div class="relative flex items-center justify-center gap-1.5">
                            <For each={[0, 1, 2, 3, 4]} keyed={false}>
                                {(index) => (
                                    <Show
                                        when={gameView()?.board[index()]}
                                        fallback={<CardSlot class="w-[52px]" />}
                                    >
                                        {(card) => (
                                            <TableCard
                                                card={card()}
                                                class="w-[52px]"
                                            />
                                        )}
                                    </Show>
                                )}
                            </For>
                        </div>
                        <p class="relative mt-2.5 font-bebas text-lg tracking-wider">
                            Pot <span class="text-[#f5c542]">{pot()}</span> · To
                            call{" "}
                            <span class="text-[#f5c542]">
                                {gameView()?.callAmount ?? 0}
                            </span>
                        </p>
                    </div>

                    <Show
                        when={
                            props.visibilityMode === "backwards" &&
                            !gameView()?.isSpectator
                        }
                        fallback={
                            <HeroHand
                                cards={gameView()?.myHoleCards ?? []}
                                cardCount={gameView()?.myHoleCardCount ?? 0}
                                isSpectator={gameView()?.isSpectator ?? false}
                                handNumber={gameView()?.handNumber ?? 0}
                                label={handLabel()}
                                folded={gameView()?.myStatus === "folded"}
                            />
                        }
                    >
                        <OpponentHands
                            players={otherSeats()}
                            seatOrder={(gameView()?.players ?? []).map(
                                (player) => player.id,
                            )}
                        />
                    </Show>

                    {controls()}
                    {errorBanner()}
                </div>
            </Show>

            <Show
                when={
                    isController() &&
                    results().length > 0 &&
                    gameView()?.street === "hand_over"
                }
            >
                <div class="fixed inset-x-0 bottom-14 z-40 flex justify-center px-4 pointer-events-none">
                    <div
                        data-testid="poker-phone-result"
                        class={`w-full max-w-sm border-[3px] border-[#1a1a1a] px-5 pt-4 pb-3 text-center shadow-[6px_6px_0_#1a1a1a] animate-stamp-in [--stamp-rot:-1.5deg] ${myWinnings() > 0 ? "bg-[#f5c542]" : "bg-[#f7f2de]"}`}
                    >
                        <Show
                            when={myWinnings() > 0}
                            fallback={
                                <For each={results()}>
                                    {(result) => (
                                        <p class="font-bebas text-2xl tracking-wide text-[#1a1a1a]">
                                            {result.message}
                                        </p>
                                    )}
                                </For>
                            }
                        >
                            <p class="inline-block font-bebas tracking-[.3em] bg-[#c0261a] text-[#f7f2de] px-3 pt-1">
                                You win
                            </p>
                            <p class="font-bebas text-[#1a1a1a] text-6xl leading-none mt-2">
                                +{myWinnings()}
                            </p>
                            <p class="font-bebas tracking-[.2em] text-[#5a5040]">
                                {results()[0]?.uncontested
                                    ? "Everyone folded"
                                    : results()[0]?.handLabel}
                            </p>
                        </Show>
                    </div>
                </div>
                <Show
                    when={myWinnings() > 0 ? gameView()?.handNumber : null}
                    keyed
                >
                    {(_hand) => <Confetti count={50} />}
                </Show>
            </Show>

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
