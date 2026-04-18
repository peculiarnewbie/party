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
    Dice,
    LyingTurnReveal,
    ScoringCategory,
    YahtzeePlayerView,
} from "~/game/yahtzee";
import {
    CATEGORY_LABELS,
    LOWER_CATEGORIES,
    SCORING_CATEGORIES,
    UPPER_BONUS_THRESHOLD,
    UPPER_CATEGORIES,
    calculateScore,
} from "~/game/yahtzee";

interface YahtzeeRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    ws: WebSocket;
    title: string;
    onEndGame: () => void;
    onReturnToLobby: () => void;
    announcementDelayMs?: number;
}

export const YahtzeeRoom: Component<YahtzeeRoomProps> = (props) => {
    const [gameView, setGameView] = createSignal<YahtzeePlayerView | null>(
        null,
    );
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [announcementKey, setAnnouncementKey] = createSignal(0);
    const [selectedClaimCategory, setSelectedClaimCategory] =
        createSignal<ScoringCategory | null>(null);
    const [claimedDice, setClaimedDice] = createSignal<Dice>([1, 1, 1, 1, 1]);
    const [claimSeedKey, setClaimSeedKey] = createSignal("");

    const showAnnouncement = (text: string) => {
        setAnnouncement(null);
        setAnnouncementKey((k) => k + 1);
        const delayMs = props.announcementDelayMs ?? 30;
        if (delayMs <= 0) {
            setAnnouncement(text);
            return;
        }
        setTimeout(() => {
            setAnnouncement(text);
        }, delayMs);
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

        if (data.type === "yahtzee:state") {
            setGameView(data.data as YahtzeePlayerView);
        }

        if (data.type === "yahtzee:action") {
            const d = data.data;
            if (d.type === "rolled" && d.playerId !== props.playerId) {
                showAnnouncement(`${playerName(d.playerId)} ROLLED`);
            }
            if (d.type === "scored") {
                const catLabel =
                    CATEGORY_LABELS[d.category as ScoringCategory] ??
                    d.category;
                showAnnouncement(
                    `${playerName(d.playerId)}: ${catLabel} FOR ${d.points}`,
                );
            }
            if (d.type === "claim_submitted") {
                const catLabel =
                    CATEGORY_LABELS[d.category as ScoringCategory] ??
                    d.category;
                showAnnouncement(
                    `${playerName(d.playerId)} CLAIMS ${catLabel} FOR ${d.claimedPoints}`,
                );
            }
            if (d.type === "claim_resolved") {
                if (d.outcome === "caught_lying") {
                    showAnnouncement(
                        `${playerName(d.playerId)} GOT CAUGHT LYING`,
                    );
                } else if (d.outcome === "truthful_challenge") {
                    showAnnouncement(
                        `${playerName(d.playerId)} TOLD THE TRUTH`,
                    );
                } else {
                    const catLabel =
                        CATEGORY_LABELS[d.category as ScoringCategory] ??
                        d.category;
                    showAnnouncement(
                        `${playerName(d.playerId)} BANKS ${catLabel}`,
                    );
                }
            }
        }

        if (data.type === "yahtzee:game_over") {
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
        onCleanup(() =>
            props.ws.removeEventListener("message", handleMessage),
        );
    });

    createEffect(() => {
        const view = gameView();
        if (
            !view ||
            view.mode !== "lying" ||
            !view.isMyTurn ||
            view.phase !== "mid_turn"
        ) {
            if (selectedClaimCategory() !== null) {
                setSelectedClaimCategory(null);
            }
            if (claimSeedKey()) {
                setClaimSeedKey("");
            }
            return;
        }

        const nextKey = [
            view.currentPlayerId,
            view.round,
            view.phase,
            view.dice.join(","),
        ].join(":");

        if (claimSeedKey() !== nextKey) {
            setClaimSeedKey(nextKey);
            setClaimedDice(
                view.dice.some((die) => die > 0)
                    ? ([...view.dice] as Dice)
                    : [1, 1, 1, 1, 1],
            );

            const currentCategory = selectedClaimCategory();
            const me = view.players.find((player) => player.id === view.myId);
            if (
                currentCategory &&
                me?.scorecard[currentCategory] === undefined
            ) {
                return;
            }

            const firstOpenCategory = SCORING_CATEGORIES.find(
                (category) => me?.scorecard[category] === undefined,
            );
            setSelectedClaimCategory(firstOpenCategory ?? null);
        }
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

    const roll = () => sendMsg("yahtzee:roll");
    const toggleHold = (i: number) =>
        sendMsg("yahtzee:toggle_hold", { diceIndex: i });
    const score = (category: ScoringCategory) =>
        sendMsg("yahtzee:score", { category });
    const submitClaim = () => {
        const category = selectedClaimCategory();
        if (!category) return;
        sendMsg("yahtzee:claim", {
            category,
            claimedDice: claimedDice(),
        });
    };
    const acceptClaim = () => sendMsg("yahtzee:accept_claim");
    const challengeClaim = () => sendMsg("yahtzee:challenge_claim");

    const cycleClaimDie = (index: number) => {
        setClaimedDice((current) => {
            const next = [...current] as Dice;
            next[index] = next[index] === 6 ? 1 : next[index] + 1;
            return next;
        });
    };

    const useRealRollForClaim = () => {
        const view = gameView();
        if (!view) return;
        setClaimedDice([...view.dice] as Dice);
    };

    const diceColor = (i: number) => {
        const view = gameView();
        if (!view) return "#8b7355";
        if (view.held[i]) return "#ddd5c4";
        return "#8b7355";
    };

    const diceDotColor = (i: number) => {
        const view = gameView();
        if (!view) return "white";
        if (view.held[i]) return "#1a1a1a";
        return "white";
    };

    const canToggle = () => {
        const view = gameView();
        return view?.isMyTurn && view?.phase === "mid_turn";
    };

    const claimPoints = createMemo(() => {
        const category = selectedClaimCategory();
        if (!category) return null;
        return calculateScore(claimedDice(), category);
    });

    return (
        <div
            class="min-h-screen bg-[#8b2500] font-karla flex flex-col"
            data-testid="yahtzee-room"
        >
            <div class="flex items-center justify-between px-4 py-2 bg-[#5c1a00] border-b-[3px] border-[#3d1100]">
                <div class="flex items-center gap-3">
                    <span
                        class="font-bebas text-[1.1rem] tracking-[.12em] text-[#ddd5c4]"
                        data-testid="yahtzee-title"
                    >
                        {props.title.toUpperCase()}
                    </span>
                    <Show when={gameView()}>
                        <span
                            class="font-bebas text-[.75rem] tracking-[.15em] text-[#e8a87c]"
                            data-testid="yahtzee-round"
                        >
                            ROUND {gameView()!.round} / 13
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-3">
                    <Show when={me()}>
                        <span
                            class="font-bebas text-[.8rem] tracking-[.1em] text-[#ddd5c4]"
                            data-testid="yahtzee-my-score"
                        >
                            {me()!.totalScore} PTS
                        </span>
                    </Show>
                    <Show when={props.isHost}>
                        <button
                            class="font-bebas text-[.7rem] tracking-[.15em] text-[#c0261a] border border-[#c0261a]/40 px-2 py-0.5 hover:bg-[#c0261a]/10 transition-colors"
                            onClick={props.onEndGame}
                            data-testid="yahtzee-end-button"
                        >
                            END
                        </button>
                    </Show>
                </div>
            </div>

            <div class="flex flex-col items-center pt-5 pb-3 px-3">
                <Show when={gameView()?.phase !== "game_over"}>
                    <div class="flex gap-3 mb-3">
                        <For each={[0, 1, 2, 3, 4]}>
                            {(i) => (
                                <button
                                    class={`relative transition-all duration-150 ${
                                        canToggle()
                                            ? "cursor-pointer hover:scale-110 active:scale-95"
                                            : "cursor-default"
                                    } ${
                                        gameView()?.held[i]
                                            ? "-translate-y-2"
                                            : ""
                                    }`}
                                    onClick={() => {
                                        if (canToggle()) toggleHold(i);
                                    }}
                                    disabled={!canToggle()}
                                    data-testid={`yahtzee-die-${i}`}
                                    data-held={gameView()?.held[i] ? "true" : "false"}
                                    data-has-value={
                                        gameView()?.dice[i] && gameView()!.dice[i] > 0
                                            ? "true"
                                            : "false"
                                    }
                                >
                                    <Show
                                        when={
                                            gameView()?.dice[i] &&
                                            gameView()!.dice[i] > 0
                                        }
                                        fallback={
                                            <div class="w-[56px] h-[56px] rounded-lg border-2 border-dashed border-[#ddd5c4]/20" />
                                        }
                                    >
                                        <SvgDice
                                            side={
                                                gameView()!.dice[i] as
                                                    | 1
                                                    | 2
                                                    | 3
                                                    | 4
                                                    | 5
                                                    | 6
                                            }
                                            color={diceColor(i)}
                                            dotColor={diceDotColor(i)}
                                            size={56}
                                        />
                                    </Show>
                                    <Show when={gameView()?.held[i]}>
                                        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 font-bebas text-[.5rem] tracking-[.2em] text-[#ddd5c4]">
                                            HELD
                                        </div>
                                    </Show>
                                </button>
                            )}
                        </For>
                    </div>
                </Show>

                <Show when={gameView()?.canRoll}>
                    <button
                        class="font-bebas text-[1.2rem] tracking-[.12em] bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] px-8 py-2 shadow-[3px_3px_0_#3d1100] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#3d1100] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        onClick={roll}
                        data-testid="yahtzee-roll-button"
                    >
                        ROLL
                        <Show when={gameView()!.rollsLeft < 3}>
                            {" "}
                            ({gameView()!.rollsLeft} LEFT)
                        </Show>
                    </button>
                </Show>

                <Show
                    when={
                        gameView()?.mode === "lying" &&
                        gameView()?.phase !== "game_over" &&
                        !gameView()?.isMyTurn &&
                        !gameView()?.pendingClaim
                    }
                >
                    <span class="font-bebas text-[.7rem] tracking-[.18em] text-[#e8a87c] mt-1">
                        <span data-testid="yahtzee-hidden-roll-label">
                            OPPONENT ROLL IS HIDDEN
                        </span>
                    </span>
                </Show>

                <Show
                    when={
                        gameView() &&
                        !gameView()!.isMyTurn &&
                        gameView()!.phase !== "game_over" &&
                        !gameView()!.pendingClaim
                    }
                >
                    <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#e8a87c] mt-1">
                        <span data-testid="yahtzee-turn-label">
                            {currentPlayerName().toUpperCase()}'S TURN
                        </span>
                    </span>
                </Show>
            </div>

            <Show when={gameView()?.mode === "lying" && gameView()?.canClaim}>
                <div
                    class="mx-3 mb-3 border border-[#e8a87c]/20 bg-[#5c1a00]/60 px-4 py-3"
                    data-testid="yahtzee-claim-panel"
                >
                    <Show
                        when={selectedClaimCategory()}
                        fallback={
                            <div class="font-bebas text-[.8rem] tracking-[.16em] text-[#e8a87c]">
                                SELECT A SCORECARD SLOT TO MAKE YOUR CLAIM
                            </div>
                        }
                    >
                        <div class="flex items-center justify-between gap-3 flex-wrap mb-3">
                            <span class="font-bebas text-[.85rem] tracking-[.16em] text-[#ddd5c4]">
                                CLAIMING {CATEGORY_LABELS[selectedClaimCategory()!].toUpperCase()}
                            </span>
                            <span class="font-bebas text-[.8rem] tracking-[.14em] text-[#e8a87c]">
                                {claimPoints()} PTS
                            </span>
                        </div>
                        <div class="flex gap-3 mb-3 flex-wrap">
                            <For each={[0, 1, 2, 3, 4]}>
                                {(i) => (
                                    <button
                                        class="transition-transform hover:scale-105 active:scale-95"
                                        onClick={() => cycleClaimDie(i)}
                                    >
                                        <SvgDice
                                            side={
                                                claimedDice()[i] as
                                                    | 1
                                                    | 2
                                                    | 3
                                                    | 4
                                                    | 5
                                                    | 6
                                            }
                                            color="#ddd5c4"
                                            dotColor="#1a1a1a"
                                            size={48}
                                        />
                                    </button>
                                )}
                            </For>
                        </div>
                        <div class="flex gap-2 flex-wrap">
                                <button
                                    class="font-bebas text-[.72rem] tracking-[.16em] text-[#ddd5c4] border border-[#e8a87c]/30 px-3 py-1 hover:bg-[#e8a87c]/10 transition-colors"
                                    onClick={useRealRollForClaim}
                                    data-testid="yahtzee-use-real-roll-button"
                                >
                                    USE REAL ROLL
                                </button>
                                <button
                                    class="font-bebas text-[.82rem] tracking-[.16em] bg-[#ddd5c4] text-[#1a1a1a] border border-[#1a1a1a] px-4 py-1 hover:bg-white transition-colors"
                                    onClick={submitClaim}
                                    data-testid="yahtzee-send-claim-button"
                                >
                                    SEND CLAIM
                                </button>
                        </div>
                    </Show>
                </div>
            </Show>

            <Show when={gameView()?.pendingClaim}>
                <div
                    class="mx-3 mb-3 border border-[#e8a87c]/20 bg-[#5c1a00]/60 px-4 py-3"
                    data-testid="yahtzee-pending-claim"
                >
                    <div class="flex items-center justify-between gap-3 flex-wrap mb-2">
                        <span class="font-bebas text-[.9rem] tracking-[.16em] text-[#ddd5c4]">
                            {playerName(gameView()!.pendingClaim!.playerId)} CLAIMS{" "}
                            {CATEGORY_LABELS[gameView()!.pendingClaim!.category].toUpperCase()}
                        </span>
                        <span class="font-bebas text-[.82rem] tracking-[.16em] text-[#e8a87c]">
                            {gameView()!.pendingClaim!.claimedPoints} PTS
                        </span>
                    </div>
                    <div class="flex gap-3 mb-3">
                        <For each={gameView()!.pendingClaim!.claimedDice}>
                            {(die) => (
                                <SvgDice
                                    side={die as 1 | 2 | 3 | 4 | 5 | 6}
                                    color="#ddd5c4"
                                    dotColor="#1a1a1a"
                                    size={42}
                                />
                            )}
                        </For>
                    </div>
                    <Show
                        when={gameView()?.canAcceptClaim}
                        fallback={
                            <span class="font-bebas text-[.72rem] tracking-[.16em] text-[#e8a87c]">
                                WAITING FOR RESPONSE
                            </span>
                        }
                    >
                        <div class="flex gap-2 flex-wrap">
                            <button
                                class="font-bebas text-[.78rem] tracking-[.16em] bg-[#ddd5c4] text-[#1a1a1a] border border-[#1a1a1a] px-4 py-1 hover:bg-white transition-colors"
                                onClick={acceptClaim}
                                data-testid="yahtzee-believe-button"
                            >
                                BELIEVE
                            </button>
                            <button
                                class="font-bebas text-[.78rem] tracking-[.16em] text-[#c0261a] border border-[#c0261a]/40 px-4 py-1 hover:bg-[#c0261a]/10 transition-colors"
                                onClick={challengeClaim}
                                data-testid="yahtzee-liar-button"
                            >
                                LIAR
                            </button>
                        </div>
                    </Show>
                </div>
            </Show>

            <Show when={announcement()}>
                <div
                    class="text-center py-1 px-4 animate-fade-in"
                    style={{ "--fade-key": announcementKey() } as any}
                    data-testid="yahtzee-announcement"
                >
                    <span class="font-bebas text-[1.2rem] tracking-[.12em] text-[#ddd5c4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {announcement()}
                    </span>
                </div>
            </Show>

            <Show when={gameView()?.lastTurnReveal}>
                <div
                    class="mx-3 mb-3 border border-[#e8a87c]/20 bg-[#3d1100]/60 px-4 py-3"
                    data-testid="yahtzee-last-turn-reveal"
                >
                    <div class="flex items-center justify-between gap-3 flex-wrap mb-2">
                        <span class="font-bebas text-[.82rem] tracking-[.16em] text-[#ddd5c4]">
                            LAST TURN: {playerName(gameView()!.lastTurnReveal!.playerId)} ON{" "}
                            {CATEGORY_LABELS[gameView()!.lastTurnReveal!.category].toUpperCase()}
                        </span>
                        <span class="font-bebas text-[.72rem] tracking-[.16em] text-[#e8a87c]">
                            {revealOutcomeLabel(gameView()!.lastTurnReveal!.outcome)}
                        </span>
                    </div>
                    <div class="flex gap-6 flex-wrap">
                        <div>
                            <div class="font-bebas text-[.62rem] tracking-[.18em] text-[#e8a87c] mb-1">
                                CLAIMED ({gameView()!.lastTurnReveal!.claimedPoints} PTS)
                            </div>
                            <div class="flex gap-2">
                                <For each={gameView()!.lastTurnReveal!.claimedDice}>
                                    {(die) => (
                                        <SvgDice
                                            side={die as 1 | 2 | 3 | 4 | 5 | 6}
                                            color="#ddd5c4"
                                            dotColor="#1a1a1a"
                                            size={34}
                                        />
                                    )}
                                </For>
                            </div>
                        </div>
                        <div>
                            <div class="font-bebas text-[.62rem] tracking-[.18em] text-[#e8a87c] mb-1">
                                ACTUAL
                            </div>
                            <div class="flex gap-2">
                                <For each={gameView()!.lastTurnReveal!.actualDice}>
                                    {(die) => (
                                        <SvgDice
                                            side={die as 1 | 2 | 3 | 4 | 5 | 6}
                                            color="#8b7355"
                                            dotColor="white"
                                            size={34}
                                        />
                                    )}
                                </For>
                            </div>
                        </div>
                    </div>
                </div>
            </Show>

            <div class="flex-1 px-3 py-2 overflow-x-auto">
                <Show when={gameView()}>
                    <Scorecard
                        view={gameView()!}
                        myId={props.playerId}
                        canScore={gameView()!.canScore}
                        canClaim={gameView()!.canClaim}
                        selectedClaimCategory={selectedClaimCategory()}
                        claimedDice={claimedDice()}
                        onScore={score}
                        onSelectClaim={setSelectedClaimCategory}
                    />
                </Show>
            </div>

            <Show when={gameView()?.phase === "game_over"}>
                <div
                    class="px-4 py-4 bg-[#5c1a00]/80 border-t border-[#e8a87c]/20"
                    data-testid="yahtzee-game-over"
                >
                    <div class="flex flex-col items-center gap-3">
                        <span class="font-bebas text-[1.4rem] tracking-[.12em] text-[#ddd5c4]">
                            GAME OVER
                        </span>
                        <div class="flex flex-col gap-1 items-center">
                            <For each={[...gameView()!.players].sort((a, b) => b.totalScore - a.totalScore)}>
                                {(player) => (
                                    <div class="flex items-center gap-2">
                                        <span
                                            class={`font-bebas text-[.9rem] tracking-[.08em] ${
                                                gameView()!.winners?.includes(
                                                    player.id,
                                                )
                                                    ? "text-[#ffd700]"
                                                    : "text-[#ddd5c4]"
                                            }`}
                                        >
                                            {player.name.toUpperCase()}
                                        </span>
                                        <span class="font-bebas text-[.9rem] tracking-[.08em] text-[#e8a87c]">
                                            {player.totalScore}
                                        </span>
                                        <Show
                                            when={gameView()!.winners?.includes(
                                                player.id,
                                            )}
                                        >
                                            <span class="font-bebas text-[.7rem] tracking-[.15em] text-[#ffd700]">
                                                WINNER
                                            </span>
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </div>
                        <Show when={props.isHost}>
                            <button
                                class="font-bebas text-[.85rem] tracking-[.12em] text-[#ddd5c4] border border-[#e8a87c]/40 px-4 py-1 hover:bg-[#e8a87c]/10 transition-colors"
                                onClick={props.onReturnToLobby}
                                data-testid="yahtzee-return-button"
                            >
                                RETURN TO LOBBY
                            </button>
                        </Show>
                    </div>
                </div>
            </Show>
        </div>
    );
};

function revealOutcomeLabel(
    outcome: LyingTurnReveal["outcome"],
) {
    if (outcome === "caught_lying") return "CAUGHT LYING";
    if (outcome === "truthful_challenge") return "CHALLENGE FAILED";
    return "UNCONTESTED";
}

function Scorecard(props: {
    view: YahtzeePlayerView;
    myId: string | null;
    canScore: boolean;
    canClaim: boolean;
    selectedClaimCategory: ScoringCategory | null;
    claimedDice: Dice;
    onScore: (category: ScoringCategory) => void;
    onSelectClaim: (category: ScoringCategory) => void;
}) {
    const allPlayers = () => props.view.players;
    const isSuggestedCategory = (category: ScoringCategory): boolean =>
        props.view.mode === "standard" &&
        props.canScore &&
        props.view.suggestedCategories.includes(category);

    const cellClass = (
        playerId: string,
        category: ScoringCategory,
    ): string => {
        const base = "font-karla text-[.75rem] text-center px-2 py-1 ";
        const player = allPlayers().find((p) => p.id === playerId);
        if (!player) return base + "text-[#ddd5c4]/30";

        const filled = player.scorecard[category] !== undefined;
        if (filled) return base + "text-[#ddd5c4]";

        if (props.view.mode === "standard") {
            if (
                playerId === props.myId &&
                props.canScore &&
                props.view.potentialScores
            ) {
                const potential = props.view.potentialScores[category];
                if (potential !== undefined && potential > 0) {
                    const suggested = isSuggestedCategory(category);
                    return (
                        base +
                        (suggested
                            ? "text-[#ffd700] bg-[#7a2b00]/45 shadow-[inset_0_0_0_1px_rgba(255,215,0,0.45)] cursor-pointer hover:bg-[#7a2b00]/65 transition-colors"
                            : "text-[#e8a87c]/70 cursor-pointer hover:text-[#ffd700] hover:bg-[#5c1a00]/40 transition-colors")
                    );
                }
                return (
                    base +
                    "text-[#ddd5c4]/20 cursor-pointer hover:text-[#ddd5c4]/40 hover:bg-[#5c1a00]/40 transition-colors"
                );
            }

            return base + "text-[#ddd5c4]/10";
        }

        if (playerId === props.myId && props.canClaim) {
            if (props.selectedClaimCategory === category) {
                return (
                    base +
                    "text-[#ffd700] cursor-pointer bg-[#5c1a00]/50 hover:bg-[#5c1a00]/70 transition-colors"
                );
            }
            const potential = calculateScore(props.claimedDice, category);
            if (potential > 0) {
                return (
                    base +
                    "text-[#e8a87c]/70 cursor-pointer hover:text-[#ffd700] hover:bg-[#5c1a00]/40 transition-colors"
                );
            }
            return (
                base +
                "text-[#ddd5c4]/20 cursor-pointer hover:text-[#ddd5c4]/40 hover:bg-[#5c1a00]/40 transition-colors"
            );
        }

        return base + "text-[#ddd5c4]/10";
    };

    const cellValue = (
        playerId: string,
        category: ScoringCategory,
    ): string => {
        const player = allPlayers().find((p) => p.id === playerId);
        if (!player) return "";

        const filled = player.scorecard[category] !== undefined;
        if (filled) return String(player.scorecard[category]);

        if (props.view.mode === "standard") {
            if (
                playerId === props.myId &&
                props.canScore &&
                props.view.potentialScores
            ) {
                const potential = props.view.potentialScores[category];
                if (potential !== undefined) return String(potential);
            }
            return "";
        }

        if (playerId === props.myId && props.canClaim) {
            return String(calculateScore(props.claimedDice, category));
        }

        return "";
    };

    const handleCellClick = (
        playerId: string,
        category: ScoringCategory,
    ) => {
        if (playerId !== props.myId) return;
        const player = allPlayers().find((p) => p.id === playerId);
        if (!player) return;
        if (player.scorecard[category] !== undefined) return;

        if (props.view.mode === "standard") {
            if (!props.canScore) return;
            props.onScore(category);
            return;
        }

        if (!props.canClaim) return;
        props.onSelectClaim(category);
    };

    return (
        <div class="overflow-x-auto">
            <table
                class="w-full border-collapse min-w-[320px]"
                data-testid="yahtzee-scorecard"
            >
                <thead>
                    <tr class="border-b border-[#e8a87c]/20">
                        <th class="font-bebas text-[.6rem] tracking-[.2em] text-[#e8a87c] text-left px-2 py-1 w-[100px]" />
                        <For each={allPlayers()}>
                            {(player) => (
                                <th
                                    class={`font-bebas text-[.6rem] tracking-[.15em] text-center px-2 py-1 min-w-[55px] ${
                                        player.id === props.view.currentPlayerId
                                            ? "text-[#ddd5c4]"
                                            : "text-[#e8a87c]/70"
                                    }`}
                                >
                                    {player.name.toUpperCase().slice(0, 8)}
                                </th>
                            )}
                        </For>
                    </tr>
                </thead>
                <tbody>
                    <For each={UPPER_CATEGORIES}>
                        {(cat) => (
                            <tr class="border-b border-[#e8a87c]/10">
                                <td class="font-bebas text-[.6rem] tracking-[.15em] text-[#e8a87c] px-2 py-1">
                                    {CATEGORY_LABELS[cat]}
                                </td>
                                <For each={allPlayers()}>
                                    {(player) => (
                                        <td
                                            class={cellClass(player.id, cat)}
                                            onClick={() =>
                                                handleCellClick(player.id, cat)
                                            }
                                            data-testid={`scorecard-cell-${player.id}-${cat}`}
                                            data-player-id={player.id}
                                            data-category={cat}
                                            data-suggested={
                                                player.id === props.myId &&
                                                isSuggestedCategory(cat)
                                                    ? "true"
                                                    : "false"
                                            }
                                            data-selected-claim={
                                                player.id === props.myId &&
                                                props.selectedClaimCategory === cat
                                                    ? "true"
                                                    : "false"
                                            }
                                        >
                                            {cellValue(player.id, cat)}
                                        </td>
                                    )}
                                </For>
                            </tr>
                        )}
                    </For>

                    <tr class="border-b-2 border-[#e8a87c]/30">
                        <td class="font-bebas text-[.55rem] tracking-[.15em] text-[#e8a87c]/60 px-2 py-1">
                            UPPER ({UPPER_BONUS_THRESHOLD} FOR BONUS)
                        </td>
                        <For each={allPlayers()}>
                            {(player) => (
                                <td
                                    class={`font-karla text-[.7rem] text-center px-2 py-1 ${
                                        player.upperTotal >=
                                        UPPER_BONUS_THRESHOLD
                                            ? "text-[#ffd700]"
                                            : "text-[#e8a87c]/50"
                                    }`}
                                >
                                    {player.upperTotal}
                                    <Show when={player.upperBonus > 0}>
                                        {" "}
                                        +{player.upperBonus}
                                    </Show>
                                </td>
                            )}
                        </For>
                    </tr>

                    <For each={LOWER_CATEGORIES}>
                        {(cat) => (
                            <tr class="border-b border-[#e8a87c]/10">
                                <td class="font-bebas text-[.6rem] tracking-[.15em] text-[#e8a87c] px-2 py-1">
                                    {CATEGORY_LABELS[cat]}
                                </td>
                                <For each={allPlayers()}>
                                    {(player) => (
                                        <td
                                            class={cellClass(player.id, cat)}
                                            onClick={() =>
                                                handleCellClick(player.id, cat)
                                            }
                                            data-testid={`scorecard-cell-${player.id}-${cat}`}
                                            data-player-id={player.id}
                                            data-category={cat}
                                            data-suggested={
                                                player.id === props.myId &&
                                                isSuggestedCategory(cat)
                                                    ? "true"
                                                    : "false"
                                            }
                                            data-selected-claim={
                                                player.id === props.myId &&
                                                props.selectedClaimCategory === cat
                                                    ? "true"
                                                    : "false"
                                            }
                                        >
                                            {cellValue(player.id, cat)}
                                        </td>
                                    )}
                                </For>
                            </tr>
                        )}
                    </For>

                    <tr class="border-b border-[#e8a87c]/10">
                        <td class="font-bebas text-[.55rem] tracking-[.15em] text-[#e8a87c]/60 px-2 py-1">
                            YAHTZEE BONUS
                        </td>
                        <For each={allPlayers()}>
                            {(player) => (
                                <td class="font-karla text-[.7rem] text-center px-2 py-1 text-[#ffd700]">
                                    <Show when={player.yahtzeeBonus > 0}>
                                        +{player.yahtzeeBonus * 100}
                                    </Show>
                                </td>
                            )}
                        </For>
                    </tr>

                    <tr class="border-b border-[#e8a87c]/10">
                        <td class="font-bebas text-[.55rem] tracking-[.15em] text-[#e8a87c]/60 px-2 py-1">
                            PENALTIES
                        </td>
                        <For each={allPlayers()}>
                            {(player) => (
                                <td class="font-karla text-[.7rem] text-center px-2 py-1 text-[#c0261a]">
                                    <Show when={player.penaltyPoints > 0}>
                                        -{player.penaltyPoints}
                                    </Show>
                                </td>
                            )}
                        </For>
                    </tr>

                    <tr class="border-t-2 border-[#e8a87c]/40">
                        <td class="font-bebas text-[.7rem] tracking-[.15em] text-[#ddd5c4] px-2 py-1.5">
                            TOTAL
                        </td>
                        <For each={allPlayers()}>
                            {(player) => (
                                <td class="font-bebas text-[.9rem] text-center px-2 py-1.5 text-[#ddd5c4]">
                                    {player.totalScore}
                                </td>
                            )}
                        </For>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
