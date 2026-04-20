import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onCleanup,
    Show,
} from "solid-js";
import type { Component } from "solid-js";
import type {
    SpiceType,
    SpicyCard,
    SpicyEndReason,
    SpicyPlayerView,
    SpicyResult,
} from "~/game/spicy";
import type { SpicyConnection } from "~/game/spicy/connection";

interface SpicyRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: SpicyConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const SPICE_LABELS: Record<SpiceType, string> = {
    chili: "Chili",
    wasabi: "Wasabi",
    pepper: "Pepper",
};

const SPICE_ACCENTS: Record<SpiceType, string> = {
    chili: "#b12424",
    wasabi: "#4c8f2f",
    pepper: "#2f4e6b",
};

const END_REASON_LABELS: Record<SpicyEndReason, string> = {
    two_trophies: "Second trophy secured",
    all_trophies: "All trophies claimed",
    worlds_end: "World’s End revealed",
    host_ended: "Host ended the game",
    not_enough_players: "Not enough players left",
};

function describeCard(card: SpicyCard) {
    if (card.kind === "wild_number") {
        return "Wild Number";
    }
    if (card.kind === "wild_spice") {
        return "Wild Spice";
    }
    return `${SPICE_LABELS[card.spice]} ${card.number}`;
}

function cardFace(card: SpicyCard) {
    if (card.kind === "wild_number") {
        return {
            title: "WILD",
            subtitle: "ALL NUMBERS",
            accent: "#d5a621",
            detail: "Missing spice",
        };
    }
    if (card.kind === "wild_spice") {
        return {
            title: "WILD",
            subtitle: "ALL SPICES",
            accent: "#0a8f82",
            detail: "Missing number",
        };
    }
    return {
        title: `${card.number}`,
        subtitle: SPICE_LABELS[card.spice].toUpperCase(),
        accent: SPICE_ACCENTS[card.spice],
        detail: "Standard card",
    };
}

function phaseLabel(view: SpicyPlayerView) {
    if (view.phase === "last_card_window") {
        return "Last Card Check";
    }
    if (view.phase === "game_over") {
        return "Game Over";
    }
    return "In Play";
}

function describeEvent(
    result: SpicyResult,
    playerName: (playerId: string) => string,
) {
    if (result.type === "card_played") {
        return `${playerName(result.playerId).toUpperCase()} declares ${result.declaredNumber} ${result.declaredSpice.toUpperCase()}`;
    }
    if (result.type === "player_passed") {
        return `${playerName(result.playerId).toUpperCase()} passes and draws ${result.drewCount}`;
    }
    if (result.type === "invalid_declaration") {
        return `${playerName(result.playerId).toUpperCase()} made an invalid declaration and had to pass`;
    }
    if (result.type === "challenge_resolved") {
        const winner = playerName(result.winnerId).toUpperCase();
        const trait =
            result.challengedTrait === "number" ? "NUMBER" : "SPICE";
        return `${winner} wins the ${trait} challenge on ${describeCard(result.actualCard).toUpperCase()}`;
    }
    if (result.type === "last_card_confirmed") {
        return `${playerName(result.playerId).toUpperCase()} lets the last card ride`;
    }
    if (result.type === "trophy_awarded") {
        return `${playerName(result.playerId).toUpperCase()} takes a trophy`;
    }
    if (result.type === "worlds_end_revealed") {
        return "WORLD’S END HAS BEEN REVEALED";
    }
    if (result.type === "game_over") {
        return "THE GAME IS OVER";
    }
    return null;
}

export const SpicyRoom: Component<SpicyRoomProps> = (props) => {
    const view = () => props.connection.view();
    const [selectedCardId, setSelectedCardId] = createSignal<string | null>(null);
    const [declaredNumber, setDeclaredNumber] = createSignal<number>(1);
    const [declaredSpice, setDeclaredSpice] = createSignal<SpiceType>("chili");
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);

    const playerName = (playerId: string) =>
        view()?.players.find((player) => player.id === playerId)?.name ?? "Unknown";

    const selectedCard = createMemo(
        () => view()?.myHand.find((card) => card.id === selectedCardId()) ?? null,
    );

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "spicy:action") {
                const nextAnnouncement = describeEvent(
                    event.data as unknown as SpicyResult,
                    playerName,
                );
                if (nextAnnouncement) {
                    setAnnouncement(nextAnnouncement);
                    setTimeout(() => setAnnouncement(null), 3200);
                }
                return;
            }

            if (event.type === "spicy:error") {
                const data = event.data as { message?: string };
                if (data.message) {
                    setErrorMessage(data.message);
                    setTimeout(() => setErrorMessage(null), 3200);
                }
            }
        }),
    );

    createEffect(() => {
        const currentView = view();
        if (!currentView) return;

        const availableCardIds = currentView.myHand.map((card) => card.id);
        if (!selectedCardId() || !availableCardIds.includes(selectedCardId()!)) {
            setSelectedCardId(currentView.myHand[0]?.id ?? null);
        }

        if (!currentView.allowedDeclarationNumbers.includes(declaredNumber())) {
            setDeclaredNumber(currentView.allowedDeclarationNumbers[0] ?? 1);
        }

        if (!currentView.allowedDeclarationSpices.includes(declaredSpice())) {
            setDeclaredSpice(
                currentView.allowedDeclarationSpices[0] ?? "chili",
            );
        }
    });

    const currentPlayerName = () => {
        const currentView = view();
        if (!currentView) return "";
        return playerName(currentView.currentPlayerId);
    };

    return (
        <div class="min-h-screen bg-[radial-gradient(circle_at_top,#f6eed9_0%,#ecddbd_36%,#d6c09c_100%)] text-[#2b1c18]">
            <div class="border-b-2 border-[#7a2e25] bg-[#efe2c3]/90 px-4 py-4 backdrop-blur">
                <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
                    <div>
                        <div class="font-bebas text-[.78rem] tracking-[.28em] text-[#7a2e25]">
                            SPICY
                        </div>
                        <div class="font-bebas text-[1.95rem] leading-none tracking-[.08em] text-[#231714]">
                            ROOM {props.roomId.toUpperCase()}
                        </div>
                    </div>
                    <Show when={view()}>
                        {(currentView) => (
                            <div class="flex items-center gap-3">
                                <div class="rounded-sm border-2 border-[#7a2e25] bg-[#f7f0e0] px-4 py-2 text-right shadow-[4px_4px_0_#7a2e25]">
                                    <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#9d8773]">
                                        STATUS
                                    </div>
                                    <div class="font-bebas text-[1rem] tracking-[.08em]">
                                        {phaseLabel(currentView())}
                                    </div>
                                    <div class="font-karla text-[.82rem] text-[#5f4a40]">
                                        {currentView().phase === "game_over"
                                            ? END_REASON_LABELS[
                                                  currentView().endReason ?? "host_ended"
                                              ]
                                            : `${currentPlayerName()} is up`}
                                    </div>
                                </div>
                                <Show when={props.isHost}>
                                    <button
                                        type="button"
                                        onClick={props.onEndGame}
                                        class="border-2 border-[#2b1c18] bg-[#7a2e25] px-4 py-3 font-bebas text-[.9rem] tracking-[.18em] text-[#f7f0e0] shadow-[4px_4px_0_#2b1c18] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#2b1c18]"
                                    >
                                        END GAME
                                    </button>
                                </Show>
                            </div>
                        )}
                    </Show>
                </div>
            </div>

            <div class="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[1.45fr_.95fr]">
                <div class="space-y-5">
                    <Show when={announcement()}>
                        {(message) => (
                            <div class="border-2 border-[#7a2e25] bg-[#fff5e0] px-4 py-3 font-bebas text-[.95rem] tracking-[.14em] text-[#7a2e25] shadow-[4px_4px_0_#7a2e25]">
                                {message()}
                            </div>
                        )}
                    </Show>
                    <Show when={errorMessage()}>
                        {(message) => (
                            <div class="border-2 border-[#2b1c18] bg-[#b12424] px-4 py-3 font-bebas text-[.9rem] tracking-[.12em] text-[#fff5e0] shadow-[4px_4px_0_#2b1c18]">
                                {message()}
                            </div>
                        )}
                    </Show>

                    <Show when={view()} fallback={<LoadingState />}>
                        {(currentView) => (
                            <>
                                <div class="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
                                    <div class="border-2 border-[#7a2e25] bg-[#f8f0df] p-5 shadow-[6px_6px_0_#7a2e25]">
                                        <div class="mb-4 flex items-start justify-between gap-4">
                                            <div>
                                                <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                                    SPICY STACK
                                                </div>
                                                <div class="font-bebas text-[2rem] leading-none tracking-[.08em]">
                                                    {currentView().stackTop
                                                        ? `${currentView().stackTop!.declaredNumber} ${SPICE_LABELS[currentView().stackTop!.declaredSpice]}`
                                                        : "FRESH STACK"}
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                                    CARDS IN STACK
                                                </div>
                                                <div class="font-bebas text-[2rem] leading-none tracking-[.08em] text-[#7a2e25]">
                                                    {currentView().stackTop?.stackSize ?? 0}
                                                </div>
                                            </div>
                                        </div>

                                        <div class="grid gap-4 md:grid-cols-[1fr_auto]">
                                            <div class="rounded-sm border-2 border-[#c8ae8e] bg-[#efe2c3] p-4">
                                                <Show
                                                    when={currentView().stackTop}
                                                    fallback={
                                                        <div class="text-[.95rem] leading-relaxed text-[#5f4a40]">
                                                            Open with any declared
                                                            1, 2, or 3 in the spice of
                                                            your choice.
                                                        </div>
                                                    }
                                                >
                                                    {(top) => (
                                                        <div class="space-y-2">
                                                            <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                                                TOP CARD OWNER
                                                            </div>
                                                            <div class="font-bebas text-[1.3rem] tracking-[.08em]">
                                                                {playerName(top().ownerId)}
                                                            </div>
                                                            <div class="text-[.95rem] leading-relaxed text-[#5f4a40]">
                                                                Number must keep climbing.
                                                                Spice stays locked until a
                                                                new stack begins.
                                                            </div>
                                                        </div>
                                                    )}
                                                </Show>
                                            </div>

                                            <div class="flex items-center gap-3">
                                                <ChallengeButton
                                                    disabled={!currentView().canChallenge}
                                                    label="Challenge Number"
                                                    accent="#d5a621"
                                                    onClick={() =>
                                                        props.connection.send({
                                                            type: "spicy:challenge",
                                                            data: { trait: "number" },
                                                        })
                                                    }
                                                />
                                                <ChallengeButton
                                                    disabled={!currentView().canChallenge}
                                                    label="Challenge Spice"
                                                    accent="#0a8f82"
                                                    onClick={() =>
                                                        props.connection.send({
                                                            type: "spicy:challenge",
                                                            data: { trait: "spice" },
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>

                                        <Show when={currentView().canConfirmLastCard}>
                                            <div class="mt-4 border-2 border-[#2b1c18] bg-[#fff5e0] px-4 py-3 shadow-[4px_4px_0_#2b1c18]">
                                                <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                                    LAST CARD WINDOW
                                                </div>
                                                <div class="mt-1 flex flex-wrap items-center justify-between gap-3">
                                                    <div class="text-[.95rem] text-[#5f4a40]">
                                                        {playerName(
                                                            currentView().pendingLastCardPlayerId ?? "",
                                                        )}{" "}
                                                        is trying to lock in a trophy.
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            props.connection.send({
                                                                type: "spicy:confirm_last_card",
                                                                data: {},
                                                            })
                                                        }
                                                        class="border-2 border-[#2b1c18] bg-[#2b1c18] px-4 py-2 font-bebas text-[.9rem] tracking-[.16em] text-[#fff5e0] shadow-[3px_3px_0_#7a2e25] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#7a2e25]"
                                                    >
                                                        NO CHALLENGE
                                                    </button>
                                                </div>
                                            </div>
                                        </Show>
                                    </div>

                                    <div class="border-2 border-[#2b1c18] bg-[#7a2e25] p-5 text-[#fff5e0] shadow-[6px_6px_0_#2b1c18]">
                                        <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#f2c8bc]">
                                            DECLARE
                                        </div>
                                        <div class="mt-1 font-bebas text-[2rem] leading-none tracking-[.08em]">
                                            {declaredNumber()} {SPICE_LABELS[declaredSpice()]}
                                        </div>

                                        <div class="mt-4">
                                            <div class="mb-2 font-bebas text-[.72rem] tracking-[.22em] text-[#f2c8bc]">
                                                NUMBER
                                            </div>
                                            <div class="flex flex-wrap gap-2">
                                                <For
                                                    each={
                                                        currentView()
                                                            .allowedDeclarationNumbers
                                                    }
                                                >
                                                    {(number) => (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeclaredNumber(
                                                                    number,
                                                                )
                                                            }
                                                            class={`min-w-11 border-2 px-3 py-2 font-bebas text-[1rem] tracking-[.08em] transition-colors ${
                                                                declaredNumber() ===
                                                                number
                                                                    ? "border-[#fff5e0] bg-[#fff5e0] text-[#7a2e25]"
                                                                    : "border-[#f2c8bc] bg-transparent text-[#fff5e0]"
                                                            }`}
                                                        >
                                                            {number}
                                                        </button>
                                                    )}
                                                </For>
                                            </div>
                                        </div>

                                        <div class="mt-4">
                                            <div class="mb-2 font-bebas text-[.72rem] tracking-[.22em] text-[#f2c8bc]">
                                                SPICE
                                            </div>
                                            <div class="flex flex-wrap gap-2">
                                                <For
                                                    each={
                                                        currentView()
                                                            .allowedDeclarationSpices
                                                    }
                                                >
                                                    {(spice) => (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeclaredSpice(
                                                                    spice,
                                                                )
                                                            }
                                                            class={`border-2 px-3 py-2 font-bebas text-[.95rem] tracking-[.12em] transition-colors ${
                                                                declaredSpice() ===
                                                                spice
                                                                    ? "border-[#fff5e0] bg-[#fff5e0] text-[#7a2e25]"
                                                                    : "border-[#f2c8bc] bg-transparent text-[#fff5e0]"
                                                            }`}
                                                        >
                                                            {SPICE_LABELS[spice].toUpperCase()}
                                                        </button>
                                                    )}
                                                </For>
                                            </div>
                                        </div>

                                        <div class="mt-5 grid gap-3 sm:grid-cols-2">
                                            <button
                                                type="button"
                                                disabled={
                                                    !currentView().canPlayCard ||
                                                    !selectedCard()
                                                }
                                                onClick={() =>
                                                    props.connection.send({
                                                        type: "spicy:play_card",
                                                        data: {
                                                            cardId: selectedCard()!.id,
                                                            declaredNumber:
                                                                declaredNumber(),
                                                            declaredSpice:
                                                                declaredSpice(),
                                                        },
                                                    })
                                                }
                                                class="border-2 border-[#fff5e0] bg-[#fff5e0] px-4 py-3 font-bebas text-[.95rem] tracking-[.16em] text-[#7a2e25] shadow-[4px_4px_0_#2b1c18] transition-all duration-[120ms] disabled:cursor-default disabled:opacity-40 disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0_#2b1c18]"
                                            >
                                                PLAY FACE DOWN
                                            </button>
                                            <button
                                                type="button"
                                                disabled={!currentView().canPass}
                                                onClick={() =>
                                                    props.connection.send({
                                                        type: "spicy:pass",
                                                        data: {},
                                                    })
                                                }
                                                class="border-2 border-[#fff5e0] bg-transparent px-4 py-3 font-bebas text-[.95rem] tracking-[.16em] text-[#fff5e0] transition-colors disabled:cursor-default disabled:opacity-40 enabled:hover:bg-[#fff5e0] enabled:hover:text-[#7a2e25]"
                                            >
                                                PASS + DRAW
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div class="border-2 border-[#7a2e25] bg-[#f8f0df] p-5 shadow-[6px_6px_0_#7a2e25]">
                                    <div class="mb-3 flex items-baseline justify-between gap-4">
                                        <div>
                                            <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                                YOUR HAND
                                            </div>
                                            <div class="font-bebas text-[1.7rem] leading-none tracking-[.08em]">
                                                {currentView().myHand.length} cards
                                            </div>
                                        </div>
                                        <div class="font-karla text-[.92rem] text-[#5f4a40]">
                                            Select a card, then choose the bluff
                                            you want to declare.
                                        </div>
                                    </div>

                                    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                        <For each={currentView().myHand}>
                                            {(card) => (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setSelectedCardId(card.id)
                                                    }
                                                    class={`relative min-h-[142px] overflow-hidden border-2 p-4 text-left shadow-[4px_4px_0_#2b1c18] transition-all duration-[120ms] ${
                                                        selectedCardId() === card.id
                                                            ? "border-[#2b1c18] -translate-x-0.5 -translate-y-0.5 bg-[#fff5e0]"
                                                            : "border-[#c8ae8e] bg-[#efe2c3] hover:-translate-x-0.5 hover:-translate-y-0.5"
                                                    }`}
                                                >
                                                    <div
                                                        class="absolute inset-x-0 top-0 h-2"
                                                        style={{
                                                            background:
                                                                cardFace(card)
                                                                    .accent,
                                                        }}
                                                    />
                                                    <div class="mt-2 font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                                        {selectedCardId() ===
                                                        card.id
                                                            ? "SELECTED"
                                                            : "HAND CARD"}
                                                    </div>
                                                    <div
                                                        class="mt-3 font-bebas text-[2.3rem] leading-none tracking-[.08em]"
                                                        style={{
                                                            color: cardFace(card)
                                                                .accent,
                                                        }}
                                                    >
                                                        {cardFace(card).title}
                                                    </div>
                                                    <div class="mt-1 font-bebas text-[1rem] tracking-[.14em] text-[#2b1c18]">
                                                        {cardFace(card).subtitle}
                                                    </div>
                                                    <div class="mt-4 text-[.88rem] text-[#5f4a40]">
                                                        {cardFace(card).detail}
                                                    </div>
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                </div>
                            </>
                        )}
                    </Show>
                </div>

                <div class="space-y-5">
                    <Show when={view()}>
                        {(currentView) => (
                            <>
                                <div class="border-2 border-[#2b1c18] bg-[#231714] p-5 text-[#fff5e0] shadow-[6px_6px_0_#7a2e25]">
                                    <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#d6b39e]">
                                        TABLE
                                    </div>
                                    <div class="mt-4 space-y-3">
                                        <For each={currentView().players}>
                                            {(player) => (
                                                <div class="border border-[#d6b39e]/25 bg-[#3c2a26] px-4 py-3">
                                                    <div class="flex items-center justify-between gap-3">
                                                        <div>
                                                            <div class="font-bebas text-[1.1rem] tracking-[.08em]">
                                                                {player.name}
                                                            </div>
                                                            <div class="text-[.85rem] text-[#d6b39e]">
                                                                {player.handCount} in hand,{" "}
                                                                {player.wonCardCount} won
                                                            </div>
                                                        </div>
                                                        <div class="text-right">
                                                            <div class="font-bebas text-[1.1rem] tracking-[.08em] text-[#f1c14d]">
                                                                {player.trophies} trophy
                                                                {player.trophies === 1
                                                                    ? ""
                                                                    : "ies"}
                                                            </div>
                                                            <div class="text-[.78rem] text-[#d6b39e]">
                                                                {player.isPendingLastCard
                                                                    ? "last card"
                                                                    : player.isCurrentPlayer
                                                                      ? "up now"
                                                                      : "waiting"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                    <div class="mt-4 border-t border-[#d6b39e]/25 pt-4 text-[.88rem] text-[#d6b39e]">
                                        {currentView().trophiesRemaining} trophy
                                        {currentView().trophiesRemaining === 1
                                            ? ""
                                            : "ies"}{" "}
                                        left in the supply.
                                    </div>
                                </div>

                                <Show when={currentView().phase === "game_over"}>
                                    <div class="border-2 border-[#7a2e25] bg-[#fff5e0] p-5 shadow-[6px_6px_0_#7a2e25]">
                                        <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                            FINAL SCORES
                                        </div>
                                        <div class="mt-2 font-bebas text-[1.8rem] leading-none tracking-[.08em]">
                                            {currentView()
                                                .winners?.map((id) =>
                                                    playerName(id).toUpperCase(),
                                                )
                                                .join(" / ")}
                                        </div>
                                        <div class="mt-1 text-[.92rem] text-[#5f4a40]">
                                            {END_REASON_LABELS[
                                                currentView().endReason ??
                                                    "host_ended"
                                            ]}
                                        </div>

                                        <div class="mt-4 space-y-2">
                                            <For each={currentView().finalScores ?? []}>
                                                {(score) => (
                                                    <div class="flex items-center justify-between gap-4 border-t border-[#dbc5a7] pt-3 first:border-t-0 first:pt-0">
                                                        <div>
                                                            <div class="font-bebas text-[1rem] tracking-[.08em]">
                                                                {playerName(score.playerId)}
                                                            </div>
                                                            <div class="text-[.82rem] text-[#5f4a40]">
                                                                {score.wonCardCount} won +{" "}
                                                                {score.trophies * 10} trophy
                                                                pts - {score.handCount} hand
                                                            </div>
                                                        </div>
                                                        <div class="font-bebas text-[1.5rem] tracking-[.08em] text-[#7a2e25]">
                                                            {score.points}
                                                        </div>
                                                    </div>
                                                )}
                                            </For>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={props.onReturnToLobby}
                                            class="mt-5 w-full border-2 border-[#2b1c18] bg-[#2b1c18] px-4 py-3 font-bebas text-[.95rem] tracking-[.16em] text-[#fff5e0] shadow-[4px_4px_0_#7a2e25] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#7a2e25]"
                                        >
                                            RETURN TO LOBBY
                                        </button>
                                    </div>
                                </Show>

                                <div class="border-2 border-[#7a2e25] bg-[#f8f0df] p-5 shadow-[6px_6px_0_#7a2e25]">
                                    <div class="font-bebas text-[.72rem] tracking-[.24em] text-[#9d8773]">
                                        QUICK REMINDER
                                    </div>
                                    <div class="mt-3 space-y-3 text-[.92rem] leading-relaxed text-[#5f4a40]">
                                        <p>
                                            Start each stack with a declared 1, 2,
                                            or 3. Keep the spice locked until the
                                            stack resets.
                                        </p>
                                        <p>
                                            Any player except the top-card owner can
                                            challenge the number or the spice.
                                        </p>
                                        <p>
                                            Wild Spice covers any spice but loses on
                                            number challenges. Wild Number does the
                                            opposite.
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </Show>
                </div>
            </div>
        </div>
    );
};

function LoadingState() {
    return (
        <div class="border-2 border-[#7a2e25] bg-[#f8f0df] px-5 py-10 text-center shadow-[6px_6px_0_#7a2e25]">
            <div class="font-bebas text-[1.15rem] tracking-[.2em] text-[#9d8773]">
                LOADING SPICY ROOM
            </div>
        </div>
    );
}

function ChallengeButton(props: {
    disabled: boolean;
    label: string;
    accent: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            disabled={props.disabled}
            onClick={props.onClick}
            class="min-w-[9.5rem] border-2 border-[#2b1c18] px-3 py-3 font-bebas text-[.85rem] tracking-[.14em] text-[#fff5e0] shadow-[4px_4px_0_#2b1c18] transition-all duration-[120ms] disabled:cursor-default disabled:opacity-35 disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0_#2b1c18]"
            style={{ background: props.accent }}
        >
            {props.label}
        </button>
    );
}
