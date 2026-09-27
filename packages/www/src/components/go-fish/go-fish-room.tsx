import { createSignal, For, Show, onCleanup } from "solid-js";
import type { Component } from "solid-js";
import type { Rank } from "~/assets/card-deck/types";
import { RANK_LABEL } from "~/assets/card-deck/types";
import type { GoFishConnection } from "~/game/go-fish/connection";
import { TableButton, TablePanel, TableLayout } from "~/components/casino";
import { GoFishFelt } from "./go-fish-felt";
import { PlayerHand } from "./player-hand";
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
                const d = event.data;
                if ("error" in d) return;
                const askerName = d.askerName;
                const targetPlayer = gameView()?.players.find(
                    (p) => p.id === d.targetId,
                );
                const targetName = targetPlayer?.name ?? "someone";
                const rankLabel = RANK_LABEL[d.rank] ?? d.rank;

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
                const d = event.data;
                if ("error" in d) return;
                if (d.drewAskedRank) {
                    const name = d.playerName;
                    showAnnouncement(
                        `${name.toUpperCase()} DREW WHAT THEY ASKED FOR!`,
                        "success",
                    );
                }
            }

            if (event.type === "go_fish:book_made") {
                const d = event.data;
                const name = d.playerName;
                const rankLabel = RANK_LABEL[d.rank] ?? d.rank;
                showAnnouncement(
                    `BOOK COMPLETE: ${name.toUpperCase()} GOT ALL ${rankLabel}s`,
                    "book",
                );
            }

            if (event.type === "go_fish:game_over") {
                const winners = event.data.winners ?? [];
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
        const current = view.players.find((p) => p.id === view.currentPlayerId);
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
        <div
            data-testid="go-fish-room"
            class="h-dvh min-h-0 paper text-ink font-karla flex flex-col"
        >
            <div class="flex items-center justify-between px-4 py-2 bg-[#c9c0b0] border-b-[3px] border-[#1a1a1a]">
                <div class="flex items-center gap-3">
                    <span class="border-[3px] border-ink bg-tomato px-3 pt-1 font-bebas text-xl tracking-wider text-cream shadow-ink-sm">
                        GO FISH
                    </span>
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
                <div class="hidden sm:block font-bebas text-[.65rem] tracking-[.25em] text-muted">
                    ROOM {props.roomId.toUpperCase()}
                </div>
            </div>

            <TableLayout
                table={
                    <GoFishFelt
                        fit
                        players={gameView()?.players ?? []}
                        heroId={props.playerId}
                        currentPlayerId={gameView()?.currentPlayerId ?? ""}
                        selectedOpponent={selectedOpponent()}
                        canAsk={
                            isMyTurn() &&
                            gameView()?.turnPhase === "awaiting_ask"
                        }
                        drawPileCount={gameView()?.drawPileCount ?? 0}
                        onSelect={handleSelectOpponent}
                        announcement={
                            <AnnouncementOverlay
                                text={announcement()}
                                variant={announcementVariant()}
                            />
                        }
                    />
                }
            >
                <div class="w-full max-w-5xl mx-auto flex flex-col gap-1 min-w-0">
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
                    <TablePanel
                        active={isMyTurn()}
                        testId="go-fish-actions"
                        class="w-full max-w-xl mx-auto"
                    >
                        <TurnActions
                            isMyTurn={isMyTurn()}
                            turnPhase={gameView()?.turnPhase ?? "awaiting_ask"}
                            selectedOpponent={selectedOpponent()}
                            selectedOpponentName={selectedOpponentName()}
                            selectedRank={selectedRank()}
                            onCancel={cancelSelection}
                            currentPlayerName={currentPlayerName()}
                        />
                        <Show
                            when={
                                isMyTurn() &&
                                gameView()?.turnPhase === "go_fish"
                            }
                        >
                            <TableButton
                                tone="tomato"
                                class="w-full"
                                onClick={sendDraw}
                            >
                                Go Fish!
                            </TableButton>
                        </Show>
                        <BooksDisplay books={myBooks()} />
                    </TablePanel>
                </div>
            </TableLayout>

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

                        <TableButton
                            class="w-full"
                            onClick={() => {
                                window.location.href = `/room/${props.roomId}`;
                            }}
                        >
                            Back to Lobby
                        </TableButton>
                    </div>
                </div>
            </Show>
        </div>
    );
};
