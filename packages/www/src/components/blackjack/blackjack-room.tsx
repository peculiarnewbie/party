import {
    createSignal,
    For,
    Show,
    onCleanup,
    createMemo,
} from "solid-js";
import type { Component } from "solid-js";
import type { Card } from "~/assets/card-deck/types";
import { RANK_LABEL } from "~/assets/card-deck/types";
import { PlayingCard } from "~/assets/card-deck/playing-card";
import { CardBack } from "~/assets/card-deck/card-back";
import type {
    PlayerHandView,
    PlayerInfoView,
} from "~/game/blackjack";
import { MIN_BET, MAX_BET } from "~/game/blackjack";
import type { BlackjackConnection } from "~/game/blackjack/connection";

interface BlackjackRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: BlackjackConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export const BlackjackRoom: Component<BlackjackRoomProps> = (props) => {
    const gameView = () => props.connection.view();
    const [betAmount, setBetAmount] = createSignal(50);
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [announcementKey, setAnnouncementKey] = createSignal(0);

    const showAnnouncement = (text: string) => {
        setAnnouncement(null);
        setAnnouncementKey((k) => k + 1);
        setTimeout(() => {
            setAnnouncement(text);
        }, 30);
    };

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "blackjack:action") {
                const d = event.data as Record<string, any>;
                if (d.type === "player_hit" && d.busted) {
                    const name = playerName(d.playerId);
                    showAnnouncement(`${name} BUSTED!`);
                }
                if (d.type === "player_doubled") {
                    const name = playerName(d.playerId);
                    showAnnouncement(
                        `${name} DOUBLED DOWN${d.busted ? " AND BUSTED!" : "!"}`,
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
                    );
                }
            }

            if (event.type === "blackjack:settled") {
                const d = event.data as Record<string, any>;
                const me = d.results?.find(
                    (r: any) => r.playerId === props.playerId,
                );
                if (me) {
                    if (me.netChips > 0) {
                        showAnnouncement(`YOU WON ${me.netChips} CHIPS!`);
                    } else if (me.netChips < 0) {
                        showAnnouncement(
                            `YOU LOST ${Math.abs(me.netChips)} CHIPS`,
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

    const others = createMemo(() => {
        const view = gameView();
        if (!view) return [];
        return view.players.filter((p) => p.id !== props.playerId);
    });

    const currentPlayerName = createMemo(() => {
        const view = gameView();
        if (!view) return "";
        const cp = view.players[view.currentPlayerIndex];
        return cp?.name ?? "";
    });

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

    function handValueLabel(hand: PlayerHandView): string {
        if (hand.isBlackjack) return "BJ";
        if (hand.busted) return "BUST";
        const prefix = hand.soft ? "Soft " : "";
        return `${prefix}${hand.value}`;
    }

    function outcomeLabel(outcome: string): string {
        switch (outcome) {
            case "blackjack":
                return "BLACKJACK!";
            case "win":
                return "WIN";
            case "push":
                return "PUSH";
            case "lose":
                return "LOSE";
            case "bust":
                return "BUST";
            default:
                return "";
        }
    }

    function outcomeColor(outcome: string): string {
        switch (outcome) {
            case "blackjack":
            case "win":
                return "text-[#2d8a4e]";
            case "push":
                return "text-[#b8860b]";
            case "lose":
            case "bust":
                return "text-[#c0261a]";
            default:
                return "text-[#1a1a1a]";
        }
    }

    return (
        <div class="min-h-screen bg-[#1a5c2e] font-karla flex flex-col">
            {/* Top bar */}
            <div class="flex items-center justify-between px-4 py-2 bg-[#0d3d1a] border-b-[3px] border-[#0a2e13]">
                <div class="flex items-center gap-3">
                    <span class="font-bebas text-[1.1rem] tracking-[.12em] text-[#ddd5c4]">
                        BLACKJACK
                    </span>
                    <Show when={gameView()}>
                        <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#7ab889]">
                            ROUND {gameView()!.roundNumber}
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-3">
                    <Show when={me()}>
                        <span class="font-bebas text-[.8rem] tracking-[.1em] text-[#ddd5c4]">
                            ${me()!.chips}
                        </span>
                    </Show>
                    <Show when={props.isHost}>
                        <button
                            class="font-bebas text-[.7rem] tracking-[.15em] text-[#c0261a] border border-[#c0261a]/40 px-2 py-0.5 hover:bg-[#c0261a]/10 transition-colors"
                            onClick={props.onEndGame}
                        >
                            END
                        </button>
                    </Show>
                </div>
            </div>

            {/* Dealer area */}
            <div class="flex flex-col items-center pt-4 pb-2">
                <div class="font-bebas text-[.65rem] tracking-[.25em] text-[#7ab889] mb-2">
                    DEALER
                </div>
                <div class="flex gap-1 items-end mb-1">
                    <Show when={gameView()?.dealer.cards.length}>
                        <For each={gameView()?.dealer.cards ?? []}>
                            {(card) => (
                                <div class="transition-all duration-300">
                                    <Show
                                        when={card !== "hidden"}
                                        fallback={<CardBack size={70} />}
                                    >
                                        <PlayingCard
                                            suit={
                                                (card as Card).suit
                                            }
                                            rank={
                                                (card as Card).rank
                                            }
                                            size={70}
                                        />
                                    </Show>
                                </div>
                            )}
                        </For>
                    </Show>
                </div>
                <Show when={gameView()?.dealer.value !== null && gameView()?.dealer.value !== undefined}>
                    <span
                        class={`font-bebas text-[1rem] tracking-[.08em] ${
                            gameView()?.dealer.busted
                                ? "text-[#c0261a]"
                                : "text-[#ddd5c4]"
                        }`}
                    >
                        {gameView()?.dealer.busted
                            ? "BUST"
                            : gameView()?.dealer.value}
                    </span>
                </Show>
                <Show when={gameView()?.dealer.value === null && gameView()?.dealer.upCardValue}>
                    <span class="font-bebas text-[.85rem] tracking-[.08em] text-[#7ab889]">
                        {gameView()!.dealer.upCardValue}
                    </span>
                </Show>
            </div>

            {/* Announcement */}
            <Show when={announcement()}>
                <div
                    class="text-center py-2 px-4 animate-fade-in"
                    style={{ "--fade-key": announcementKey() } as any}
                >
                    <span class="font-bebas text-[1.4rem] tracking-[.12em] text-[#ddd5c4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {announcement()}
                    </span>
                </div>
            </Show>

            {/* Other players */}
            <Show when={others().length > 0}>
                <div class="px-4 py-2">
                    <div class="flex flex-wrap gap-3 justify-center">
                        <For each={others()}>
                            {(player) => (
                                <PlayerArea
                                    player={player}
                                    isCurrentTurn={
                                        gameView()?.phase === "playing" &&
                                        gameView()?.players[
                                            gameView()!.currentPlayerIndex
                                        ]?.id === player.id
                                    }
                                    results={gameView()?.results?.find(
                                        (r) =>
                                            r.playerId === player.id,
                                    )}
                                    compact
                                />
                            )}
                        </For>
                    </div>
                </div>
            </Show>

            {/* Spacer */}
            <div class="flex-1" />

            {/* My hands */}
            <Show when={me() && me()!.hands.length > 0}>
                <div class="px-4 pb-2">
                    <PlayerArea
                        player={me()!}
                        isCurrentTurn={gameView()?.isMyTurn ?? false}
                        results={gameView()?.results?.find(
                            (r) => r.playerId === props.playerId,
                        )}
                        compact={false}
                    />
                </div>
            </Show>

            {/* Action controls */}
            <div class="px-4 py-3 bg-[#0d3d1a]/60 border-t border-[#7ab889]/20">
                {/* Betting phase */}
                <Show when={gameView()?.needsBet}>
                    <div class="flex flex-col items-center gap-3">
                        <span class="font-bebas text-[.7rem] tracking-[.25em] text-[#7ab889]">
                            PLACE YOUR BET
                        </span>
                        <div class="flex items-center gap-3">
                            <button
                                class="font-bebas text-[1rem] w-8 h-8 bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                onClick={() =>
                                    setBetAmount((a) =>
                                        Math.max(MIN_BET, a - 10),
                                    )
                                }
                            >
                                -
                            </button>
                            <div class="font-bebas text-[1.8rem] tracking-[.08em] text-[#ddd5c4] min-w-[80px] text-center">
                                ${betAmount()}
                            </div>
                            <button
                                class="font-bebas text-[1rem] w-8 h-8 bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] shadow-[2px_2px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                onClick={() =>
                                    setBetAmount((a) =>
                                        Math.min(
                                            MAX_BET,
                                            me()?.chips ?? MAX_BET,
                                            a + 10,
                                        ),
                                    )
                                }
                            >
                                +
                            </button>
                        </div>
                        <div class="flex gap-2">
                            <For each={[10, 25, 50, 100]}>
                                {(preset) => (
                                    <button
                                        class={`font-bebas text-[.85rem] tracking-[.1em] px-3 py-1 border-2 border-[#1a1a1a] shadow-[2px_2px_0_#0a2e13] transition-all active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                                            betAmount() === preset
                                                ? "bg-[#ddd5c4] text-[#1a1a1a]"
                                                : "bg-transparent text-[#ddd5c4] border-[#7ab889]/40"
                                        }`}
                                        onClick={() => {
                                            const max = Math.min(
                                                MAX_BET,
                                                me()?.chips ?? MAX_BET,
                                            );
                                            setBetAmount(
                                                Math.min(preset, max),
                                            );
                                        }}
                                    >
                                        ${preset}
                                    </button>
                                )}
                            </For>
                        </div>
                        <button
                            class="font-bebas text-[1.1rem] tracking-[.12em] bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] px-8 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                            onClick={placeBet}
                        >
                            DEAL
                        </button>
                    </div>
                </Show>

                {/* Waiting for bets */}
                <Show
                    when={
                        gameView()?.phase === "betting" &&
                        !gameView()?.needsBet &&
                        me() &&
                        me()!.bet > 0
                    }
                >
                    <div class="text-center">
                        <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#7ab889]">
                            WAITING FOR OTHER BETS...
                        </span>
                    </div>
                </Show>

                {/* Insurance prompt */}
                <Show when={gameView()?.needsInsurance}>
                    <div class="flex flex-col items-center gap-3">
                        <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#ddd5c4]">
                            DEALER SHOWS ACE - INSURANCE?
                        </span>
                        <span class="font-karla text-[.75rem] text-[#7ab889]">
                            Cost: ${Math.floor((me()?.bet ?? 0) / 2)}{" "}
                            (half your bet)
                        </span>
                        <div class="flex gap-3">
                            <button
                                class="font-bebas text-[1rem] tracking-[.12em] bg-[#2d8a4e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13]"
                                onClick={acceptInsurance}
                            >
                                YES
                            </button>
                            <button
                                class="font-bebas text-[1rem] tracking-[.12em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-6 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13]"
                                onClick={declineInsurance}
                            >
                                NO
                            </button>
                        </div>
                    </div>
                </Show>

                {/* Waiting for insurance */}
                <Show
                    when={
                        gameView()?.phase === "insurance" &&
                        !gameView()?.needsInsurance &&
                        me()?.insuranceDecided
                    }
                >
                    <div class="text-center">
                        <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#7ab889]">
                            WAITING FOR OTHERS...
                        </span>
                    </div>
                </Show>

                {/* Playing actions */}
                <Show when={gameView()?.isMyTurn}>
                    <div class="flex flex-col items-center gap-2">
                        <span class="font-bebas text-[.7rem] tracking-[.25em] text-[#ddd5c4]">
                            YOUR TURN
                            <Show when={me() && me()!.hands.length > 1}>
                                {" "}
                                - HAND {(me()!.currentHandIndex ?? 0) + 1} OF{" "}
                                {me()!.hands.length}
                            </Show>
                        </span>
                        <div class="flex gap-2 flex-wrap justify-center">
                            <Show when={gameView()?.canHit}>
                                <button
                                    class="font-bebas text-[1.05rem] tracking-[.12em] bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] px-5 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                    onClick={hit}
                                >
                                    HIT
                                </button>
                            </Show>
                            <Show when={gameView()?.canStand}>
                                <button
                                    class="font-bebas text-[1.05rem] tracking-[.12em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                    onClick={stand}
                                >
                                    STAND
                                </button>
                            </Show>
                            <Show when={gameView()?.canDouble}>
                                <button
                                    class="font-bebas text-[1.05rem] tracking-[.12em] bg-[#b8860b] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                    onClick={doubleDown}
                                >
                                    DOUBLE
                                </button>
                            </Show>
                            <Show when={gameView()?.canSplit}>
                                <button
                                    class="font-bebas text-[1.05rem] tracking-[.12em] bg-[#7b2d8a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-2 shadow-[3px_3px_0_#0a2e13] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#0a2e13] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                    onClick={split}
                                >
                                    SPLIT
                                </button>
                            </Show>
                        </div>
                    </div>
                </Show>

                {/* Waiting for other player */}
                <Show
                    when={
                        gameView()?.phase === "playing" &&
                        !gameView()?.isMyTurn
                    }
                >
                    <div class="text-center">
                        <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#7ab889]">
                            {currentPlayerName().toUpperCase()}'S TURN
                        </span>
                    </div>
                </Show>

                {/* Settled */}
                <Show when={gameView()?.phase === "settled"}>
                    <div class="flex flex-col items-center gap-3">
                        <Show when={gameView()?.results}>
                            <div class="flex flex-col gap-1 items-center">
                                <For each={gameView()!.results!}>
                                    {(result) => (
                                        <div class="flex items-center gap-2">
                                            <span class="font-karla text-[.8rem] text-[#ddd5c4]">
                                                {result.playerName}:
                                            </span>
                                            <For each={result.hands}>
                                                {(hand) => (
                                                    <span
                                                        class={`font-bebas text-[.85rem] tracking-[.08em] ${outcomeColor(hand.outcome)}`}
                                                    >
                                                        {outcomeLabel(
                                                            hand.outcome,
                                                        )}
                                                    </span>
                                                )}
                                            </For>
                                            <span
                                                class={`font-bebas text-[.85rem] tracking-[.08em] ${
                                                    result.netChips >= 0
                                                        ? "text-[#2d8a4e]"
                                                        : "text-[#c0261a]"
                                                }`}
                                            >
                                                {result.netChips >= 0
                                                    ? "+"
                                                    : ""}
                                                {result.netChips}
                                            </span>
                                        </div>
                                    )}
                                </For>
                            </div>
                        </Show>
                        <span class="font-bebas text-[.65rem] tracking-[.2em] text-[#7ab889]">
                            NEXT ROUND STARTING SOON...
                        </span>
                        <Show when={props.isHost}>
                            <button
                                class="font-bebas text-[.85rem] tracking-[.12em] text-[#ddd5c4] border border-[#7ab889]/40 px-4 py-1 hover:bg-[#7ab889]/10 transition-colors"
                                onClick={props.onReturnToLobby}
                            >
                                RETURN TO LOBBY
                            </button>
                        </Show>
                    </div>
                </Show>

                {/* Shoe info */}
                <Show when={gameView()}>
                    <div class="text-center mt-2">
                        <span class="font-bebas text-[.55rem] tracking-[.2em] text-[#7ab889]/50">
                            SHOE: {gameView()!.shoeCount} CARDS
                        </span>
                    </div>
                </Show>
            </div>
        </div>
    );
};

function PlayerArea(props: {
    player: PlayerInfoView;
    isCurrentTurn: boolean;
    results?: { hands: { outcome: string; payout: number }[] } | null;
    compact: boolean;
}) {
    const cardSize = () => (props.compact ? 48 : 64);

    return (
        <div
            class={`rounded px-3 py-2 transition-all ${
                props.isCurrentTurn
                    ? "bg-[#2d8a4e]/30 ring-1 ring-[#7ab889]"
                    : "bg-[#0d3d1a]/30"
            }`}
        >
            <div class="flex items-center justify-between mb-1">
                <span
                    class={`font-bebas text-[.7rem] tracking-[.15em] ${
                        props.isCurrentTurn
                            ? "text-[#ddd5c4]"
                            : "text-[#7ab889]"
                    }`}
                >
                    {props.player.name.toUpperCase()}
                </span>
                <span class="font-bebas text-[.65rem] tracking-[.1em] text-[#7ab889]/70">
                    ${props.player.chips}
                </span>
            </div>

            <For each={props.player.hands}>
                {(hand, handIdx) => (
                    <div class="mb-1">
                        <Show when={props.player.hands.length > 1}>
                            <div class="font-bebas text-[.5rem] tracking-[.2em] text-[#7ab889]/50 mb-0.5">
                                HAND {handIdx() + 1}
                                <Show
                                    when={
                                        props.isCurrentTurn &&
                                        handIdx() ===
                                            props.player.currentHandIndex
                                    }
                                >
                                    {" "}
                                    <span class="text-[#ddd5c4]">
                                        (ACTIVE)
                                    </span>
                                </Show>
                            </div>
                        </Show>
                        <div class="flex gap-0.5 items-end">
                            <For each={hand.cards}>
                                {(card) => (
                                    <PlayingCard
                                        suit={card.suit}
                                        rank={card.rank}
                                        size={cardSize()}
                                    />
                                )}
                            </For>
                        </div>
                        <div class="flex items-center gap-2 mt-0.5">
                            <span
                                class={`font-bebas text-[.75rem] tracking-[.08em] ${
                                    hand.busted
                                        ? "text-[#c0261a]"
                                        : hand.isBlackjack
                                          ? "text-[#b8860b]"
                                          : "text-[#ddd5c4]"
                                }`}
                            >
                                {handValueLabel(hand)}
                            </span>
                            <Show when={hand.bet > 0}>
                                <span class="font-bebas text-[.6rem] tracking-[.1em] text-[#7ab889]/70">
                                    ${hand.bet}
                                    {hand.doubled ? " (2x)" : ""}
                                </span>
                            </Show>
                            <Show
                                when={
                                    props.results?.hands[handIdx()]
                                }
                            >
                                <span
                                    class={`font-bebas text-[.7rem] tracking-[.1em] ${outcomeColor(props.results!.hands[handIdx()]!.outcome)}`}
                                >
                                    {outcomeLabel(
                                        props.results!.hands[handIdx()]!
                                            .outcome,
                                    )}
                                </span>
                            </Show>
                        </div>
                    </div>
                )}
            </For>

            <Show when={props.player.insuranceBet > 0}>
                <div class="font-bebas text-[.55rem] tracking-[.15em] text-[#b8860b] mt-1">
                    INSURED: ${props.player.insuranceBet}
                </div>
            </Show>
        </div>
    );
}

function handValueLabel(hand: PlayerHandView): string {
    if (hand.isBlackjack) return "BJ";
    if (hand.busted) return "BUST";
    const prefix = hand.soft ? "Soft " : "";
    return `${prefix}${hand.value}`;
}

function outcomeLabel(outcome: string): string {
    switch (outcome) {
        case "blackjack":
            return "BLACKJACK!";
        case "win":
            return "WIN";
        case "push":
            return "PUSH";
        case "lose":
            return "LOSE";
        case "bust":
            return "BUST";
        default:
            return "";
    }
}

function outcomeColor(outcome: string): string {
    switch (outcome) {
        case "blackjack":
        case "win":
            return "text-[#2d8a4e]";
        case "push":
            return "text-[#b8860b]";
        case "lose":
        case "bust":
            return "text-[#c0261a]";
        default:
            return "text-[#1a1a1a]";
    }
}
