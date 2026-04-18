import {
    createEffect,
    createMemo,
    createSignal,
    For,
    Match,
    onCleanup,
    Show,
    Switch,
} from "solid-js";
import type { Component } from "solid-js";
import { SvgSkullDisc } from "~/assets/svg-skull-disc";
import type { SkullPlayerView } from "~/game/skull";
import type { DiscType, SkullResult } from "~/game/skull";

interface SkullRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    ws: WebSocket;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const PLAYER_PALETTES = [
    {
        base: "#0c7c90",
        accent: "#4dc5cf",
        line: "#072d33",
        center: "#f5f5db",
    },
    {
        base: "#c73c36",
        accent: "#f07e57",
        line: "#4d1712",
        center: "#f7e0bf",
    },
    {
        base: "#3a8f49",
        accent: "#8cd08f",
        line: "#12381c",
        center: "#f0f7d8",
    },
    {
        base: "#d36a9c",
        accent: "#f3a7c2",
        line: "#5a1e38",
        center: "#fff1e7",
    },
    {
        base: "#8b74c9",
        accent: "#c6b7f6",
        line: "#332756",
        center: "#f2effd",
    },
    {
        base: "#d0aa35",
        accent: "#efd178",
        line: "#594516",
        center: "#fff5d5",
    },
] as const;

const RESULT_LABELS: Record<SkullResult["type"], string | null> = {
    round_started: null,
    disc_played: "disc played",
    challenge_started: "challenge started",
    bid_raised: "bid raised",
    bid_passed: "passed",
    attempt_started: "attempt started",
    disc_revealed: "disc revealed",
    attempt_succeeded: "challenge succeeded",
    attempt_failed: "challenge failed",
    discard_required: "disc loss pending",
    disc_lost: "disc lost",
    next_starter_required: "choose next starter",
    next_starter_chosen: "next starter chosen",
    game_over: "game over",
};

export const SkullRoom: Component<SkullRoomProps> = (props) => {
    const [view, setView] = createSignal<SkullPlayerView | null>(null);
    const [lastAction, setLastAction] = createSignal<string | null>(null);
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null);
    const [bidValue, setBidValue] = createSignal(1);

    const send = (type: string, data: Record<string, unknown> = {}) => {
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

    const playerName = (playerId: string) =>
        view()?.players.find((player) => player.id === playerId)?.name ?? "Unknown";

    const clampBid = (nextBid: number) => {
        const currentView = view();
        if (!currentView) return 1;
        if (currentView.maxBid < currentView.minBid) {
            return currentView.minBid;
        }
        return Math.min(
            currentView.maxBid,
            Math.max(currentView.minBid, nextBid),
        );
    };

    const describeAction = (action: SkullResult) => {
        if (action.type === "disc_played") {
            return `${playerName(action.playerId).toUpperCase()} ADDS TO THEIR MAT`;
        }
        if (action.type === "challenge_started") {
            return `${playerName(action.playerId).toUpperCase()} CHALLENGES ${action.bid}`;
        }
        if (action.type === "bid_raised") {
            return `${playerName(action.playerId).toUpperCase()} RAISES TO ${action.bid}`;
        }
        if (action.type === "bid_passed") {
            return `${playerName(action.playerId).toUpperCase()} PASSES`;
        }
        if (action.type === "attempt_started") {
            return `${playerName(action.challengerId).toUpperCase()} MUST FLIP ${action.target}`;
        }
        if (action.type === "disc_revealed") {
            return `${playerName(action.ownerId).toUpperCase()} REVEALS ${action.disc.toUpperCase()}`;
        }
        if (action.type === "attempt_succeeded") {
            return `${playerName(action.challengerId).toUpperCase()} CLEARS THE CHALLENGE`;
        }
        if (action.type === "attempt_failed") {
            return `${playerName(action.ownerId).toUpperCase()} TRIGGERS THE SKULL`;
        }
        if (action.type === "disc_lost") {
            return `${playerName(action.playerId).toUpperCase()} LOSES A DISC`;
        }
        if (action.type === "next_starter_required") {
            return `${playerName(action.chooserId).toUpperCase()} PICKS THE NEXT STARTER`;
        }
        if (action.type === "next_starter_chosen") {
            return `${playerName(action.starterPlayerId).toUpperCase()} STARTS THE NEXT ROUND`;
        }
        if (action.type === "game_over") {
            return action.winnerId
                ? `${playerName(action.winnerId).toUpperCase()} WINS`
                : "GAME OVER";
        }
        return RESULT_LABELS[action.type]?.toUpperCase() ?? null;
    };

    const handleMessage = (event: MessageEvent) => {
        let data: unknown;
        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }

        if (!data || typeof data !== "object" || !("type" in data)) {
            return;
        }

        const message = data as { type: string; data: any };
        if (message.type === "skull:state") {
            const nextView = message.data as SkullPlayerView;
            setView(nextView);
            setBidValue((currentBid) =>
                Math.min(
                    Math.max(nextView.minBid, currentBid),
                    Math.max(nextView.minBid, nextView.maxBid),
                ),
            );
            return;
        }

        if (message.type === "skull:action") {
            const label = describeAction(message.data as SkullResult);
            if (label) {
                setLastAction(label);
            }
            return;
        }

        if (message.type === "skull:error") {
            setErrorMessage(message.data.message as string);
            setTimeout(() => setErrorMessage(null), 3200);
        }
    };

    createEffect(() => {
        props.ws.addEventListener("message", handleMessage);
        onCleanup(() => props.ws.removeEventListener("message", handleMessage));
    });

    createEffect(() => {
        const currentView = view();
        if (!currentView) return;
        setBidValue((currentBid) => clampBid(currentBid));
    });

    const me = createMemo(
        () => view()?.players.find((player) => player.id === props.playerId) ?? null,
    );

    return (
        <div class="min-h-screen bg-[radial-gradient(circle_at_top,#f5dcb2,transparent_42%),linear-gradient(180deg,#2a120f_0%,#532720_20%,#a85b35_58%,#f0d6b3_100%)] text-[#2b170f] font-karla">
            <div class="border-b-2 border-[#442116] bg-[#f1dfbd]/90 backdrop-blur px-4 py-4">
                <div class="mx-auto flex max-w-6xl items-center justify-between gap-4">
                    <div>
                        <div class="font-bebas text-[.8rem] tracking-[.26em] text-[#9c5838]">
                            SKULL
                        </div>
                        <div class="font-bebas text-[1.8rem] leading-none tracking-[.08em]">
                            ROOM {props.roomId.toUpperCase()}
                        </div>
                    </div>
                    <div class="flex items-center gap-3">
                        <Show when={view()}>
                            {(currentView) => (
                                <div class="text-right">
                                    <div class="font-bebas text-[.7rem] tracking-[.18em] text-[#9c5838]">
                                        ROUND {currentView().roundNumber}
                                    </div>
                                    <div class="font-bebas text-[1rem] tracking-[.08em]">
                                        {phaseLabel(currentView().phase)}
                                    </div>
                                </div>
                            )}
                        </Show>
                        <Show when={props.isHost}>
                            <button
                                type="button"
                                onClick={props.onEndGame}
                                class="border-2 border-[#442116] bg-[#6e241a] px-3 py-2 font-bebas text-[.8rem] tracking-[.18em] text-[#f8ebd1] shadow-[3px_3px_0_#442116] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#442116]"
                            >
                                END
                            </button>
                        </Show>
                    </div>
                </div>
            </div>

            <Show when={errorMessage()}>
                {(message) => (
                    <div class="pointer-events-none fixed inset-x-0 top-24 z-50 flex justify-center px-4">
                        <div class="pointer-events-auto rounded-none border-2 border-[#6e241a] bg-[#f6d3c6] px-4 py-3 text-center font-bebas text-[.9rem] tracking-[.12em] text-[#6e241a] shadow-[4px_4px_0_#6e241a]">
                            {message()}
                        </div>
                    </div>
                )}
            </Show>

            <div class="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5">
                <Show when={view()} fallback={<LoadingState />}>
                    {(currentView) => (
                        <>
                            <div class="grid gap-4 xl:grid-cols-[1.75fr_1fr]">
                                <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    <For each={currentView().players}>
                                        {(player, index) => (
                                            <PlayerPanel
                                                player={player}
                                                palette={PLAYER_PALETTES[index() % PLAYER_PALETTES.length]!}
                                                isMe={player.id === currentView().myId}
                                                myMat={
                                                    player.id === currentView().myId
                                                        ? currentView().myMat
                                                        : []
                                                }
                                                canFlip={currentView().selectableFlipOwnerIds.includes(player.id)}
                                                onFlip={() =>
                                                    send("skull:flip_disc", {
                                                        ownerId: player.id,
                                                    })
                                                }
                                            />
                                        )}
                                    </For>
                                </div>

                                <div class="flex flex-col gap-4">
                                    <StatusCard
                                        view={currentView()}
                                        lastAction={lastAction()}
                                    />
                                    <div class="border-2 border-[#442116] bg-[#f5e3be] p-4 shadow-[5px_5px_0_#442116]">
                                        <div class="font-bebas text-[.8rem] tracking-[.22em] text-[#9c5838]">
                                            YOUR HAND
                                        </div>
                                        <div class="mt-3 flex flex-wrap gap-3">
                                            <For each={currentView().myHand}>
                                                {(disc, index) => (
                                                    <button
                                                        type="button"
                                                        disabled={!currentView().canPlayDisc}
                                                        onClick={() =>
                                                            send("skull:play_disc", { disc })
                                                        }
                                                        class="group rounded-none disabled:cursor-default disabled:opacity-55"
                                                    >
                                                        <SvgSkullDisc
                                                            disc={disc}
                                                            palette={
                                                                PLAYER_PALETTES[
                                                                    currentView().players.findIndex(
                                                                        (player) =>
                                                                            player.id ===
                                                                            currentView().myId,
                                                                    ) %
                                                                        PLAYER_PALETTES.length
                                                                ]!
                                                            }
                                                            class="h-20 w-20 transition-transform duration-[120ms] group-enabled:hover:-translate-y-1"
                                                        />
                                                    </button>
                                                )}
                                            </For>
                                            <Show when={currentView().myHand.length === 0}>
                                                <div class="border-2 border-dashed border-[#9c5838] px-4 py-5 font-bebas text-[.8rem] tracking-[.16em] text-[#9c5838]">
                                                    NO DISCS LEFT
                                                </div>
                                            </Show>
                                        </div>
                                    </div>
                                    <Switch>
                                        <Match
                                            when={
                                                currentView().phase === "turn_prep" ||
                                                currentView().phase === "building"
                                            }
                                        >
                                            <BuildControls
                                                view={currentView()}
                                                bidValue={bidValue()}
                                                onDecrementBid={() =>
                                                    setBidValue((currentBid) =>
                                                        clampBid(currentBid - 1),
                                                    )
                                                }
                                                onIncrementBid={() =>
                                                    setBidValue((currentBid) =>
                                                        clampBid(currentBid + 1),
                                                    )
                                                }
                                                onStartChallenge={() =>
                                                    send("skull:start_challenge", {
                                                        bid: bidValue(),
                                                    })
                                                }
                                            />
                                        </Match>
                                        <Match when={currentView().phase === "auction"}>
                                            <AuctionControls
                                                view={currentView()}
                                                bidValue={bidValue()}
                                                onDecrementBid={() =>
                                                    setBidValue((currentBid) =>
                                                        clampBid(currentBid - 1),
                                                    )
                                                }
                                                onIncrementBid={() =>
                                                    setBidValue((currentBid) =>
                                                        clampBid(currentBid + 1),
                                                    )
                                                }
                                                onRaise={() =>
                                                    send("skull:raise_bid", {
                                                        bid: bidValue(),
                                                    })
                                                }
                                                onPass={() => send("skull:pass_bid")}
                                            />
                                        </Match>
                                        <Match when={currentView().phase === "attempt"}>
                                            <AttemptControls view={currentView()} />
                                        </Match>
                                        <Match when={currentView().phase === "penalty"}>
                                            <PenaltyControls
                                                view={currentView()}
                                                onDiscard={(discIndex) =>
                                                    send("skull:discard_lost_disc", {
                                                        discIndex,
                                                    })
                                                }
                                            />
                                        </Match>
                                        <Match when={currentView().phase === "next_starter"}>
                                            <NextStarterControls
                                                view={currentView()}
                                                onChoose={(playerId) =>
                                                    send("skull:choose_next_starter", {
                                                        playerId,
                                                    })
                                                }
                                            />
                                        </Match>
                                        <Match when={currentView().phase === "game_over"}>
                                            <GameOverControls
                                                winnerName={
                                                    currentView().winnerId
                                                        ? playerName(currentView().winnerId!)
                                                        : null
                                                }
                                                onReturnToLobby={props.onReturnToLobby}
                                            />
                                        </Match>
                                    </Switch>
                                </div>
                            </div>
                            <Show when={me()}>
                                {(player) => (
                                    <div class="border-2 border-[#442116] bg-[#f8ebd1] px-4 py-3 shadow-[5px_5px_0_#442116]">
                                        <div class="flex items-center justify-between gap-3">
                                            <div>
                                                <div class="font-bebas text-[.75rem] tracking-[.2em] text-[#9c5838]">
                                                    YOU
                                                </div>
                                                <div class="font-bebas text-[1.2rem] tracking-[.08em]">
                                                    {player().name.toUpperCase()}
                                                </div>
                                            </div>
                                            <div class="font-bebas text-[.8rem] tracking-[.16em] text-[#6f4a38]">
                                                WINS {player().successfulChallenges}/2
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Show>
                        </>
                    )}
                </Show>
            </div>
        </div>
    );
};

function LoadingState() {
    return (
        <div class="flex min-h-[50vh] items-center justify-center font-bebas text-[1rem] tracking-[.18em] text-[#f8ebd1]">
            LOADING SKULL...
        </div>
    );
}

function phaseLabel(phase: SkullPlayerView["phase"]) {
    if (phase === "turn_prep") return "TURN PREP";
    if (phase === "building") return "BUILDING";
    if (phase === "auction") return "AUCTION";
    if (phase === "attempt") return "ATTEMPT";
    if (phase === "penalty") return "PENALTY";
    if (phase === "next_starter") return "NEXT STARTER";
    return "GAME OVER";
}

function StatusCard(props: {
    view: SkullPlayerView;
    lastAction: string | null;
}) {
    const currentPlayer = () =>
        props.view.players.find((player) => player.id === props.view.currentPlayerId);
    const highestBidder = () =>
        props.view.players.find((player) => player.id === props.view.highestBidderId);

    return (
        <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
            <div class="font-bebas text-[.8rem] tracking-[.22em] text-[#9c5838]">
                TABLE
            </div>
            <div class="mt-3 text-[.98rem] leading-relaxed">
                <div>
                    <span class="font-bebas tracking-[.12em] text-[#6f4a38]">
                        CURRENT
                    </span>{" "}
                    {currentPlayer()?.name ?? "Unknown"}
                </div>
                <div class="min-h-[1.5em] truncate">
                    <span class="font-bebas tracking-[.12em] text-[#6f4a38]">
                        LAST
                    </span>{" "}
                    <Show when={props.lastAction} fallback={<span class="text-[#b1846b]">—</span>}>
                        {(message) => <span>{message()}</span>}
                    </Show>
                </div>
                <Show when={props.view.highestBid !== null}>
                    <div>
                        <span class="font-bebas tracking-[.12em] text-[#6f4a38]">
                            BID
                        </span>{" "}
                        {props.view.highestBid} by {highestBidder()?.name ?? "Unknown"}
                    </div>
                </Show>
                <Show when={props.view.attempt}>
                    {(attempt) => (
                        <div>
                            <span class="font-bebas tracking-[.12em] text-[#6f4a38]">
                                FLIPS
                            </span>{" "}
                            {attempt().revealedCount}/{attempt().target}
                        </div>
                    )}
                </Show>
            </div>
        </div>
    );
}

function BuildControls(props: {
    view: SkullPlayerView;
    bidValue: number;
    onDecrementBid: () => void;
    onIncrementBid: () => void;
    onStartChallenge: () => void;
}) {
    return (
        <div class="grid gap-4">
            <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
                <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#9c5838]">
                    PLAY TO YOUR MAT
                </div>
                <p class="mt-2 text-[.94rem] leading-relaxed text-[#6f4a38]">
                    Your hand is shown above. Click a disc there to add it face-down to your own mat.
                </p>
                <Show when={!props.view.canPlayDisc && props.view.isMyTurn}>
                    <div class="mt-3 font-bebas text-[.75rem] tracking-[.16em] text-[#6e241a]">
                        YOU HAVE NO DISCS LEFT TO ADD
                    </div>
                </Show>
            </div>
            <div class="border-2 border-[#442116] bg-[#f2d59a] p-4 shadow-[5px_5px_0_#442116]">
                <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#7a450f]">
                    CHALLENGE
                </div>
                <p class="mt-2 text-[.94rem] leading-relaxed text-[#6f4a38]">
                    Bid how many discs you can reveal without hitting a skull.
                </p>
                <div class="mt-4 flex items-center gap-3">
                    <StepperButton onClick={props.onDecrementBid}>-</StepperButton>
                    <div class="min-w-16 border-2 border-[#442116] bg-[#fff5db] px-4 py-2 text-center font-bebas text-[1.3rem] tracking-[.08em]">
                        {props.bidValue}
                    </div>
                    <StepperButton onClick={props.onIncrementBid}>+</StepperButton>
                </div>
                <div class="mt-2 font-bebas text-[.7rem] tracking-[.15em] text-[#7a450f]">
                    RANGE {props.view.minBid} TO {props.view.maxBid}
                </div>
                <button
                    type="button"
                    disabled={!props.view.canStartChallenge}
                    onClick={props.onStartChallenge}
                    class="mt-4 w-full border-2 border-[#442116] bg-[#6e241a] px-4 py-3 font-bebas text-[1rem] tracking-[.16em] text-[#fff4dd] shadow-[4px_4px_0_#442116] transition-all duration-[120ms] disabled:cursor-default disabled:opacity-45 disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0_#442116]"
                >
                    START CHALLENGE
                </button>
            </div>
        </div>
    );
}

function AuctionControls(props: {
    view: SkullPlayerView;
    bidValue: number;
    onDecrementBid: () => void;
    onIncrementBid: () => void;
    onRaise: () => void;
    onPass: () => void;
}) {
    return (
        <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
            <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#9c5838]">
                AUCTION
            </div>
            <p class="mt-2 text-[.94rem] leading-relaxed text-[#6f4a38]">
                Increase the bid or pass. Once you pass, you are out for this round.
            </p>
            <div class="mt-4 flex items-center gap-3">
                <StepperButton onClick={props.onDecrementBid}>-</StepperButton>
                <div class="min-w-16 border-2 border-[#442116] bg-[#fff5db] px-4 py-2 text-center font-bebas text-[1.3rem] tracking-[.08em]">
                    {props.bidValue}
                </div>
                <StepperButton onClick={props.onIncrementBid}>+</StepperButton>
            </div>
            <div class="mt-2 font-bebas text-[.7rem] tracking-[.15em] text-[#7a450f]">
                RANGE {props.view.minBid} TO {props.view.maxBid}
            </div>
            <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                    type="button"
                    disabled={!props.view.canRaiseBid}
                    onClick={props.onRaise}
                    class="border-2 border-[#442116] bg-[#8a4b1c] px-4 py-3 font-bebas text-[1rem] tracking-[.14em] text-[#fff4dd] shadow-[4px_4px_0_#442116] transition-all duration-[120ms] disabled:cursor-default disabled:opacity-45 disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0_#442116]"
                >
                    RAISE
                </button>
                <button
                    type="button"
                    disabled={!props.view.canPassBid}
                    onClick={props.onPass}
                    class="border-2 border-[#442116] bg-[#fff5db] px-4 py-3 font-bebas text-[1rem] tracking-[.14em] text-[#442116] shadow-[4px_4px_0_#442116] transition-all duration-[120ms] disabled:cursor-default disabled:opacity-45 disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[6px_6px_0_#442116]"
                >
                    PASS
                </button>
            </div>
        </div>
    );
}

function AttemptControls(props: { view: SkullPlayerView }) {
    const challenger = () =>
        props.view.players.find((player) => player.id === props.view.attempt?.challengerId);

    return (
        <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
            <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#9c5838]">
                ATTEMPT
            </div>
            <Show when={props.view.attempt}>
                {(attempt) => (
                    <>
                        <div class="mt-3 rounded-none border-2 border-[#442116] bg-[#fff5db] px-3 py-2 font-bebas text-[.86rem] tracking-[.16em] text-[#442116]">
                            {attempt().autoRevealDone
                                ? "PICK TOP DISCS TO FLIP"
                                : "AUTO-REVEALING YOUR MAT"}
                        </div>
                        <div class="mt-3 text-[.95rem] leading-relaxed text-[#6f4a38]">
                            {challenger()?.name ?? "Unknown"} has flipped{" "}
                            {attempt().revealedCount} of {attempt().target} discs.
                        </div>
                        <Show
                            when={props.view.selectableFlipOwnerIds.length > 0}
                            fallback={
                                <div class="mt-4 font-bebas text-[.78rem] tracking-[.16em] text-[#9c5838]">
                                    {props.view.myId === attempt().challengerId
                                        ? "SELECT A LIT MAT ON THE BOARD"
                                        : "WAIT FOR THE CHALLENGER TO PICK"}
                                </div>
                            }
                        >
                            <div class="mt-4 font-bebas text-[.78rem] tracking-[.16em] text-[#9c5838]">
                                TAP A GLOWING OPPONENT MAT
                            </div>
                        </Show>
                    </>
                )}
            </Show>
        </div>
    );
}

function PenaltyControls(props: {
    view: SkullPlayerView;
    onDiscard: (discIndex: number) => void;
}) {
    const penalizedPlayer = () =>
        props.view.players.find((player) => player.id === props.view.penaltyPlayerId);
    const chooserPlayer = () =>
        props.view.players.find((player) => player.id === props.view.penaltyChooserId);
    const chooserIsPenalized = () =>
        props.view.penaltyChooserId !== null &&
        props.view.penaltyChooserId === props.view.penaltyPlayerId;
    const palette = () => {
        const penalizedIndex = props.view.players.findIndex(
            (player) => player.id === props.view.penaltyPlayerId,
        );
        if (penalizedIndex < 0) return PLAYER_PALETTES[0]!;
        return PLAYER_PALETTES[penalizedIndex % PLAYER_PALETTES.length]!;
    };

    return (
        <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
            <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#9c5838]">
                PENALTY
            </div>
            <Show
                when={props.view.needsDiscardChoice}
                fallback={
                    <Show
                        when={
                            props.view.penaltyChooserId &&
                            props.view.penaltyChooserId !== props.view.myId
                        }
                        fallback={
                            <p class="mt-3 text-[.95rem] leading-relaxed text-[#6f4a38]">
                                {penalizedPlayer()?.name ?? "A player"} is about to lose a disc.
                            </p>
                        }
                    >
                        <p class="mt-3 text-[.95rem] leading-relaxed text-[#6f4a38]">
                            <Show
                                when={
                                    props.view.penaltyChooserId !==
                                    props.view.penaltyPlayerId
                                }
                                fallback={
                                    <>
                                        {penalizedPlayer()?.name ?? "A player"} is
                                        picking a face-down disc to lose.
                                    </>
                                }
                            >
                                {chooserPlayer()?.name ?? "A player"} is picking a
                                face-down disc for{" "}
                                {penalizedPlayer()?.name ?? "the challenger"} to lose
                                (own skull).
                            </Show>
                        </p>
                    </Show>
                }
            >
                <div>
                    <p class="mt-3 text-[.95rem] leading-relaxed text-[#6f4a38]">
                        <Show
                            when={chooserIsPenalized()}
                            fallback={
                                <>
                                    {penalizedPlayer()?.name ?? "The challenger"} hit
                                    their own skull, so pick one of their shuffled
                                    face-down discs to destroy.
                                </>
                            }
                        >
                            Your discs are shuffled face-down. Pick one to lose
                            permanently.
                        </Show>
                    </p>
                    <div class="mt-4 flex flex-wrap gap-3">
                        <For
                            each={Array.from({
                                length: props.view.penaltyTargetHandCount,
                            })}
                        >
                            {(_, index) => (
                                <button
                                    type="button"
                                    onClick={() => props.onDiscard(index())}
                                    class="group"
                                >
                                    <SvgSkullDisc
                                        disc="hidden"
                                        palette={palette()}
                                        class="h-20 w-20 transition-transform duration-[120ms] group-hover:-translate-y-1"
                                    />
                                </button>
                            )}
                        </For>
                        <Show when={props.view.penaltyTargetHandCount === 0}>
                            <div class="font-bebas text-[.74rem] tracking-[.14em] text-[#b1846b]">
                                NO DISCS LEFT
                            </div>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
}

function NextStarterControls(props: {
    view: SkullPlayerView;
    onChoose: (playerId: string) => void;
}) {
    const chooser = () =>
        props.view.players.find(
            (player) => player.id === props.view.pendingNextStarterChooserId,
        );

    return (
        <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
            <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#9c5838]">
                NEXT STARTER
            </div>
            <Show
                when={props.view.canChooseNextStarter}
                fallback={
                    <p class="mt-3 text-[.95rem] leading-relaxed text-[#6f4a38]">
                        {chooser()?.name ?? "A player"} is choosing who opens the next round.
                    </p>
                }
            >
                <div>
                    <p class="mt-3 text-[.95rem] leading-relaxed text-[#6f4a38]">
                        Choose the player whose mat starts the next round.
                    </p>
                    <div class="mt-4 grid gap-3">
                        <For each={props.view.nextStarterOptions}>
                            {(playerId) => (
                                <button
                                    type="button"
                                    onClick={() => props.onChoose(playerId)}
                                    class="border-2 border-[#442116] bg-[#fff5db] px-4 py-3 text-left font-bebas text-[.95rem] tracking-[.14em] text-[#442116] shadow-[4px_4px_0_#442116] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#442116]"
                                >
                                    {props.view.players.find((player) => player.id === playerId)
                                        ?.name ?? "Unknown"}
                                </button>
                            )}
                        </For>
                    </div>
                </div>
            </Show>
        </div>
    );
}

function GameOverControls(props: {
    winnerName: string | null;
    onReturnToLobby: () => void;
}) {
    return (
        <div class="border-2 border-[#442116] bg-[#f8ebd1] p-4 shadow-[5px_5px_0_#442116]">
            <div class="font-bebas text-[.82rem] tracking-[.22em] text-[#9c5838]">
                GAME OVER
            </div>
            <p class="mt-3 text-[1rem] leading-relaxed text-[#6f4a38]">
                {props.winnerName ? `${props.winnerName} wins the table.` : "The host ended the game."}
            </p>
            <button
                type="button"
                onClick={props.onReturnToLobby}
                class="mt-4 w-full border-2 border-[#442116] bg-[#6e241a] px-4 py-3 font-bebas text-[1rem] tracking-[.16em] text-[#fff4dd] shadow-[4px_4px_0_#442116] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#442116]"
            >
                RETURN TO LOBBY
            </button>
        </div>
    );
}

function PlayerPanel(props: {
    player: SkullPlayerView["players"][number];
    palette: typeof PLAYER_PALETTES[number];
    isMe: boolean;
    myMat: DiscType[];
    canFlip: boolean;
    onFlip: () => void;
}) {
    const panelClass = () => {
        if (props.canFlip) {
            return "border-[#f5d675] bg-[#2f5b4a] text-[#fff5dd] shadow-[5px_5px_0_#442116] ring-2 ring-[#f5d675] ring-offset-2 ring-offset-[#2a120f]";
        }
        if (props.player.isCurrentPlayer) {
            return "border-[#c77f1b] bg-[#fff3c4] shadow-[5px_5px_0_#c77f1b] ring-2 ring-[#f5c84c] ring-offset-2 ring-offset-[#2a120f]";
        }
        return "border-[#442116] bg-[#f7e6c4] shadow-[5px_5px_0_#442116]";
    };

    return (
        <div
            class={`border-2 p-4 transition-[box-shadow,background-color,border-color] duration-[120ms] ${panelClass()}`}
        >
            <div class="flex items-start justify-between gap-3">
                <div>
                    <div class="font-bebas text-[.76rem] tracking-[.2em] text-[#9c5838]">
                        {props.isMe ? "YOUR MAT" : "PLAYER"}
                    </div>
                    <div class="font-bebas text-[1.2rem] leading-none tracking-[.08em]">
                        {props.player.name.toUpperCase()}
                    </div>
                </div>
                <div class="flex flex-wrap justify-end gap-1">
                    <Show when={props.player.isStarter}>
                        <Badge tone="amber">START</Badge>
                    </Show>
                    <Show when={props.player.isCurrentPlayer}>
                        <Badge tone="blue">TURN</Badge>
                    </Show>
                    <Show when={props.player.isHighestBidder}>
                        <Badge tone="red">HIGH</Badge>
                    </Show>
                    <Show when={props.player.hasPassed}>
                        <Badge tone="plain">PASS</Badge>
                    </Show>
                    <Show when={props.player.eliminated}>
                        <Badge tone="plain">OUT</Badge>
                    </Show>
                </div>
            </div>

            <div class="mt-4 grid grid-cols-3 gap-2 text-center font-bebas text-[.72rem] tracking-[.14em] text-[#6f4a38]">
                <div class="border border-[#c59e78] bg-[#fff5db] px-2 py-2">
                    HAND
                    <div class="mt-1 text-[1rem] text-[#2b170f]">
                        {props.player.handCount}
                    </div>
                </div>
                <div class="border border-[#c59e78] bg-[#fff5db] px-2 py-2">
                    MAT
                    <div class="mt-1 text-[1rem] text-[#2b170f]">
                        {props.player.matCount}
                    </div>
                </div>
                <div class="border border-[#c59e78] bg-[#fff5db] px-2 py-2">
                    WINS
                    <div class="mt-1 text-[1rem] text-[#2b170f]">
                        {props.player.successfulChallenges}
                    </div>
                </div>
            </div>

            <div class="mt-4">
                <div class="font-bebas text-[.72rem] tracking-[.16em] text-[#9c5838]">
                    REVEALED
                </div>
                <div class="mt-2 flex min-h-14 flex-wrap gap-2">
                    <For each={props.player.revealedDiscs}>
                        {(disc) => (
                            <SvgSkullDisc
                                disc={disc}
                                palette={props.palette}
                                class="h-14 w-14"
                            />
                        )}
                    </For>
                    <Show when={props.player.revealedDiscs.length === 0}>
                        <div class="font-bebas text-[.74rem] tracking-[.14em] text-[#b1846b]">
                            NONE
                        </div>
                    </Show>
                </div>
            </div>

            <div class="mt-4">
                <div class="font-bebas text-[.72rem] tracking-[.16em] text-[#9c5838]">
                    FACE-DOWN STACK
                </div>
                <Show
                    when={props.isMe}
                    fallback={
                        <div class="mt-2 flex items-center gap-2">
                            <For each={Array.from({ length: props.player.faceDownCount })}>
                                {(_, index) => (
                                    <SvgSkullDisc
                                        disc="hidden"
                                        palette={props.palette}
                                        class="h-14 w-14"
                                        style={{
                                            transform: `translateX(${index() * -10}px)`,
                                        }}
                                    />
                                )}
                            </For>
                            <Show when={props.player.faceDownCount === 0}>
                                <div class="font-bebas text-[.74rem] tracking-[.14em] text-[#b1846b]">
                                    EMPTY
                                </div>
                            </Show>
                        </div>
                    }
                >
                    <div class="mt-2 flex flex-wrap gap-2">
                        <For each={props.myMat}>
                            {(disc, index) => {
                                const revealed =
                                    index() >=
                                    props.myMat.length - props.player.revealedDiscs.length;
                                return (
                                    <SvgSkullDisc
                                        disc={disc}
                                        palette={props.palette}
                                        class={`h-14 w-14 ${revealed ? "opacity-100" : "opacity-82"}`}
                                    />
                                );
                            }}
                        </For>
                        <Show when={props.myMat.length === 0}>
                            <div class="font-bebas text-[.74rem] tracking-[.14em] text-[#b1846b]">
                                EMPTY
                            </div>
                        </Show>
                    </div>
                </Show>
            </div>

            <Show when={props.canFlip}>
                <button
                    type="button"
                    onClick={props.onFlip}
                    class="mt-4 w-full border-2 border-[#f5d675] bg-[#f9e287] px-4 py-3 font-bebas text-[.9rem] tracking-[.16em] text-[#2f2310] shadow-[4px_4px_0_#f5d675] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#f5d675]"
                >
                    FLIP TOP DISC
                </button>
            </Show>
        </div>
    );
}

function Badge(props: {
    children: string;
    tone: "amber" | "blue" | "red" | "plain";
}) {
    const toneClass =
        props.tone === "amber"
            ? "bg-[#f2d59a] text-[#7a450f] border-[#7a450f]"
            : props.tone === "blue"
              ? "bg-[#cadeef] text-[#133a5c] border-[#133a5c]"
              : props.tone === "red"
                ? "bg-[#f2c4b1] text-[#6e241a] border-[#6e241a]"
                : "bg-[#ece1d0] text-[#5e5348] border-[#5e5348]";

    return (
        <span
            class={`border px-2 py-1 font-bebas text-[.62rem] tracking-[.18em] ${toneClass}`}
        >
            {props.children}
        </span>
    );
}

function StepperButton(props: { children: string; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={props.onClick}
            class="h-11 w-11 border-2 border-[#442116] bg-[#fff5db] font-bebas text-[1.3rem] leading-none text-[#442116] shadow-[3px_3px_0_#442116] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#442116]"
        >
            {props.children}
        </button>
    );
}
