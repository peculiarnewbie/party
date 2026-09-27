import { TableButton, TablePanel, TableLayout } from "~/components/casino";
import { type PartyLayout } from "~/components/party-layout-controls";
import { PlayerArea } from "./player-area";
import { BlackjackFelt, OUTCOMES } from "./blackjack-felt";
import {
    createEffect,
    createSignal,
    For,
    Show,
    onCleanup,
    createMemo,
    untrack,
} from "solid-js";
import type { Component } from "solid-js";
import type { JSX } from "@solidjs/web";
import type { Card } from "~/assets/card-deck/types";
import {
    AnimatedNumber,
    Chip,
    ChipStack,
    buzz,
    Confetti,
    playSfx,
    SoundToggle,
    TableCard,
} from "~/components/casino";
import { MIN_BET, MAX_BET } from "~/game/blackjack";
import type { BlackjackConnection } from "~/game/blackjack/connection";

interface BlackjackRoomProps {
    roomId: string;
    initialLayout?: PartyLayout;
    playerId: string | null;
    isHost: boolean;
    connection: BlackjackConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const CHIP_VALUES = [10, 25, 50, 100] as const;

export const BlackjackRoom: Component<BlackjackRoomProps> = (props) => {
    const layout = () => props.initialLayout ?? "table";
    const isController = () => layout() === "controller";
    const gameView = () => props.connection.view();
    const [betAmount, setBetAmount] = createSignal(50);
    const [announcement, setAnnouncement] = createSignal<{
        text: string;
        tone: "good" | "bad" | "info";
        key: number;
    } | null>(null);
    let announcementTimer: ReturnType<typeof setTimeout> | undefined;
    let announcementKey = 0;

    const showAnnouncement = (
        text: string,
        tone: "good" | "bad" | "info" = "info",
    ) => {
        clearTimeout(announcementTimer);
        announcementKey += 1;
        setAnnouncement({ text, tone, key: announcementKey });
        announcementTimer = setTimeout(() => setAnnouncement(null), 3200);
    };
    onCleanup(() => clearTimeout(announcementTimer));

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "blackjack:action") {
                const d = event.data as Record<string, any>;
                if (d.type === "player_hit" && d.busted) {
                    const name = playerName(d.playerId);
                    showAnnouncement(`${name} BUSTED!`, "bad");
                }
                if (d.type === "player_doubled") {
                    const name = playerName(d.playerId);
                    showAnnouncement(
                        `${name} DOUBLED DOWN${d.busted ? " AND BUSTED!" : "!"}`,
                        d.busted ? "bad" : "info",
                    );
                }
                if (d.type === "player_split") {
                    const name = playerName(d.playerId);
                    showAnnouncement(`${name} SPLIT!`);
                }
                if (d.type === "insurance_resolved") {
                    showAnnouncement(
                        d.dealerBlackjack
                            ? "DEALER HAS BLACKJACK!"
                            : "NO BLACKJACK - PLAY ON",
                        d.dealerBlackjack ? "bad" : "info",
                    );
                }
            }

            if (event.type === "blackjack:settled") {
                const d = event.data as Record<string, any>;
                const me = d.results?.find(
                    (r: any) => r.playerId === props.playerId,
                );
                if (me && untrack(isController))
                    playSfx(
                        me.netChips > 0
                            ? "win"
                            : me.netChips < 0
                              ? "lose"
                              : "chip",
                        600,
                    );
                if (me) {
                    if (me.netChips > 0) {
                        showAnnouncement(
                            `YOU WON ${me.netChips} CHIPS!`,
                            "good",
                        );
                    } else if (me.netChips < 0) {
                        showAnnouncement(
                            `YOU LOST ${Math.abs(me.netChips)} CHIPS`,
                            "bad",
                        );
                    } else {
                        showAnnouncement("PUSH - CHIPS RETURNED");
                    }
                }
            }
        }),
    );

    const playerName = (id: string) => {
        const view = gameView();
        if (!view) return "Someone";
        return (
            view.players.find((p) => p.id === id)?.name?.toUpperCase() ??
            "SOMEONE"
        );
    };

    const me = createMemo(() => {
        const view = gameView();
        if (!view) return null;
        return view.players.find((p) => p.id === props.playerId) ?? null;
    });

    const myResult = () =>
        gameView()?.results?.find((r) => r.playerId === props.playerId);

    const currentPlayerName = createMemo(() => {
        const view = gameView();
        if (!view) return "";
        const cp = view.players[view.currentPlayerIndex];
        return cp?.name ?? "";
    });

    const maxBet = () => Math.min(MAX_BET, me()?.chips ?? MAX_BET);

    createEffect(
        () => gameView()?.isMyTurn ?? false,
        (mine, previous) => {
            if (!mine || previous) return;
            playSfx("turn");
            buzz([60, 40, 60]);
        },
    );

    createEffect(
        () => ({
            needsBet: gameView()?.needsBet ?? false,
            over: betAmount() > maxBet(),
            max: maxBet(),
        }),
        ({ needsBet, over, max }) => {
            if (needsBet && over) setBetAmount(Math.max(MIN_BET, max));
        },
    );

    const placeBet = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "blackjack:bet",
            data: { amount: betAmount() },
        });
    };
    const hit = () => {
        if (!props.playerId) return;
        props.connection.send({ type: "blackjack:hit", data: {} });
    };
    const stand = () => {
        if (!props.playerId) return;
        props.connection.send({ type: "blackjack:stand", data: {} });
    };
    const doubleDown = () => {
        if (!props.playerId) return;
        props.connection.send({ type: "blackjack:double", data: {} });
    };
    const split = () => {
        if (!props.playerId) return;
        props.connection.send({ type: "blackjack:split", data: {} });
    };
    const acceptInsurance = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "blackjack:insurance",
            data: { accept: true },
        });
    };
    const declineInsurance = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "blackjack:insurance",
            data: { accept: false },
        });
    };

    const bigWin = () =>
        myResult()?.hands.some((hand) => hand.outcome === "blackjack") ||
        (myResult()?.netChips ?? 0) > 0;

    const actionPanel = () => (
        <TablePanel
            active={
                gameView()?.isMyTurn ||
                gameView()?.needsBet ||
                gameView()?.needsInsurance
            }
        >
            <Show when={gameView()?.needsBet}>
                <div class="flex flex-col items-center gap-3">
                    <span class="font-bebas text-sm tracking-[.3em] text-[#5a5040]">
                        PLACE YOUR BET
                    </span>
                    <div class="flex items-center gap-4 min-h-16">
                        <ChipStack
                            amount={betAmount()}
                            size={30}
                            showLabel={false}
                        />
                        <div class="font-bebas text-5xl tracking-wide text-[#1a1a1a] min-w-24 text-center">
                            ${betAmount()}
                        </div>
                    </div>
                    <div class="flex gap-3">
                        <For each={CHIP_VALUES}>
                            {(value) => (
                                <button
                                    type="button"
                                    aria-label={`$${value}`}
                                    disabled={value > maxBet()}
                                    onClick={() =>
                                        setBetAmount((amount) =>
                                            Math.min(maxBet(), amount + value),
                                        )
                                    }
                                    class="rounded-full transition-transform enabled:hover:-translate-y-1 enabled:hover:-rotate-12 enabled:active:scale-90 disabled:opacity-30 drop-shadow-[0_4px_0_#1a1a1a]"
                                >
                                    <Chip
                                        value={value}
                                        size={62}
                                        label={`${value}`}
                                    />
                                </button>
                            )}
                        </For>
                    </div>
                    <div class="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setBetAmount(MIN_BET)}
                            class="min-h-10 border-2 border-[#1a1a1a] bg-[#ddd5c4] px-4 pt-1 font-bebas tracking-[.14em] text-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            onClick={() => setBetAmount(maxBet())}
                            class="min-h-10 border-2 border-[#1a1a1a] bg-[#ddd5c4] px-4 pt-1 font-bebas tracking-[.14em] text-[#1a1a1a] shadow-[2px_2px_0_#1a1a1a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        >
                            Max
                        </button>
                    </div>
                    <TableButton
                        onClick={placeBet}
                        disabled={betAmount() < MIN_BET}
                        class="w-full max-w-xs"
                        tone="tomato"
                    >
                        DEAL
                    </TableButton>
                </div>
            </Show>

            <Show
                when={
                    gameView()?.phase === "betting" &&
                    !gameView()?.needsBet &&
                    me() &&
                    me()!.bet > 0
                }
            >
                <div class="text-center py-2">
                    <span class="font-bebas text-lg tracking-[.2em] text-[#5a5040] animate-pulse-fast">
                        WAITING FOR OTHER BETS...
                    </span>
                </div>
            </Show>

            <Show when={gameView()?.needsInsurance}>
                <div class="flex flex-col items-center gap-3">
                    <span class="font-bebas text-xl tracking-[.16em] text-[#1a1a1a]">
                        DEALER SHOWS ACE - INSURANCE?
                    </span>
                    <span class="font-karla text-sm text-[#5a5040]">
                        Cost: ${Math.floor((me()?.bet ?? 0) / 2)} (half your
                        bet)
                    </span>
                    <div class="grid grid-cols-2 gap-3 w-full max-w-xs">
                        <TableButton onClick={acceptInsurance} tone="navy">
                            YES
                        </TableButton>
                        <TableButton onClick={declineInsurance} tone="paper">
                            NO
                        </TableButton>
                    </div>
                </div>
            </Show>

            <Show
                when={
                    gameView()?.phase === "insurance" &&
                    !gameView()?.needsInsurance &&
                    me()?.insuranceDecided
                }
            >
                <div class="text-center py-2">
                    <span class="font-bebas text-lg tracking-[.2em] text-[#5a5040] animate-pulse-fast">
                        WAITING FOR OTHERS...
                    </span>
                </div>
            </Show>

            <Show when={gameView()?.isMyTurn}>
                <div class="flex flex-col items-center gap-3">
                    <span class="border-2 border-[#1a1a1a] bg-[#c0261a] px-3 pt-1 pb-0.5 font-bebas text-sm tracking-[.25em] text-[#f7f2de] shadow-[2px_2px_0_#1a1a1a] animate-stamp-in">
                        YOUR TURN
                        <Show when={me() && me()!.hands.length > 1}>
                            {" "}
                            - HAND {(me()!.currentHandIndex ?? 0) + 1} OF{" "}
                            {me()!.hands.length}
                        </Show>
                    </span>
                    <div class="grid grid-cols-2 gap-3 w-full">
                        <Show when={gameView()?.canHit}>
                            <TableButton onClick={hit} tone="navy">
                                HIT
                            </TableButton>
                        </Show>
                        <Show when={gameView()?.canStand}>
                            <TableButton onClick={stand} tone="tomato">
                                STAND
                            </TableButton>
                        </Show>
                        <Show when={gameView()?.canDouble}>
                            <TableButton onClick={doubleDown} tone="sun">
                                DOUBLE
                            </TableButton>
                        </Show>
                        <Show when={gameView()?.canSplit}>
                            <TableButton onClick={split} tone="teal">
                                SPLIT
                            </TableButton>
                        </Show>
                    </div>
                </div>
            </Show>

            <Show
                when={gameView()?.phase === "playing" && !gameView()?.isMyTurn}
            >
                <div class="text-center py-2">
                    <span class="font-bebas text-xl tracking-[.2em] text-[#1a1a1a]">
                        {currentPlayerName().toUpperCase()}'S TURN
                    </span>
                </div>
            </Show>

            <Show when={gameView()?.phase === "dealer_turn"}>
                <div class="text-center py-2">
                    <span class="font-bebas text-xl tracking-[.2em] text-[#1a1a1a] animate-pulse-fast">
                        DEALER IS DRAWING...
                    </span>
                </div>
            </Show>

            <Show when={gameView()?.phase === "settled"}>
                <div class="flex flex-col items-center gap-3">
                    <Show when={gameView()?.results}>
                        <div class="flex flex-col gap-1.5 items-stretch w-full max-w-sm">
                            <For
                                each={gameView()!.results!.filter(
                                    (result) =>
                                        !isController() ||
                                        result.playerId === props.playerId,
                                )}
                            >
                                {(result) => (
                                    <div class="flex items-center gap-2 border-2 border-[#1a1a1a] bg-[#f7f2de] px-3 py-2 shadow-[2px_2px_0_#1a1a1a] animate-rise-in">
                                        <span class="font-karla font-semibold text-sm text-[#1a1a1a]">
                                            {result.playerName}:
                                        </span>
                                        <span class="flex gap-1.5 flex-1">
                                            <For each={result.hands}>
                                                {(hand) => (
                                                    <span
                                                        class={`font-bebas text-lg tracking-[.08em] ${OUTCOMES[hand.outcome]?.text ?? ""}`}
                                                    >
                                                        {OUTCOMES[hand.outcome]
                                                            ?.label ?? ""}
                                                    </span>
                                                )}
                                            </For>
                                        </span>
                                        <span
                                            class={`font-bebas text-xl tracking-[.08em] ${
                                                result.netChips >= 0
                                                    ? "text-[#0f766e]"
                                                    : "text-[#c0261a]"
                                            }`}
                                        >
                                            {result.netChips >= 0 ? "+" : ""}
                                            {result.netChips}
                                        </span>
                                    </div>
                                )}
                            </For>
                        </div>
                    </Show>
                    <span class="font-bebas text-sm tracking-[.2em] text-[#5a5040]">
                        NEXT ROUND STARTING SOON...
                    </span>
                    <Show when={props.isHost}>
                        <button
                            type="button"
                            class="min-h-10 border-2 border-[#1a1a1a] bg-[#ddd5c4] px-5 pt-1 font-bebas tracking-[.14em] text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                            onClick={props.onReturnToLobby}
                        >
                            RETURN TO LOBBY
                        </button>
                    </Show>
                </div>
            </Show>
        </TablePanel>
    );

    return (
        <div
            data-testid="blackjack-room"
            data-layout={layout()}
            class="relative h-dvh min-h-0 paper text-[#1a1a1a] font-karla flex flex-col overflow-x-hidden"
        >
            <Show when={gameView()?.isMyTurn}>
                <div class="pointer-events-none fixed inset-0 z-30 border-[6px] border-[#c0261a] animate-pulse-fast" />
            </Show>

            <div class="flex items-center justify-between px-4 py-2 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a]">
                <div class="flex items-center gap-3">
                    <span class="font-bebas text-xl tracking-[.12em] bg-[#0f766e] text-[#f7f2de] border-2 border-[#1a1a1a] px-2.5 pt-1 shadow-[2px_2px_0_#1a1a1a] -rotate-2">
                        BLACKJACK
                    </span>
                    <Show when={gameView()}>
                        <span class="font-bebas text-xs tracking-[.16em] text-[#5a5040] px-2 pt-1 pb-0.5 bg-[#ddd5c4] border border-[#b8ae9e]">
                            ROUND {gameView()!.roundNumber}
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-3">
                    <SoundToggle compact class="!px-1.5 !py-0.5" />
                    <Show when={me()}>
                        <span class="font-bebas text-xl tracking-[.1em] text-[#1a3a6e]">
                            ${me()!.chips}
                        </span>
                    </Show>
                    <Show when={props.isHost}>
                        <button
                            type="button"
                            class="font-bebas text-sm tracking-[.15em] border-2 border-[#1a1a1a] bg-[#ddd5c4] text-[#c0261a] px-2.5 pt-1 pb-0.5 cursor-pointer transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                            onClick={props.onEndGame}
                        >
                            END
                        </button>
                    </Show>
                </div>
            </div>

            <Show when={announcement()} keyed>
                {(item) => (
                    <div class="pointer-events-none fixed inset-x-0 top-24 z-40 flex justify-center px-4">
                        <span
                            class={`border-[3px] border-[#1a1a1a] px-6 pt-2.5 pb-1.5 font-bebas text-2xl tracking-[.12em] shadow-[5px_5px_0_#1a1a1a] animate-stamp-in [--stamp-rot:-2deg] ${item.tone === "good" ? "bg-[#f5c542] text-[#1a1a1a]" : item.tone === "bad" ? "bg-[#c0261a] text-[#f7f2de]" : "bg-[#f7f2de] text-[#1a1a1a]"}`}
                        >
                            {item.text}
                        </span>
                    </div>
                )}
            </Show>

            <Show
                when={isController()}
                fallback={
                    <TableLayout
                        table={
                            <Show when={gameView()}>
                                {(view) => (
                                    <div class="w-full h-full min-w-0">
                                        <BlackjackFelt
                                            fit
                                            view={view()}
                                            heroId={props.playerId}
                                            dealerTestId="blackjack-player-dealer"
                                        />
                                    </div>
                                )}
                            </Show>
                        }
                    >
                        <div class="w-full max-w-xl mx-auto">
                            {actionPanel()}
                        </div>
                    </TableLayout>
                }
            >
                <div class="flex-1 w-full max-w-md mx-auto px-3 pt-3 pb-16 space-y-3">
                    <Show
                        when={gameView() && gameView()!.dealer.cards.length > 0}
                    >
                        <div
                            data-testid="blackjack-controller-dealer"
                            class="table-mat relative overflow-hidden rounded-2xl border-[3px] border-[#1a1a1a] px-4 py-3 flex items-center justify-between gap-3 shadow-[4px_4px_0_#1a1a1a]"
                            style={{ "--mat": "#0f766e" }}
                        >
                            <span class="relative font-bebas tracking-[.25em] text-sm text-[#f7f2de]/80">
                                DEALER
                            </span>
                            <div class="relative flex">
                                <For
                                    each={gameView()!.dealer.cards}
                                    keyed={false}
                                >
                                    {(card, index) => (
                                        <div class={index > 0 ? "-ml-6" : ""}>
                                            <TableCard
                                                card={
                                                    card() === "hidden"
                                                        ? null
                                                        : (card() as Card)
                                                }
                                                class="w-[46px]"
                                            />
                                        </div>
                                    )}
                                </For>
                            </div>
                            <span
                                class={`relative min-w-12 text-center border-2 border-[#1a1a1a] px-3 pt-1 font-bebas text-2xl shadow-[2px_2px_0_#1a1a1a] ${gameView()!.dealer.busted ? "bg-[#c0261a] text-[#f7f2de]" : "bg-[#f7f2de] text-[#1a1a1a]"}`}
                            >
                                {gameView()!.dealer.busted
                                    ? "BUST"
                                    : (gameView()!.dealer.value ??
                                      gameView()!.dealer.upCardValue ??
                                      "")}
                            </span>
                        </div>
                    </Show>

                    <Show when={me() && me()!.hands.length > 0}>
                        <PlayerArea
                            player={me()!}
                            isCurrentTurn={gameView()?.isMyTurn ?? false}
                            results={myResult()}
                        />
                    </Show>

                    <Show when={myResult() && myResult()!.netChips !== 0}>
                        <div class="text-center font-bebas text-5xl leading-none">
                            <span
                                class={`inline-block border-[3px] border-[#1a1a1a] px-4 pt-2 shadow-[5px_5px_0_#1a1a1a] animate-stamp-in ${myResult()!.netChips > 0 ? "bg-[#f5c542] text-[#1a1a1a]" : "bg-[#1a1a1a] text-[#f7f2de]"}`}
                            >
                                {myResult()!.netChips > 0 ? "+" : "−"}$
                                <AnimatedNumber
                                    value={Math.abs(myResult()!.netChips)}
                                />
                            </span>
                        </div>
                    </Show>

                    {actionPanel()}
                </div>
            </Show>

            <Show
                when={
                    isController() &&
                    gameView()?.phase === "settled" &&
                    bigWin()
                        ? gameView()?.roundNumber
                        : null
                }
                keyed
            >
                {(_round) => <Confetti count={50} />}
            </Show>
        </div>
    );
};
