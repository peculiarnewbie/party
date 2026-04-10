import {
    createSignal,
    createEffect,
    For,
    Show,
    Switch,
    Match,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type { CockroachPokerPlayerView } from "~/game/cockroach-poker/views";
import type { CreatureType } from "~/game/cockroach-poker/types";
import { CREATURE_TYPES } from "~/game/cockroach-poker/types";

interface CockroachPokerRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    ws: WebSocket;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const CREATURE_LABELS: Record<CreatureType, string> = {
    bat: "Bat",
    fly: "Fly",
    cockroach: "Cockroach",
    toad: "Toad",
    rat: "Rat",
    scorpion: "Scorpion",
    spider: "Spider",
    stink_bug: "Stink Bug",
};

const CREATURE_COLORS: Record<CreatureType, string> = {
    bat: "#4a3060",
    fly: "#2a6040",
    cockroach: "#6b3a1a",
    toad: "#2a5a2a",
    rat: "#5a5a5a",
    scorpion: "#8a4a1a",
    spider: "#1a1a1a",
    stink_bug: "#5a6a1a",
};

export const CockroachPokerRoom: Component<CockroachPokerRoomProps> = (
    props,
) => {
    const [view, setView] = createSignal<CockroachPokerPlayerView | null>(
        null,
    );
    const [selectedCard, setSelectedCard] = createSignal<number | null>(null);
    const [selectedTarget, setSelectedTarget] = createSignal<string | null>(
        null,
    );
    const [selectedClaim, setSelectedClaim] = createSignal<CreatureType | null>(
        null,
    );
    const [passTarget, setPassTarget] = createSignal<string | null>(null);
    const [passClaim, setPassClaim] = createSignal<CreatureType | null>(null);
    const [announcement, setAnnouncement] = createSignal<string | null>(null);

    const send = (type: string, data: Record<string, unknown> = {}) => {
        if (!props.ws || !props.playerId) return;
        props.ws.send(
            JSON.stringify({
                type,
                playerId: props.playerId,
                playerName: "",
                data,
            }),
        );
    };

    const playerName = (id: string) => {
        const v = view();
        if (!v) return "Unknown";
        return v.players.find((p) => p.id === id)?.name ?? "Unknown";
    };

    const handleMessage = (e: MessageEvent) => {
        let data: any;
        try {
            data = JSON.parse(e.data);
        } catch {
            return;
        }

        if (data.type === "cockroach_poker:state") {
            setView(data.data as CockroachPokerPlayerView);
        }

        if (data.type === "cockroach_poker:action") {
            const action = data.data;
            if (action.type === "card_offered") {
                setAnnouncement(
                    `${playerName(action.offererId)} offered a card to ${playerName(action.receiverId)}, claiming ${CREATURE_LABELS[action.claim as CreatureType]}`,
                );
                resetSelections();
            } else if (action.type === "call_resolved") {
                const callerName = playerName(action.callerId);
                const verdict = action.wasCorrect ? "was right" : "was wrong";
                const takerName = playerName(action.cardTakerId);
                setAnnouncement(
                    `${callerName} called ${action.calledTrue ? "TRUE" : "FALSE"} and ${verdict}! ${takerName} takes the ${CREATURE_LABELS[action.actualCard as CreatureType]}`,
                );
                resetSelections();
            } else if (action.type === "card_passed") {
                setAnnouncement(
                    `${playerName(action.passerId)} peeked and passed to ${playerName(action.newReceiverId)}, claiming ${CREATURE_LABELS[action.newClaim as CreatureType]}`,
                );
                resetSelections();
            } else if (action.type === "game_over") {
                setAnnouncement(null);
                resetSelections();
            }

            setTimeout(() => setAnnouncement(null), 4000);
        }
    };

    const resetSelections = () => {
        setSelectedCard(null);
        setSelectedTarget(null);
        setSelectedClaim(null);
        setPassTarget(null);
        setPassClaim(null);
    };

    createEffect(() => {
        props.ws.addEventListener("message", handleMessage);
        onCleanup(() => {
            props.ws.removeEventListener("message", handleMessage);
        });
    });

    const handleOffer = () => {
        const card = selectedCard();
        const target = selectedTarget();
        const claim = selectedClaim();
        if (card === null || !target || !claim) return;
        send("cockroach_poker:offer_card", {
            targetId: target,
            cardIndex: card,
            claim,
        });
    };

    const handlePeekAndPass = () => {
        const target = passTarget();
        const claim = passClaim();
        if (!target || !claim) return;
        send("cockroach_poker:peek_and_pass", {
            targetId: target,
            newClaim: claim,
        });
    };

    return (
        <div class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla">
            <Show when={view()} fallback={<LoadingScreen />}>
                {(v) => (
                    <>
                        <Header
                            isHost={props.isHost}
                            phase={v().phase}
                            onEndGame={props.onEndGame}
                        />
                        <div class="max-w-2xl mx-auto px-6 pb-24">
                            <Show when={announcement()}>
                                {(msg) => (
                                    <div class="mt-4 border-2 border-[#1a1a1a] bg-[#f5eedd] px-4 py-3 shadow-[3px_3px_0_#1a1a1a] text-center font-bebas text-[1rem] tracking-[.08em]">
                                        {msg()}
                                    </div>
                                )}
                            </Show>

                            <Switch>
                                <Match when={v().phase === "game_over"}>
                                    <GameOverPhase
                                        view={v()}
                                        isHost={props.isHost}
                                        onReturnToLobby={props.onReturnToLobby}
                                    />
                                </Match>
                                <Match
                                    when={
                                        v().phase === "offering" && v().isMyTurn
                                    }
                                >
                                    <OfferingPhase
                                        view={v()}
                                        selectedCard={selectedCard()}
                                        selectedTarget={selectedTarget()}
                                        selectedClaim={selectedClaim()}
                                        onSelectCard={setSelectedCard}
                                        onSelectTarget={setSelectedTarget}
                                        onSelectClaim={setSelectedClaim}
                                        onOffer={handleOffer}
                                    />
                                </Match>
                                <Match
                                    when={
                                        v().phase === "awaiting_response" &&
                                        v().isMyTurn
                                    }
                                >
                                    <ResponsePhase
                                        view={v()}
                                        passTarget={passTarget()}
                                        passClaim={passClaim()}
                                        onSetPassTarget={setPassTarget}
                                        onSetPassClaim={setPassClaim}
                                        onCallTrue={() =>
                                            send("cockroach_poker:call_true")
                                        }
                                        onCallFalse={() =>
                                            send("cockroach_poker:call_false")
                                        }
                                        onPeekAndPass={handlePeekAndPass}
                                    />
                                </Match>
                                <Match when={!v().isMyTurn}>
                                    <WatchingPhase view={v()} />
                                </Match>
                            </Switch>

                            <FaceUpDisplay
                                view={v()}
                                myId={v().myId}
                            />
                        </div>
                    </>
                )}
            </Show>
        </div>
    );
};

function LoadingScreen() {
    return (
        <div class="min-h-screen flex items-center justify-center bg-[#ddd5c4]">
            <div class="font-bebas text-[1.2rem] tracking-[.18em] text-[#9a9080]">
                LOADING GAME...
            </div>
        </div>
    );
}

function Header(props: {
    isHost: boolean;
    phase: string;
    onEndGame: () => void;
}) {
    const phaseLabel = () => {
        switch (props.phase) {
            case "offering":
                return "OFFERING";
            case "awaiting_response":
                return "RESPONDING";
            case "game_over":
                return "GAME OVER";
            default:
                return "";
        }
    };

    return (
        <div class="border-b-2 border-[#1a1a1a] bg-[#c9c0b0] px-6 py-4">
            <div class="max-w-2xl mx-auto flex items-center justify-between">
                <div>
                    <div class="font-bebas text-[.65rem] tracking-[.28em] text-[#9a9080]">
                        COCKROACH POKER
                    </div>
                    <div class="font-bebas text-[1.6rem] tracking-[.06em] leading-none">
                        {phaseLabel()}
                    </div>
                </div>
                <Show when={props.isHost && props.phase !== "game_over"}>
                    <button
                        type="button"
                        onClick={props.onEndGame}
                        class="font-bebas text-[.8rem] tracking-[.14em] bg-[#ddd5c4] text-[#c0261a] border-2 border-[#1a1a1a] px-3 py-1 shadow-[2px_2px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1a1a1a]"
                    >
                        END
                    </button>
                </Show>
            </div>
        </div>
    );
}

function CreatureCard(props: {
    creature: CreatureType;
    selected?: boolean;
    onClick?: () => void;
    small?: boolean;
}) {
    const size = () => (props.small ? "px-2 py-1 text-[.7rem]" : "px-3 py-2 text-[.8rem]");
    return (
        <button
            type="button"
            onClick={props.onClick}
            class={`font-bebas tracking-[.1em] border-2 border-[#1a1a1a] transition-all duration-[120ms] ${size()} ${
                props.selected
                    ? "bg-[#1a3a6e] text-[#ddd5c4] shadow-[1px_1px_0_#1a1a1a] translate-x-0.5 translate-y-0.5"
                    : "bg-[#f5eedd] text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]"
            }`}
        >
            {CREATURE_LABELS[props.creature]}
        </button>
    );
}

function HandCard(props: {
    creature: CreatureType;
    index: number;
    selected: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            class={`font-bebas text-[.85rem] tracking-[.08em] border-2 border-[#1a1a1a] px-3 py-3 transition-all duration-[120ms] ${
                props.selected
                    ? "bg-[#1a3a6e] text-[#ddd5c4] shadow-[1px_1px_0_#1a1a1a] translate-x-0.5 translate-y-0.5"
                    : "bg-[#f5eedd] text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]"
            }`}
            style={{ "border-left": `4px solid ${CREATURE_COLORS[props.creature]}` }}
        >
            {CREATURE_LABELS[props.creature]}
        </button>
    );
}

function OfferingPhase(props: {
    view: CockroachPokerPlayerView;
    selectedCard: number | null;
    selectedTarget: string | null;
    selectedClaim: CreatureType | null;
    onSelectCard: (i: number | null) => void;
    onSelectTarget: (id: string | null) => void;
    onSelectClaim: (c: CreatureType | null) => void;
    onOffer: () => void;
}) {
    const canOffer = () =>
        props.selectedCard !== null &&
        props.selectedTarget !== null &&
        props.selectedClaim !== null;

    return (
        <div class="mt-6">
            <div class="font-bebas text-[1.1rem] tracking-[.12em] text-[#9a9080] mb-2">
                YOUR TURN - PICK A CARD TO OFFER
            </div>

            <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-2 mt-5">
                1. SELECT A CARD FROM YOUR HAND
            </div>
            <div class="grid grid-cols-4 gap-2 mb-4">
                <For each={props.view.myHand}>
                    {(creature, i) => (
                        <HandCard
                            creature={creature}
                            index={i()}
                            selected={props.selectedCard === i()}
                            onClick={() =>
                                props.onSelectCard(
                                    props.selectedCard === i() ? null : i(),
                                )
                            }
                        />
                    )}
                </For>
            </div>

            <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-2 mt-5">
                2. CHOOSE WHO TO OFFER IT TO
            </div>
            <div class="flex flex-wrap gap-2 mb-4">
                <For each={props.view.validOfferTargets}>
                    {(targetId) => {
                        const name = () =>
                            props.view.players.find((p) => p.id === targetId)
                                ?.name ?? "?";
                        return (
                            <button
                                type="button"
                                onClick={() =>
                                    props.onSelectTarget(
                                        props.selectedTarget === targetId
                                            ? null
                                            : targetId,
                                    )
                                }
                                class={`font-bebas text-[.85rem] tracking-[.1em] border-2 border-[#1a1a1a] px-4 py-2 transition-all duration-[120ms] ${
                                    props.selectedTarget === targetId
                                        ? "bg-[#1a3a6e] text-[#ddd5c4] shadow-[1px_1px_0_#1a1a1a] translate-x-0.5 translate-y-0.5"
                                        : "bg-[#f5eedd] text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]"
                                }`}
                            >
                                {name()}
                            </button>
                        );
                    }}
                </For>
            </div>

            <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-2 mt-5">
                3. MAKE YOUR CLAIM
            </div>
            <div class="grid grid-cols-4 gap-2 mb-6">
                <For each={[...CREATURE_TYPES]}>
                    {(creature) => (
                        <CreatureCard
                            creature={creature}
                            selected={props.selectedClaim === creature}
                            onClick={() =>
                                props.onSelectClaim(
                                    props.selectedClaim === creature
                                        ? null
                                        : creature,
                                )
                            }
                        />
                    )}
                </For>
            </div>

            <button
                type="button"
                onClick={props.onOffer}
                disabled={!canOffer()}
                class={`w-full font-bebas text-[1.1rem] tracking-[.14em] border-2 border-[#1a1a1a] px-6 py-3 transition-all duration-[120ms] ${
                    canOffer()
                        ? "bg-[#c0261a] text-[#ddd5c4] shadow-[4px_4px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                        : "bg-[#c9c0b0] text-[#9a9080] shadow-[2px_2px_0_#b0a898] cursor-not-allowed"
                }`}
            >
                OFFER CARD
            </button>
        </div>
    );
}

function ResponsePhase(props: {
    view: CockroachPokerPlayerView;
    passTarget: string | null;
    passClaim: CreatureType | null;
    onSetPassTarget: (id: string | null) => void;
    onSetPassClaim: (c: CreatureType | null) => void;
    onCallTrue: () => void;
    onCallFalse: () => void;
    onPeekAndPass: () => void;
}) {
    const chain = () => props.view.offerChain;
    const offererName = () => {
        const c = chain();
        if (!c) return "?";
        return (
            props.view.players.find((p) => p.id === c.currentOffererId)
                ?.name ?? "?"
        );
    };

    const canPass = () =>
        props.passTarget !== null && props.passClaim !== null;

    return (
        <div class="mt-6">
            <Show when={chain()}>
                {(c) => (
                    <>
                        <div class="border-2 border-[#1a1a1a] bg-[#f5eedd] px-5 py-4 shadow-[4px_4px_0_#1a1a1a] mb-6">
                            <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#9a9080] mb-1">
                                A CARD HAS BEEN OFFERED TO YOU
                            </div>
                            <div class="font-bebas text-[1.4rem] tracking-[.06em] leading-tight">
                                {offererName()} says this is a{" "}
                                <span
                                    class="uppercase"
                                    style={{
                                        color: CREATURE_COLORS[
                                            c().currentClaim
                                        ],
                                    }}
                                >
                                    {CREATURE_LABELS[c().currentClaim]}
                                </span>
                            </div>
                            <Show when={c().peekedCard}>
                                {(card) => (
                                    <div class="mt-2 font-bebas text-[.85rem] tracking-[.12em] text-[#1a3a6e]">
                                        (You peeked: it's actually a{" "}
                                        {CREATURE_LABELS[card()]})
                                    </div>
                                )}
                            </Show>
                            <Show when={c().seenByPlayerIds.length > 1}>
                                <div class="mt-2 font-bebas text-[.7rem] tracking-[.14em] text-[#9a9080]">
                                    SEEN BY:{" "}
                                    {c()
                                        .seenByPlayerIds.map(
                                            (id) =>
                                                props.view.players.find(
                                                    (p) => p.id === id,
                                                )?.name ?? "?",
                                        )
                                        .join(", ")}
                                </div>
                            </Show>
                        </div>

                        <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-3">
                            DO YOU BELIEVE THE CLAIM?
                        </div>
                        <div class="flex gap-3 mb-6">
                            <button
                                type="button"
                                onClick={props.onCallTrue}
                                class="flex-1 font-bebas text-[1.2rem] tracking-[.12em] border-2 border-[#1a1a1a] bg-[#2a6040] text-[#ddd5c4] px-4 py-3 shadow-[4px_4px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                            >
                                TRUE
                            </button>
                            <button
                                type="button"
                                onClick={props.onCallFalse}
                                class="flex-1 font-bebas text-[1.2rem] tracking-[.12em] border-2 border-[#1a1a1a] bg-[#c0261a] text-[#ddd5c4] px-4 py-3 shadow-[4px_4px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                            >
                                FALSE
                            </button>
                        </div>

                        <Show when={!c().mustAccept}>
                            <div class="border-t-2 border-[#c9c0b0] pt-5 mt-2">
                                <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-3">
                                    OR PEEK AND PASS TO SOMEONE ELSE
                                </div>
                                <div class="flex flex-wrap gap-2 mb-3">
                                    <For each={props.view.validPassTargets}>
                                        {(targetId) => {
                                            const name = () =>
                                                props.view.players.find(
                                                    (p) => p.id === targetId,
                                                )?.name ?? "?";
                                            return (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        props.onSetPassTarget(
                                                            props.passTarget ===
                                                                targetId
                                                                ? null
                                                                : targetId,
                                                        )
                                                    }
                                                    class={`font-bebas text-[.85rem] tracking-[.1em] border-2 border-[#1a1a1a] px-4 py-2 transition-all duration-[120ms] ${
                                                        props.passTarget ===
                                                        targetId
                                                            ? "bg-[#1a3a6e] text-[#ddd5c4] shadow-[1px_1px_0_#1a1a1a] translate-x-0.5 translate-y-0.5"
                                                            : "bg-[#f5eedd] text-[#1a1a1a] shadow-[3px_3px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#1a1a1a]"
                                                    }`}
                                                >
                                                    {name()}
                                                </button>
                                            );
                                        }}
                                    </For>
                                </div>
                                <div class="grid grid-cols-4 gap-2 mb-4">
                                    <For each={[...CREATURE_TYPES]}>
                                        {(creature) => (
                                            <CreatureCard
                                                creature={creature}
                                                small
                                                selected={
                                                    props.passClaim ===
                                                    creature
                                                }
                                                onClick={() =>
                                                    props.onSetPassClaim(
                                                        props.passClaim ===
                                                            creature
                                                            ? null
                                                            : creature,
                                                    )
                                                }
                                            />
                                        )}
                                    </For>
                                </div>
                                <button
                                    type="button"
                                    onClick={props.onPeekAndPass}
                                    disabled={!canPass()}
                                    class={`w-full font-bebas text-[1rem] tracking-[.14em] border-2 border-[#1a1a1a] px-6 py-3 transition-all duration-[120ms] ${
                                        canPass()
                                            ? "bg-[#8b6914] text-[#ddd5c4] shadow-[4px_4px_0_#1a1a1a] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                                            : "bg-[#c9c0b0] text-[#9a9080] shadow-[2px_2px_0_#b0a898] cursor-not-allowed"
                                    }`}
                                >
                                    PEEK & PASS
                                </button>
                            </div>
                        </Show>

                        <Show when={c().mustAccept}>
                            <div class="border-2 border-[#c0261a] bg-[#f5eedd] px-4 py-3 shadow-[3px_3px_0_#1a1a1a] mt-2">
                                <div class="font-bebas text-[.85rem] tracking-[.12em] text-[#c0261a]">
                                    YOU ARE THE LAST PLAYER - YOU MUST ACCEPT
                                </div>
                            </div>
                        </Show>
                    </>
                )}
            </Show>
        </div>
    );
}

function WatchingPhase(props: { view: CockroachPokerPlayerView }) {
    const activePlayerName = () =>
        props.view.players.find((p) => p.id === props.view.activePlayerId)
            ?.name ?? "?";

    return (
        <div class="mt-6">
            <div class="border-2 border-[#1a1a1a] bg-[#f5eedd] px-5 py-5 shadow-[4px_4px_0_#1a1a1a] mb-6 text-center">
                <Show
                    when={props.view.offerChain}
                    fallback={
                        <>
                            <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#9a9080] mb-1">
                                WAITING
                            </div>
                            <div class="font-bebas text-[1.3rem] tracking-[.06em]">
                                {activePlayerName()} is choosing a card to offer
                            </div>
                        </>
                    }
                >
                    {(chain) => {
                        const offererName = () =>
                            props.view.players.find(
                                (p) => p.id === chain().currentOffererId,
                            )?.name ?? "?";
                        const receiverName = () =>
                            props.view.players.find(
                                (p) => p.id === chain().currentReceiverId,
                            )?.name ?? "?";

                        return (
                            <>
                                <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#9a9080] mb-1">
                                    OFFER IN PROGRESS
                                </div>
                                <div class="font-bebas text-[1.3rem] tracking-[.06em] leading-tight">
                                    {offererName()} offered to{" "}
                                    {receiverName()}, claiming{" "}
                                    <span
                                        class="uppercase"
                                        style={{
                                            color: CREATURE_COLORS[
                                                chain().currentClaim
                                            ],
                                        }}
                                    >
                                        {
                                            CREATURE_LABELS[
                                                chain().currentClaim
                                            ]
                                        }
                                    </span>
                                </div>
                                <Show when={chain().peekedCard}>
                                    {(card) => (
                                        <div class="mt-2 font-bebas text-[.85rem] tracking-[.12em] text-[#1a3a6e]">
                                            (You know it's actually a{" "}
                                            {CREATURE_LABELS[card()]})
                                        </div>
                                    )}
                                </Show>
                                <Show when={chain().seenByPlayerIds.length > 1}>
                                    <div class="mt-2 font-bebas text-[.7rem] tracking-[.14em] text-[#9a9080]">
                                        SEEN BY:{" "}
                                        {chain()
                                            .seenByPlayerIds.map(
                                                (id) =>
                                                    props.view.players.find(
                                                        (p) => p.id === id,
                                                    )?.name ?? "?",
                                            )
                                            .join(", ")}
                                    </div>
                                </Show>
                            </>
                        );
                    }}
                </Show>
            </div>

            <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-2">
                YOUR HAND ({props.view.myHand.length} CARDS)
            </div>
            <div class="grid grid-cols-4 gap-2 mb-4">
                <For each={props.view.myHand}>
                    {(creature) => (
                        <div
                            class="font-bebas text-[.8rem] tracking-[.08em] border-2 border-[#1a1a1a] bg-[#f5eedd] px-3 py-2 shadow-[2px_2px_0_#1a1a1a]"
                            style={{
                                "border-left": `4px solid ${CREATURE_COLORS[creature]}`,
                            }}
                        >
                            {CREATURE_LABELS[creature]}
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}

function GameOverPhase(props: {
    view: CockroachPokerPlayerView;
    isHost: boolean;
    onReturnToLobby: () => void;
}) {
    const loserName = () => {
        if (!props.view.loserId) return null;
        return (
            props.view.players.find((p) => p.id === props.view.loserId)
                ?.name ?? "Unknown"
        );
    };

    const reasonText = () => {
        if (props.view.loseReason === "four_of_a_kind")
            return "collected 4 of the same creature";
        if (props.view.loseReason === "empty_hand")
            return "ran out of cards";
        return "lost";
    };

    const isLoser = () => props.view.loserId === props.view.myId;

    return (
        <div class="mt-6">
            <div
                class={`border-2 border-[#1a1a1a] px-6 py-6 shadow-[4px_4px_0_#1a1a1a] mb-6 text-center ${
                    isLoser()
                        ? "bg-[#c0261a] text-[#ddd5c4]"
                        : "bg-[#2a6040] text-[#ddd5c4]"
                }`}
            >
                <div class="font-bebas text-[2rem] tracking-[.08em] leading-none mb-2">
                    {isLoser() ? "YOU LOST" : "YOU WIN"}
                </div>
                <Show when={loserName()}>
                    {(name) => (
                        <div class="font-bebas text-[1rem] tracking-[.12em] opacity-80">
                            {name()} {reasonText()}
                        </div>
                    )}
                </Show>
            </div>

            <Show when={props.isHost}>
                <button
                    type="button"
                    onClick={props.onReturnToLobby}
                    class="w-full font-bebas text-[1.1rem] tracking-[.14em] border-2 border-[#1a1a1a] bg-[#1a3a6e] text-[#ddd5c4] px-6 py-3 shadow-[4px_4px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    RETURN TO LOBBY
                </button>
            </Show>
        </div>
    );
}

function FaceUpDisplay(props: {
    view: CockroachPokerPlayerView;
    myId: string;
}) {
    const groupedCards = (faceUpCards: CreatureType[]) => {
        const counts: Partial<Record<CreatureType, number>> = {};
        for (const card of faceUpCards) {
            counts[card] = (counts[card] ?? 0) + 1;
        }
        return counts;
    };

    return (
        <div class="mt-8">
            <div class="font-bebas text-[.75rem] tracking-[.18em] text-[#9a9080] mb-3">
                FACE-UP CARDS
            </div>
            <div class="space-y-3">
                <For each={props.view.players}>
                    {(player) => {
                        const counts = () => groupedCards(player.faceUpCards);
                        const isMe = () => player.id === props.myId;

                        return (
                            <div
                                class={`border-2 border-[#1a1a1a] px-4 py-3 shadow-[2px_2px_0_#1a1a1a] ${
                                    isMe()
                                        ? "bg-[#e8dece]"
                                        : "bg-[#f5eedd]"
                                }`}
                            >
                                <div class="flex items-center justify-between mb-1">
                                    <div class="font-bebas text-[.9rem] tracking-[.1em]">
                                        {player.name}
                                        {isMe() ? " (YOU)" : ""}
                                    </div>
                                    <div class="font-bebas text-[.65rem] tracking-[.18em] text-[#9a9080]">
                                        {player.handCount} IN HAND
                                    </div>
                                </div>
                                <Show
                                    when={player.faceUpCards.length > 0}
                                    fallback={
                                        <div class="font-karla text-[.75rem] text-[#9a9080] italic">
                                            No face-up cards
                                        </div>
                                    }
                                >
                                    <div class="flex flex-wrap gap-1.5 mt-1">
                                        <For
                                            each={Object.entries(counts()) as [
                                                CreatureType,
                                                number,
                                            ][]}
                                        >
                                            {([creature, count]) => (
                                                <div
                                                    class={`font-bebas text-[.7rem] tracking-[.08em] border border-[#1a1a1a] px-2 py-0.5 ${
                                                        count >= 3
                                                            ? "bg-[#c0261a] text-[#ddd5c4]"
                                                            : "bg-[#ddd5c4]"
                                                    }`}
                                                >
                                                    {CREATURE_LABELS[creature]}{" "}
                                                    x{count}
                                                </div>
                                            )}
                                        </For>
                                    </div>
                                </Show>
                            </div>
                        );
                    }}
                </For>
            </div>
        </div>
    );
}
