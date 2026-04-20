import {
    createSignal,
    For,
    Show,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type { Rank } from "~/assets/card-deck/types";
import { RANK_LABEL } from "~/assets/card-deck/types";
import type { GoFishConnection } from "~/game/go-fish/connection";
import { PlayerHand } from "./player-hand";
import { OpponentZone } from "./opponent-zone";
import { DrawPile } from "./draw-pile";
import { BooksDisplay } from "./books-display";
import { TurnActions } from "./turn-actions";
import { AnnouncementOverlay } from "./announcement-overlay";

interface GoFishRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: GoFishConnection;
}

export const GoFishRoom: Component<GoFishRoomProps> = (props) => {
    const gameView = () => props.connection.view();
    const [selectedOpponent, setSelectedOpponent] = createSignal<string | null>(
        null,
    );
    const [selectedRank, setSelectedRank] = createSignal<Rank | null>(null);
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [announcementVariant, setAnnouncementVariant] = createSignal<
        "go_fish" | "success" | "book" | "info"
    >("info");
    const [announcementKey, setAnnouncementKey] = createSignal(0);

    const showAnnouncement = (
        text: string,
        variant: "go_fish" | "success" | "book" | "info",
    ) => {
        setAnnouncement(null);
        setAnnouncementKey((k) => k + 1);
        setTimeout(() => {
            setAnnouncement(text);
            setAnnouncementVariant(variant);
        }, 50);
    };

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "go_fish:ask_result") {
                const d = event.data as Record<string, any>;
                if (d.error) return;
                const askerName = d.askerName ?? "Someone";
                const targetPlayer = gameView()?.players.find(
                    (p) => p.id === d.targetId,
                );
                const targetName = targetPlayer?.name ?? "someone";
                const rankLabel = RANK_LABEL[d.rank as Rank] ?? d.rank;

                if (d.success) {
                    showAnnouncement(
                        `${askerName.toUpperCase()} GOT ${d.count} ${rankLabel}${d.count > 1 ? "s" : ""} FROM ${targetName.toUpperCase()}`,
                        "success",
                    );
                } else {
                    showAnnouncement("GO FISH!", "go_fish");
                }
            }

            if (event.type === "go_fish:draw_result") {
                const d = event.data as Record<string, any>;
                if (d.error) return;
                if (d.drewAskedRank) {
                    const name = d.playerName ?? "Someone";
                    showAnnouncement(
                        `${name.toUpperCase()} DREW WHAT THEY ASKED FOR!`,
                        "success",
                    );
                }
            }

            if (event.type === "go_fish:book_made") {
                const d = event.data as Record<string, any>;
                const name = d.playerName ?? "Someone";
                const rankLabel = RANK_LABEL[d.rank as Rank] ?? d.rank;
                showAnnouncement(
                    `BOOK COMPLETE: ${name.toUpperCase()} GOT ALL ${rankLabel}s`,
                    "book",
                );
            }

            if (event.type === "go_fish:game_over") {
                const d = event.data as Record<string, any>;
                const winners = d.winners as string[];
                const view = gameView();
                if (view) {
                    const winnerNames = winners
                        .map(
                            (id) =>
                                view.players.find((p) => p.id === id)?.name ??
                                id,
                        )
                        .join(" & ");
                    showAnnouncement(
                        `GAME OVER! ${winnerNames.toUpperCase()} WINS!`,
                        "book",
                    );
                }
            }
        }),
    );

    const isMyTurn = () => {
        const view = gameView();
        return view ? view.currentPlayerId === props.playerId : false;
    };

    const myBooks = () => {
        const view = gameView();
        if (!view) return [];
        const me = view.players.find((p) => p.id === props.playerId);
        return me?.books ?? [];
    };

    const opponents = () => {
        const view = gameView();
        if (!view) return [];
        return view.players.filter((p) => p.id !== props.playerId);
    };

    const currentPlayerName = () => {
        const view = gameView();
        if (!view) return "";
        const current = view.players.find(
            (p) => p.id === view.currentPlayerId,
        );
        return current?.name ?? "";
    };

    const selectedOpponentName = () => {
        const id = selectedOpponent();
        if (!id) return null;
        const opp = opponents().find((o) => o.id === id);
        return opp?.name ?? null;
    };

    const trySendAsk = (oppId: string | null, rank: Rank | null) => {
        if (!oppId || !rank || !props.playerId) return;

        props.connection.send({
            type: "go_fish:ask",
            data: { targetId: oppId, rank },
        });

        setSelectedOpponent(null);
        setSelectedRank(null);
    };

    const handleSelectOpponent = (id: string) => {
        setSelectedOpponent(id);
        trySendAsk(id, selectedRank());
    };

    const handleSelectRank = (rank: Rank) => {
        setSelectedRank(rank);
        trySendAsk(selectedOpponent(), rank);
    };

    const sendDraw = () => {
        if (!props.playerId) return;
        props.connection.send({
            type: "go_fish:draw",
            data: {},
        });
    };

    const cancelSelection = () => {
        setSelectedOpponent(null);
        setSelectedRank(null);
    };

    return (
        <div class="min-h-screen bg-[#ddd5c4] font-karla flex flex-col">
            {/* Top bar */}
            <div class="flex items-center justify-between px-4 py-2 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a]">
                <div class="flex items-center gap-3">
                    <Show
                        when={isMyTurn()}
                        fallback={
                            <span class="font-bebas text-[.85rem] tracking-[.12em] text-[#1a1a1a] px-3 py-1 bg-[#ddd5c4] border border-[#b8ae9e]">
                                {currentPlayerName().toUpperCase()}'S TURN
                            </span>
                        }
                    >
                        <span class="font-bebas text-[.85rem] tracking-[.12em] text-[#ddd5c4] px-3 py-1 bg-[#c0261a]">
                            YOUR TURN
                        </span>
                    </Show>
                </div>
                <div class="font-bebas text-[.65rem] tracking-[.25em] text-[#9a9080]">
                    ROOM {props.roomId.toUpperCase()}
                </div>
            </div>

            {/* Opponents */}
            <div class="flex justify-center gap-4 px-4 py-3 flex-wrap">
                <For each={opponents()}>
                    {(opp) => (
                        <OpponentZone
                            id={opp.id}
                            name={opp.name}
                            cardCount={opp.cardCount}
                            books={opp.books}
                            isCurrentTurn={
                                gameView()?.currentPlayerId === opp.id
                            }
                            selectable={
                                isMyTurn() &&
                                gameView()?.turnPhase === "awaiting_ask"
                            }
                            selected={selectedOpponent() === opp.id}
                            onSelect={handleSelectOpponent}
                        />
                    )}
                </For>
            </div>

            {/* Center: draw pile + announcements */}
            <div class="flex-1 flex items-center justify-center relative px-4">
                <DrawPile
                    count={gameView()?.drawPileCount ?? 0}
                    showDrawButton={
                        isMyTurn() &&
                        gameView()?.turnPhase === "go_fish"
                    }
                    onDraw={sendDraw}
                />
                <AnnouncementOverlay
                    text={announcement()}
                    variant={announcementVariant()}
                />
            </div>

            {/* Turn actions */}
            <TurnActions
                isMyTurn={isMyTurn()}
                turnPhase={gameView()?.turnPhase ?? "awaiting_ask"}
                selectedOpponent={selectedOpponent()}
                selectedOpponentName={selectedOpponentName()}
                selectedRank={selectedRank()}
                onCancel={cancelSelection}
                currentPlayerName={currentPlayerName()}
            />

            {/* Books */}
            <BooksDisplay books={myBooks()} />

            {/* Hand */}
            <Show when={gameView()}>
                <PlayerHand
                    cards={gameView()!.myHand}
                    selectedRank={selectedRank()}
                    onSelectRank={handleSelectRank}
                    disabled={
                        !isMyTurn() ||
                        gameView()?.turnPhase !== "awaiting_ask"
                    }
                />
            </Show>

            {/* Game over overlay */}
            <Show when={gameView()?.gameOver}>
                <div class="fixed inset-0 bg-[#1a1a1a]/60 flex items-center justify-center z-50">
                    <div class="bg-[#ddd5c4] border-2 border-[#1a1a1a] shadow-[6px_6px_0_#1a1a1a] p-8 text-center max-w-md">
                        <div class="font-bebas text-[.7rem] tracking-[.28em] text-[#c0261a] mb-2">
                            GAME OVER
                        </div>
                        <div class="font-bebas text-[clamp(2rem,4vw,3rem)] text-[#1a1a1a] leading-[.9] mb-4">
                            {(() => {
                                const view = gameView();
                                if (!view?.winner) return "DRAW";
                                const isWinner = view.winner.includes(
                                    props.playerId ?? "",
                                );
                                if (isWinner) return "YOU WIN!";
                                const names = view.winner
                                    .map(
                                        (id) =>
                                            view.players.find(
                                                (p) => p.id === id,
                                            )?.name ?? id,
                                    )
                                    .join(" & ");
                                return `${names.toUpperCase()} WINS!`;
                            })()}
                        </div>

                        <div class="space-y-1 mb-6">
                            <For each={gameView()?.players ?? []}>
                                {(p) => (
                                    <div class="flex items-center justify-between font-karla text-[.9rem]">
                                        <span class="text-[#1a1a1a]">
                                            {p.name}
                                        </span>
                                        <span class="font-bebas text-[1rem] tracking-[.08em] text-[#1a3a6e]">
                                            {p.books.length} BOOKS
                                        </span>
                                    </div>
                                )}
                            </For>
                        </div>

                        <button
                            class="w-full font-bebas text-[1.1rem] tracking-[.12em] bg-[#1a1a1a] text-[#ddd5c4] border-2 border-[#1a1a1a] py-3 cursor-pointer shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                            onClick={() => {
                                window.location.href = `/room/${props.roomId}`;
                            }}
                        >
                            Back to Lobby
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
};
