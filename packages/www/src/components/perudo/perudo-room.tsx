import {
    createSignal,
    createEffect,
    createMemo,
    For,
    Show,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import { SvgDice } from "~/assets/svg-dice";
import type {
    PerudoPlayerView,
    PerudoPlayerInfo,
    Bid,
    ChallengeResult,
} from "~/game/perudo";

interface PerudoRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    ws: WebSocket;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const FACE_LABELS: Record<number, string> = {
    1: "A",
    2: "2",
    3: "3",
    4: "4",
    5: "5",
    6: "6",
};

export const PerudoRoom: Component<PerudoRoomProps> = (props) => {
    const [gameView, setGameView] = createSignal<PerudoPlayerView | null>(null);
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [announcementKey, setAnnouncementKey] = createSignal(0);
    const [selectedQuantity, setSelectedQuantity] = createSignal<number>(1);
    const [selectedFace, setSelectedFace] = createSignal<number>(1);

    const showAnnouncement = (text: string) => {
        setAnnouncement(null);
        setAnnouncementKey((k) => k + 1);
        setTimeout(() => {
            setAnnouncement(text);
        }, 30);
    };

    const playerName = (id: string) => {
        const view = gameView();
        if (!view) return "SOMEONE";
        return (
            view.players.find((p) => p.id === id)?.name?.toUpperCase() ??
            "SOMEONE"
        );
    };

    const handleMessage = (e: MessageEvent) => {
        let data: any;
        try {
            data = JSON.parse(e.data);
        } catch {
            return;
        }

        if (data.type === "perudo:state") {
            setGameView(data.data as PerudoPlayerView);
        }

        if (data.type === "perudo:action") {
            const d = data.data;
            if (d.type === "round_started") {
                showAnnouncement(
                    `ROUND ${d.roundNumber}${d.palificoRound ? " — PALIFICO" : ""}`,
                );
            }
            if (d.type === "bid_placed") {
                const bv =
                    FACE_LABELS[d.bid.faceValue] ?? String(d.bid.faceValue);
                showAnnouncement(
                    `${playerName(d.bid.playerId)}: ${d.bid.quantity}x${bv}`,
                );
            }
            if (d.type === "challenge_made") {
                showAnnouncement(
                    `${playerName(d.challengerId)} CALLS A CHALLENGE!`,
                );
            }
            if (d.type === "player_eliminated") {
                const bv =
                    FACE_LABELS[d.bid.faceValue] ?? String(d.bid.faceValue);
                if (d.wasCorrect) {
                    showAnnouncement(
                        `CORRECT! ${playerName(d.challengerId)} LOSES A DIE`,
                    );
                } else {
                    showAnnouncement(
                        `WRONG! ${playerName(d.bidderId)} LOSES A DIE`,
                    );
                }
            }
        }

        if (data.type === "perudo:game_over") {
            const winners = data.data.winners as string[];
            const names = winners.map((id: string) => playerName(id));
            if (winners.length === 1) {
                showAnnouncement(`${names[0]} WINS!`);
            } else {
                showAnnouncement(`TIE: ${names.join(" & ")}`);
            }
        }
    };

    createEffect(() => {
        props.ws.addEventListener("message", handleMessage);
        onCleanup(() => props.ws.removeEventListener("message", handleMessage));
    });

    createEffect(() => {
        const view = gameView();
        if (!view) return;
        setSelectedQuantity(view.nextHigherBid?.quantity ?? 1);
        setSelectedFace(view.nextHigherBid?.faceValue ?? 1);
    });

    const me = createMemo(() => {
        const view = gameView();
        if (!view) return null;
        return view.players.find((p) => p.id === props.playerId) ?? null;
    });

    const currentPlayerName = createMemo(() => {
        const view = gameView();
        if (!view) return "";
        const cp = view.players.find((p) => p.id === view.currentPlayerId);
        return cp?.name ?? "";
    });

    const sendMsg = (type: string, data: Record<string, unknown> = {}) => {
        if (!props.playerId) return;
        props.ws.send(
            JSON.stringify({
                type,
                playerId: props.playerId,
                playerName: "",
                data,
            }),
        );
    };

    const placeBid = () => {
        sendMsg("perudo:bid", {
            quantity: selectedQuantity(),
            faceValue: selectedFace(),
        });
    };

    const challenge = () => {
        sendMsg("perudo:challenge", {});
    };

    const startRound = () => {
        sendMsg("perudo:start_round", {});
    };

    const myDice = createMemo(() => {
        const view = gameView();
        if (!view) return [];
        const myInfo = view.players.find((p) => p.id === props.playerId);
        return myInfo?.dice ?? [];
    });

    const otherPlayers = createMemo(() => {
        const view = gameView();
        if (!view) return [];
        return view.players.filter(
            (p) => p.id !== props.playerId && !p.eliminated,
        );
    });

    const lastBid = createMemo<Bid | null>(() => {
        const view = gameView();
        return view?.currentBid ?? null;
    });

    const isMyTurnToBid = () => {
        const view = gameView();
        return (
            view?.isMyTurn &&
            (view?.phase === "round_start" || view?.phase === "bidding")
        );
    };

    const canChallenge = () => {
        const view = gameView();
        return view?.canChallenge ?? false;
    };

    const diceColor = (isHeld: boolean) => {
        return isHeld ? "#d4a017" : "#1a3a2a";
    };

    const diceDotColor = () => "#f5e6c8";

    return (
        <div class="min-h-screen bg-[#0d2818] font-karla flex flex-col">
            <div class="flex items-center justify-between px-4 py-3 bg-[#0a1f14] border-b-2 border-[#d4a017]/40">
                <div class="flex items-center gap-3">
                    <span class="font-bebas text-[1.1rem] tracking-[.12em] text-[#d4a017]">
                        PERUDO
                    </span>
                    <Show when={gameView()}>
                        <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#f5e6c8]/60">
                            ROUND {gameView()!.roundNumber}
                        </span>
                    </Show>
                    <Show when={gameView()?.palificoRound}>
                        <span class="font-bebas text-[.65rem] tracking-[.2em] text-[#c0261a] border border-[#c0261a]/40 px-2 py-0.5">
                            PALIFICO
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-3">
                    <Show when={gameView()}>
                        <span class="font-bebas text-[.75rem] tracking-[.1em] text-[#f5e6c8]/60">
                            {gameView()!.totalDiceInPlay} DICE IN PLAY
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

            <Show when={announcement()}>
                <div
                    class="text-center py-2 px-4 animate-fade-in"
                    style={{ "--fade-key": announcementKey() } as any}
                >
                    <span class="font-bebas text-[1.4rem] tracking-[.12em] text-[#d4a017] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {announcement()}
                    </span>
                </div>
            </Show>

            <div class="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">
                <Show
                    when={
                        gameView()?.phase === "revealing" ||
                        gameView()?.lastChallengeResult
                    }
                >
                    <ChallengeReveal
                        result={gameView()!.lastChallengeResult!}
                        players={gameView()!.players}
                        myId={props.playerId ?? ""}
                        playerName={playerName}
                    />
                </Show>

                <Show when={gameView()?.phase === "game_over"}>
                    <GameOverScreen
                        view={gameView()!}
                        playerName={playerName}
                        onReturnToLobby={props.onReturnToLobby}
                        isHost={props.isHost}
                    />
                </Show>

                <Show when={gameView()?.phase !== "game_over"}>
                    <div class="space-y-3">
                        <For each={otherPlayers()}>
                            {(player) => (
                                <PlayerCard
                                    player={player}
                                    isCurrentPlayer={player.isCurrentPlayer}
                                />
                            )}
                        </For>
                    </div>

                    <Show when={lastBid()}>
                        <CurrentBidDisplay
                            bid={lastBid()!}
                            playerName={playerName}
                            palificoRound={gameView()?.palificoRound ?? false}
                        />
                    </Show>

                    <Show
                        when={
                            gameView()?.phase === "round_start" &&
                            gameView()?.isMyTurn
                        }
                    >
                        <div class="flex flex-col items-center gap-3 py-4">
                            <span class="font-bebas text-[.85rem] tracking-[.18em] text-[#f5e6c8]/80">
                                YOUR TURN TO OPEN BIDDING
                            </span>
                            <button
                                class="font-bebas text-[1.1rem] tracking-[.14em] bg-[#d4a017] text-[#0d2818] border-2 border-[#0d2818] px-8 py-2 shadow-[3px_3px_0_#1a3a2a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a3a2a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                onClick={startRound}
                            >
                                OPEN BIDDING
                            </button>
                        </div>
                    </Show>

                    <Show
                        when={
                            gameView()?.phase === "bidding" &&
                            !gameView()?.isMyTurn &&
                            !canChallenge()
                        }
                    >
                        <div class="text-center py-3">
                            <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#f5e6c8]/60">
                                {currentPlayerName().toUpperCase()}'S TURN TO
                                BID
                            </span>
                        </div>
                    </Show>

                    <Show
                        when={gameView()?.phase === "bidding" && canChallenge()}
                    >
                        <div class="flex flex-col items-center gap-3 py-4 border-t border-[#d4a017]/20">
                            <span class="font-bebas text-[.75rem] tracking-[.2em] text-[#f5e6c8]/80">
                                PLACE YOUR BID
                            </span>
                            <div class="flex items-center gap-4 flex-wrap justify-center">
                                <div class="flex items-center gap-2">
                                    <span class="font-bebas text-[.75rem] tracking-[.1em] text-[#f5e6c8]/60">
                                        QTY
                                    </span>
                                    <select
                                        class="bg-[#1a3a2a] text-[#f5e6c8] border border-[#d4a017]/40 px-3 py-1.5 font-bebas text-[.9rem] tracking-wider"
                                        value={selectedQuantity()}
                                        onChange={(e) =>
                                            setSelectedQuantity(
                                                parseInt(e.currentTarget.value),
                                            )
                                        }
                                    >
                                        <For
                                            each={Array.from(
                                                {
                                                    length: gameView()!
                                                        .totalDiceInPlay,
                                                },
                                                (_, i) => i + 1,
                                            )}
                                        >
                                            {(n) => (
                                                <option value={n}>{n}</option>
                                            )}
                                        </For>
                                    </select>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="font-bebas text-[.75rem] tracking-[.1em] text-[#f5e6c8]/60">
                                        FACE
                                    </span>
                                    <div class="flex gap-1">
                                        <For each={[1, 2, 3, 4, 5, 6]}>
                                            {(f) => (
                                                <button
                                                    class={`w-9 h-9 rounded flex items-center justify-center font-bebas text-[.85rem] transition-all ${
                                                        selectedFace() === f
                                                            ? "bg-[#d4a017] text-[#0d2818]"
                                                            : "bg-[#1a3a2a] text-[#f5e6c8]/80 hover:bg-[#2a4a3a]"
                                                    }`}
                                                    onClick={() =>
                                                        setSelectedFace(f)
                                                    }
                                                >
                                                    {FACE_LABELS[f]}
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </div>
                            <div class="flex gap-3 mt-2">
                                <button
                                    class="font-bebas text-[.9rem] tracking-[.14em] bg-[#d4a017] text-[#0d2818] border-2 border-[#0d2818] px-6 py-1.5 shadow-[2px_2px_0_#1a3a2a] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a3a2a] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                    onClick={placeBid}
                                >
                                    BID
                                </button>
                                <button
                                    class="font-bebas text-[.9rem] tracking-[.14em] text-[#c0261a] border-2 border-[#c0261a]/60 px-6 py-1.5 hover:bg-[#c0261a]/10 transition-colors"
                                    onClick={challenge}
                                >
                                    CHALLENGE
                                </button>
                            </div>
                        </div>
                    </Show>
                </Show>
            </div>

            <div class="px-4 py-4 bg-[#0a1f14] border-t border-[#d4a017]/20">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-bebas text-[.7rem] tracking-[.15em] text-[#d4a017]">
                        YOUR DICE
                    </span>
                    <Show when={me()}>
                        <span class="font-bebas text-[.65rem] tracking-[.1em] text-[#f5e6c8]/40">
                            {me()!.diceCount}{" "}
                            {me()!.diceCount === 1 ? "DIE" : "DICE"}
                        </span>
                    </Show>
                </div>
                <div class="flex gap-2 justify-center">
                    <For each={Array(me()?.diceCount ?? 0)}>
                        {(_, i) => {
                            const die = () => myDice()[i()] ?? 1;
                            return (
                                <SvgDice
                                    side={die() as 1 | 2 | 3 | 4 | 5 | 6}
                                    color="#1a3a2a"
                                    dotColor="#d4a017"
                                    size={52}
                                />
                            );
                        }}
                    </For>
                    <Show when={(me()?.diceCount ?? 0) === 0}>
                        <span class="font-bebas text-[.8rem] tracking-[.15em] text-[#f5e6c8]/30 py-3">
                            ELIMINATED
                        </span>
                    </Show>
                </div>
            </div>
        </div>
    );
};

function PlayerCard(props: {
    player: PerudoPlayerInfo;
    isCurrentPlayer: boolean;
}) {
    return (
        <div
            class={`flex items-center justify-between px-4 py-3 rounded-lg border-2 transition-all ${
                props.isCurrentPlayer
                    ? "bg-[#1a3a2a] border-[#d4a017]"
                    : "bg-[#0d2818] border-[#d4a017]/20"
            }`}
        >
            <div class="flex items-center gap-3">
                <div class="relative">
                    <div class="w-10 h-10 rounded-full bg-[#0a1f14] border-2 border-[#d4a017]/40 flex items-center justify-center">
                        <span class="font-bebas text-[1rem] text-[#d4a017]">
                            {props.player.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <Show when={props.isCurrentPlayer}>
                        <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#d4a017]" />
                    </Show>
                </div>
                <div>
                    <div class="font-karla text-[.9rem] text-[#f5e6c8]">
                        {props.player.name}
                    </div>
                    <div class="font-bebas text-[.65rem] tracking-[.12em] text-[#f5e6c8]/50">
                        {props.player.isStartingPlayer ? "STARTS" : ""}
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div class="flex gap-1">
                    <For each={Array(props.player.diceCount)}>
                        {() => (
                            <div class="w-5 h-5 rounded-sm bg-[#d4a017]/20 border border-[#d4a017]/30" />
                        )}
                    </For>
                </div>
                <span class="font-bebas text-[.8rem] text-[#d4a017]">
                    {props.player.diceCount}
                </span>
            </div>
        </div>
    );
}

function CurrentBidDisplay(props: {
    bid: Bid;
    playerName: (id: string) => string;
    palificoRound: boolean;
}) {
    return (
        <div class="bg-[#0a1f14] border-2 border-[#d4a017]/40 px-5 py-3 rounded-lg text-center">
            <div class="font-bebas text-[.65rem] tracking-[.2em] text-[#f5e6c8]/50 mb-1">
                CURRENT BID
            </div>
            <div class="font-bebas text-[1.3rem] tracking-[.08em] text-[#d4a017]">
                {props.bid.quantity}x
                {FACE_LABELS[props.bid.faceValue] ?? props.bid.faceValue}
            </div>
            <div class="font-bebas text-[.65rem] tracking-[.12em] text-[#f5e6c8]/40 mt-1">
                {props.playerName(props.bid.playerId)}
            </div>
            <Show when={props.palificoRound}>
                <div class="font-bebas text-[.55rem] tracking-[.15em] text-[#c0261a] mt-1">
                    1s ARE NOT WILD
                </div>
            </Show>
        </div>
    );
}

function ChallengeReveal(props: {
    result: ChallengeResult;
    players: PerudoPlayerInfo[];
    myId: string;
    playerName: (id: string) => string;
}) {
    const actualCount = () => {
        return props.result.actualCount;
    };

    const bv =
        FACE_LABELS[props.result.bid.faceValue] ??
        String(props.result.bid.faceValue);

    return (
        <div class="bg-[#0a1f14] border-2 border-[#d4a017]/40 rounded-lg px-4 py-4">
            <div class="text-center mb-4">
                <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#c0261a] mb-1">
                    CHALLENGE RESULT
                </div>
                <div class="font-bebas text-[1.1rem] tracking-[.08em] text-[#d4a017]">
                    {actualCount()} {FACE_LABELS[props.result.bid.faceValue]}s
                    FOUND
                </div>
                <div class="font-bebas text-[.8rem] tracking-[.1em] text-[#f5e6c8]/60 mt-1">
                    BID WAS {props.result.bid.quantity}x{bv} —{" "}
                    {props.result.wasCorrect ? "CORRECT" : "WRONG"}
                </div>
            </div>

            <div class="space-y-2">
                <For each={props.players.filter((p) => !p.eliminated)}>
                    {(player) => (
                        <div class="flex items-center justify-between">
                            <span class="font-karla text-[.85rem] text-[#f5e6c8]">
                                {player.name}
                            </span>
                            <div class="flex gap-1">
                                <Show
                                    when={player.dice}
                                    fallback={
                                        <span class="text-[#f5e6c8]/30 text-[.7rem]">
                                            —
                                        </span>
                                    }
                                >
                                    <For each={player.dice ?? []}>
                                        {(die) => (
                                            <SvgDice
                                                side={
                                                    die as 1 | 2 | 3 | 4 | 5 | 6
                                                }
                                                color="#1a3a2a"
                                                dotColor="#d4a017"
                                                size={28}
                                            />
                                        )}
                                    </For>
                                </Show>
                            </div>
                        </div>
                    )}
                </For>
            </div>

            <div class="text-center mt-3 pt-3 border-t border-[#d4a017]/20">
                <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#c0261a]">
                    {props.playerName(props.result.loserId)} LOST A DIE
                </span>
                <Show when={props.result.loserNewCount > 0}>
                    <span class="font-bebas text-[.7rem] tracking-[.1em] text-[#f5e6c8]/40 ml-2">
                        ({props.result.loserNewCount} LEFT)
                    </span>
                </Show>
            </div>
        </div>
    );
}

function GameOverScreen(props: {
    view: PerudoPlayerView;
    playerName: (id: string) => string;
    onReturnToLobby: () => void;
    isHost: boolean;
}) {
    const sortedPlayers = createMemo(() => {
        return [...props.view.players]
            .filter((p) => !p.eliminated)
            .sort((a, b) => b.diceCount - a.diceCount);
    });

    return (
        <div class="flex flex-col items-center gap-4 py-8">
            <span class="font-bebas text-[1.8rem] tracking-[.12em] text-[#d4a017]">
                GAME OVER
            </span>
            <div class="flex flex-col gap-2 items-center">
                <For each={sortedPlayers()}>
                    {(player, i) => (
                        <div class="flex items-center gap-3">
                            <span
                                class={`font-bebas text-[1rem] tracking-[.08em] ${
                                    props.view.winners?.includes(player.id)
                                        ? "text-[#ffd700]"
                                        : "text-[#f5e6c8]"
                                }`}
                            >
                                {player.name.toUpperCase()}
                            </span>
                            <span class="font-bebas text-[.85rem] text-[#f5e6c8]/60">
                                {player.diceCount} dice
                            </span>
                            <Show
                                when={props.view.winners?.includes(player.id)}
                            >
                                <span class="font-bebas text-[.65rem] tracking-[.15em] text-[#ffd700]">
                                    WINNER
                                </span>
                            </Show>
                        </div>
                    )}
                </For>
            </div>
            <Show when={props.isHost}>
                <button
                    class="font-bebas text-[.9rem] tracking-[.12em] text-[#f5e6c8] border border-[#d4a017]/40 px-5 py-2 hover:bg-[#d4a017]/10 transition-colors mt-4"
                    onClick={props.onReturnToLobby}
                >
                    RETURN TO LOBBY
                </button>
            </Show>
        </div>
    );
}
