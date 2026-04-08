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
import type { YahtzeePlayerView, YahtzeePlayerInfo } from "~/game/yahtzee";
import {
    SCORING_CATEGORIES,
    UPPER_CATEGORIES,
    LOWER_CATEGORIES,
    CATEGORY_LABELS,
    UPPER_BONUS_THRESHOLD,
} from "~/game/yahtzee";
import type { ScoringCategory } from "~/game/yahtzee";

interface YahtzeeRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    ws: WebSocket;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

export const YahtzeeRoom: Component<YahtzeeRoomProps> = (props) => {
    const [gameView, setGameView] = createSignal<YahtzeePlayerView | null>(
        null,
    );
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [announcementKey, setAnnouncementKey] = createSignal(0);

    const showAnnouncement = (text: string) => {
        setAnnouncement(null);
        setAnnouncementKey((k) => k + 1);
        setTimeout(() => {
            setAnnouncement(text);
        }, 30);
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
                const name = playerName(d.playerId);
                showAnnouncement(`${name} ROLLED`);
            }
            if (d.type === "scored") {
                const name = playerName(d.playerId);
                const catLabel =
                    CATEGORY_LABELS[d.category as ScoringCategory] ??
                    d.category;
                showAnnouncement(`${name}: ${catLabel} FOR ${d.points}`);
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

    const playerName = (id: string) => {
        const view = gameView();
        if (!view) return "SOMEONE";
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

    return (
        <div class="min-h-screen bg-[#8b2500] font-karla flex flex-col">
            {/* Top bar */}
            <div class="flex items-center justify-between px-4 py-2 bg-[#5c1a00] border-b-[3px] border-[#3d1100]">
                <div class="flex items-center gap-3">
                    <span class="font-bebas text-[1.1rem] tracking-[.12em] text-[#ddd5c4]">
                        YAHTZEE
                    </span>
                    <Show when={gameView()}>
                        <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#e8a87c]">
                            ROUND {gameView()!.round} / 13
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-3">
                    <Show when={me()}>
                        <span class="font-bebas text-[.8rem] tracking-[.1em] text-[#ddd5c4]">
                            {me()!.totalScore} PTS
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

            {/* Dice area */}
            <div class="flex flex-col items-center pt-5 pb-3">
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

                {/* Roll button */}
                <Show when={gameView()?.canRoll}>
                    <button
                        class="font-bebas text-[1.2rem] tracking-[.12em] bg-[#ddd5c4] text-[#1a1a1a] border-2 border-[#1a1a1a] px-8 py-2 shadow-[3px_3px_0_#3d1100] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#3d1100] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        onClick={roll}
                    >
                        ROLL
                        <Show when={gameView()!.rollsLeft < 3}>
                            {" "}
                            ({gameView()!.rollsLeft} LEFT)
                        </Show>
                    </button>
                </Show>

                {/* Waiting message */}
                <Show
                    when={
                        gameView() &&
                        !gameView()!.isMyTurn &&
                        gameView()!.phase !== "game_over"
                    }
                >
                    <span class="font-bebas text-[.8rem] tracking-[.2em] text-[#e8a87c] mt-1">
                        {currentPlayerName().toUpperCase()}'S TURN
                    </span>
                </Show>
            </div>

            {/* Announcement */}
            <Show when={announcement()}>
                <div
                    class="text-center py-1 px-4 animate-fade-in"
                    style={{ "--fade-key": announcementKey() } as any}
                >
                    <span class="font-bebas text-[1.2rem] tracking-[.12em] text-[#ddd5c4] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                        {announcement()}
                    </span>
                </div>
            </Show>

            {/* Scorecard */}
            <div class="flex-1 px-3 py-2 overflow-x-auto">
                <Show when={gameView()}>
                    <Scorecard
                        view={gameView()!}
                        myId={props.playerId}
                        canScore={gameView()!.canScore}
                        onScore={score}
                    />
                </Show>
            </div>

            {/* Game over */}
            <Show when={gameView()?.phase === "game_over"}>
                <div class="px-4 py-4 bg-[#5c1a00]/80 border-t border-[#e8a87c]/20">
                    <div class="flex flex-col items-center gap-3">
                        <span class="font-bebas text-[1.4rem] tracking-[.12em] text-[#ddd5c4]">
                            GAME OVER
                        </span>
                        <div class="flex flex-col gap-1 items-center">
                            <For each={gameView()!.players.sort((a, b) => b.totalScore - a.totalScore)}>
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

function Scorecard(props: {
    view: YahtzeePlayerView;
    myId: string | null;
    canScore: boolean;
    onScore: (category: ScoringCategory) => void;
}) {
    const allPlayers = () => props.view.players;

    const cellClass = (
        playerId: string,
        category: ScoringCategory,
    ): string => {
        const base = "font-karla text-[.75rem] text-center px-2 py-1 ";
        const player = allPlayers().find((p) => p.id === playerId);
        if (!player) return base + "text-[#ddd5c4]/30";

        const filled = player.scorecard[category] !== undefined;
        if (filled) return base + "text-[#ddd5c4]";

        if (
            playerId === props.myId &&
            props.canScore &&
            props.view.potentialScores
        ) {
            const potential = props.view.potentialScores[category];
            if (potential !== undefined && potential > 0) {
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

        if (
            playerId === props.myId &&
            props.canScore &&
            props.view.potentialScores
        ) {
            const potential = props.view.potentialScores[category];
            if (potential !== undefined) return String(potential);
        }

        return "";
    };

    const handleCellClick = (
        playerId: string,
        category: ScoringCategory,
    ) => {
        if (playerId !== props.myId) return;
        if (!props.canScore) return;
        const player = allPlayers().find((p) => p.id === playerId);
        if (!player) return;
        if (player.scorecard[category] !== undefined) return;
        props.onScore(category);
    };

    return (
        <div class="overflow-x-auto">
            <table class="w-full border-collapse min-w-[320px]">
                <thead>
                    <tr class="border-b border-[#e8a87c]/20">
                        <th class="font-bebas text-[.6rem] tracking-[.2em] text-[#e8a87c] text-left px-2 py-1 w-[100px]" />
                        <For each={allPlayers()}>
                            {(player) => (
                                <th
                                    class={`font-bebas text-[.6rem] tracking-[.15em] text-center px-2 py-1 min-w-[55px] ${
                                        player.id ===
                                        props.view.currentPlayerId
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
                                        >
                                            {cellValue(player.id, cat)}
                                        </td>
                                    )}
                                </For>
                            </tr>
                        )}
                    </For>

                    {/* Upper section subtotal */}
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
                                        >
                                            {cellValue(player.id, cat)}
                                        </td>
                                    )}
                                </For>
                            </tr>
                        )}
                    </For>

                    {/* Yahtzee bonus row */}
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

                    {/* Total */}
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
