import {
    createSignal,
    createMemo,
    For,
    Show,
    Switch,
    Match,
    onCleanup,
} from "solid-js";
import type { Component } from "solid-js";
import type {
    RpsPlayerView,
    RpsMatchView,
    RpsRoundView,
    RpsThrowView,
} from "~/game/rps";
import type { RpsChoice, BestOf } from "~/game/rps";
import { getRoundLabel } from "~/game/rps";
import type { RpsConnection } from "~/game/rps/connection";

interface RpsRoomProps {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: RpsConnection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const CHOICE_LABEL: Record<RpsChoice, string> = {
    rock: "ROCK",
    paper: "PAPER",
    scissors: "SCISSORS",
};

export const RpsRoom: Component<RpsRoomProps> = (props) => {
    const gameView = () => props.connection.view();
    const [announcement, setAnnouncement] = createSignal<string | null>(null);
    const [announcementKey, setAnnouncementKey] = createSignal(0);

    const showAnnouncement = (text: string) => {
        setAnnouncement(null);
        setAnnouncementKey((k) => k + 1);
        setTimeout(() => setAnnouncement(text), 30);
    };

    const playerName = (id: string) => {
        const view = gameView();
        if (!view) return "SOMEONE";
        return (
            view.players.find((p) => p.id === id)?.name?.toUpperCase() ??
            "SOMEONE"
        );
    };

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "rps:action") {
                const d = event.data as Record<string, any>;
                if (d.type === "round_advanced") {
                    showAnnouncement(
                        getRoundLabel(
                            d.roundNumber,
                            gameView()?.totalRounds ?? 1,
                        ),
                    );
                }
                if (d.type === "best_of_changed") {
                    showAnnouncement(`BEST OF ${d.bestOf}`);
                }
            }

            if (event.type === "rps:game_over") {
                const winnerId = (event.data as { winnerId?: string })
                    .winnerId;
                if (winnerId) {
                    showAnnouncement(
                        `${playerName(winnerId)} WINS THE TOURNAMENT!`,
                    );
                }
            }
        }),
    );

    const throwChoice = (choice: RpsChoice) => {
        props.connection.send({ type: "rps:throw", data: { choice } });
    };

    const nextRound = () => {
        props.connection.send({ type: "rps:next_round", data: {} });
    };

    const setBestOf = (bo: BestOf) => {
        props.connection.send({ type: "rps:set_best_of", data: { bestOf: bo } });
    };

    const myMatch = createMemo(() => gameView()?.myMatch ?? null);
    const phase = createMemo(() => gameView()?.phase ?? "throwing");
    const currentRound = createMemo(() => gameView()?.currentRound ?? 1);
    const bestOf = createMemo(() => gameView()?.bestOf ?? 3);
    const totalRounds = createMemo(() => gameView()?.totalRounds ?? 1);

    const currentRoundView = createMemo(() => {
        const view = gameView();
        if (!view) return null;
        return (
            view.rounds.find((r) => r.roundNumber === view.currentRound) ??
            null
        );
    });

    const hasBye = createMemo(() => {
        const round = currentRoundView();
        return round?.byePlayer?.id === props.playerId;
    });

    const isEliminated = createMemo(() => {
        const view = gameView();
        if (!view) return false;
        const me = view.players.find((p) => p.id === props.playerId);
        return me?.eliminated ?? false;
    });

    const matchComplete = createMemo(() => {
        const m = myMatch();
        return m?.status === "complete";
    });

    const lastThrow = createMemo<RpsThrowView | null>(() => {
        const m = myMatch();
        if (!m || m.throws.length === 0) return null;
        return m.throws[m.throws.length - 1];
    });

    return (
        <div class="min-h-screen bg-[#12121e] font-karla flex flex-col">
            <div class="flex items-center justify-between px-4 py-3 bg-[#0c0c18] border-b-2 border-[#e8c547]/40">
                <div class="flex items-center gap-3">
                    <span class="font-bebas text-[1.1rem] tracking-[.12em] text-[#e8c547]">
                        RPS TOURNAMENT
                    </span>
                    <Show when={gameView()}>
                        <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#e8e0d0]/60">
                            {getRoundLabel(currentRound(), totalRounds())}
                        </span>
                    </Show>
                </div>
                <div class="flex items-center gap-3">
                    <Show
                        when={props.isHost}
                        fallback={
                            <span class="font-bebas text-[.65rem] tracking-[.15em] text-[#e8e0d0]/40">
                                BO{bestOf()}
                            </span>
                        }
                    >
                        <BestOfSelector
                            current={bestOf()}
                            onChange={setBestOf}
                        />
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
                    <span class="font-bebas text-[1.4rem] tracking-[.12em] text-[#e8c547] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {announcement()}
                    </span>
                </div>
            </Show>

            <div class="flex-1 px-4 py-4 flex flex-col gap-4 overflow-y-auto">
                <Switch>
                    <Match when={phase() === "tournament_over" && gameView()}>
                        <TournamentOverScreen
                            view={gameView()!}
                            playerName={playerName}
                            onReturnToLobby={props.onReturnToLobby}
                            isHost={props.isHost}
                        />
                    </Match>
                    <Match
                        when={
                            phase() === "round_results" && currentRoundView()
                        }
                    >
                        <RoundResultsScreen
                            round={currentRoundView()!}
                            playerName={playerName}
                            isHost={props.isHost}
                            onNextRound={nextRound}
                        />
                    </Match>
                    <Match
                        when={
                            phase() === "throwing" &&
                            myMatch() &&
                            !matchComplete()
                        }
                    >
                        <ActiveMatchScreen
                            match={myMatch()!}
                            playerId={props.playerId ?? ""}
                            bestOf={bestOf()}
                            onThrow={throwChoice}
                            lastThrow={lastThrow()}
                            roundLabel={getRoundLabel(
                                currentRound(),
                                totalRounds(),
                            )}
                        />
                    </Match>
                    <Match when={phase() === "throwing" && matchComplete()}>
                        <MatchCompleteWaiting
                            match={myMatch()!}
                            playerId={props.playerId ?? ""}
                        />
                    </Match>
                    <Match when={phase() === "throwing" && hasBye()}>
                        <ByeScreen />
                    </Match>
                    <Match when={isEliminated()}>
                        <EliminatedScreen />
                    </Match>
                </Switch>

                <Show when={gameView()}>
                    <BracketDisplay
                        rounds={gameView()!.rounds}
                        totalRounds={totalRounds()}
                        currentRound={currentRound()}
                        playerId={props.playerId ?? ""}
                    />
                </Show>
            </div>
        </div>
    );
};

function BestOfSelector(props: {
    current: BestOf;
    onChange: (bo: BestOf) => void;
}) {
    return (
        <div class="flex gap-1">
            <For each={[1, 3, 5] as BestOf[]}>
                {(bo) => (
                    <button
                        class={`font-bebas text-[.65rem] tracking-[.1em] px-2 py-0.5 transition-all ${
                            props.current === bo
                                ? "bg-[#e8c547] text-[#12121e]"
                                : "text-[#e8e0d0]/50 border border-[#e8e0d0]/20 hover:border-[#e8c547]/40"
                        }`}
                        onClick={() => props.onChange(bo)}
                    >
                        BO{bo}
                    </button>
                )}
            </For>
        </div>
    );
}

function ActiveMatchScreen(props: {
    match: RpsMatchView;
    playerId: string;
    bestOf: BestOf;
    onThrow: (choice: RpsChoice) => void;
    lastThrow: RpsThrowView | null;
    roundLabel: string;
}) {
    const isP1 = () => props.match.player1.id === props.playerId;
    const opponent = () =>
        isP1() ? props.match.player2 : props.match.player1;
    const myWins = () =>
        isP1() ? props.match.player1Wins : props.match.player2Wins;
    const oppWins = () =>
        isP1() ? props.match.player2Wins : props.match.player1Wins;
    const myChoice = () => props.match.myChoice;
    const needsToThrow = () => !myChoice() && props.match.status === "active";
    const needed = () => Math.ceil(props.bestOf / 2);

    const lastThrowResult = () => {
        if (!props.lastThrow) return null;
        const myC = isP1()
            ? props.lastThrow.player1Choice
            : props.lastThrow.player2Choice;
        const oppC = isP1()
            ? props.lastThrow.player2Choice
            : props.lastThrow.player1Choice;
        const won = props.lastThrow.winnerId === props.playerId;
        const draw = props.lastThrow.winnerId === null;
        return { myChoice: myC, oppChoice: oppC, won, draw };
    };

    return (
        <div class="flex flex-col items-center gap-5 py-4">
            <div class="font-bebas text-[.7rem] tracking-[.22em] text-[#e8c547]/70">
                {props.roundLabel}
            </div>

            <div class="flex items-center gap-4">
                <span class="font-karla text-[1rem] text-[#e8e0d0]">YOU</span>
                <div class="flex items-center gap-2">
                    <ScoreDisplay
                        wins={myWins()}
                        needed={needed()}
                        color="#4caf50"
                    />
                    <span class="font-bebas text-[.9rem] text-[#e8e0d0]/40">
                        vs
                    </span>
                    <ScoreDisplay
                        wins={oppWins()}
                        needed={needed()}
                        color="#c0261a"
                    />
                </div>
                <span class="font-karla text-[1rem] text-[#e8e0d0]">
                    {opponent().name.toUpperCase()}
                </span>
            </div>

            <Show when={lastThrowResult()}>
                {(result) => (
                    <div
                        class={`border-2 rounded-lg px-6 py-3 text-center ${
                            result().draw
                                ? "border-[#e8e0d0]/30 bg-[#1a1a2e]"
                                : result().won
                                  ? "border-[#4caf50]/40 bg-[#4caf50]/10"
                                  : "border-[#c0261a]/40 bg-[#c0261a]/10"
                        }`}
                    >
                        <div class="flex items-center justify-center gap-4 mb-1">
                            <span class="font-bebas text-[1.2rem] tracking-[.08em] text-[#e8e0d0]">
                                {CHOICE_LABEL[result().myChoice]}
                            </span>
                            <span class="font-bebas text-[.8rem] text-[#e8e0d0]/40">
                                vs
                            </span>
                            <span class="font-bebas text-[1.2rem] tracking-[.08em] text-[#e8e0d0]">
                                {CHOICE_LABEL[result().oppChoice]}
                            </span>
                        </div>
                        <span
                            class={`font-bebas text-[.75rem] tracking-[.2em] ${
                                result().draw
                                    ? "text-[#e8e0d0]/60"
                                    : result().won
                                      ? "text-[#4caf50]"
                                      : "text-[#c0261a]"
                            }`}
                        >
                            {result().draw
                                ? "DRAW — THROW AGAIN"
                                : result().won
                                  ? "YOU WIN THIS THROW"
                                  : "YOU LOSE THIS THROW"}
                        </span>
                    </div>
                )}
            </Show>

            <Show when={needsToThrow()}>
                <div class="flex flex-col items-center gap-3">
                    <span class="font-bebas text-[.8rem] tracking-[.18em] text-[#e8e0d0]/70">
                        MAKE YOUR THROW
                    </span>
                    <div class="flex gap-3">
                        <For each={["rock", "paper", "scissors"] as RpsChoice[]}>
                            {(choice) => (
                                <button
                                    class="font-bebas text-[1.1rem] tracking-[.1em] bg-[#e8c547] text-[#12121e] border-2 border-[#12121e] px-5 py-3 shadow-[3px_3px_0_#2a2a4e] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#2a2a4e] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                                    onClick={() => props.onThrow(choice)}
                                >
                                    {CHOICE_LABEL[choice]}
                                </button>
                            )}
                        </For>
                    </div>
                </div>
            </Show>

            <Show when={myChoice()}>
                <div class="flex flex-col items-center gap-2 py-3">
                    <div class="flex items-center gap-2">
                        <span class="font-bebas text-[1rem] tracking-[.1em] text-[#e8c547]">
                            {CHOICE_LABEL[myChoice()!]}
                        </span>
                    </div>
                    <Show
                        when={props.match.opponentHasThrown}
                        fallback={
                            <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#e8e0d0]/40 animate-pulse">
                                WAITING FOR OPPONENT...
                            </span>
                        }
                    >
                        <span class="font-bebas text-[.75rem] tracking-[.15em] text-[#e8e0d0]/40">
                            RESOLVING...
                        </span>
                    </Show>
                </div>
            </Show>
        </div>
    );
}

function ScoreDisplay(props: { wins: number; needed: number; color: string }) {
    return (
        <div class="flex gap-1">
            <For each={Array.from({ length: props.needed })}>
                {(_, i) => (
                    <div
                        class="w-3 h-3 rounded-full border"
                        style={{
                            "background-color":
                                i() < props.wins ? props.color : "transparent",
                            "border-color": props.color,
                            opacity: i() < props.wins ? 1 : 0.3,
                        }}
                    />
                )}
            </For>
        </div>
    );
}

function MatchCompleteWaiting(props: {
    match: RpsMatchView;
    playerId: string;
}) {
    const won = () => props.match.winnerId === props.playerId;
    const isP1 = () => props.match.player1.id === props.playerId;
    const opponent = () =>
        isP1() ? props.match.player2 : props.match.player1;

    return (
        <div class="flex flex-col items-center gap-4 py-8">
            <span
                class={`font-bebas text-[1.5rem] tracking-[.1em] ${
                    won() ? "text-[#4caf50]" : "text-[#c0261a]"
                }`}
            >
                {won() ? "YOU WIN!" : "YOU LOSE"}
            </span>
            <span class="font-karla text-[.9rem] text-[#e8e0d0]/60">
                vs {opponent().name}
            </span>
            <span class="font-bebas text-[.7rem] tracking-[.15em] text-[#e8e0d0]/40 animate-pulse">
                WAITING FOR OTHER MATCHES...
            </span>
        </div>
    );
}

function ByeScreen() {
    return (
        <div class="flex flex-col items-center gap-3 py-8">
            <span class="font-bebas text-[1.2rem] tracking-[.12em] text-[#e8c547]">
                BYE
            </span>
            <span class="font-karla text-[.9rem] text-[#e8e0d0]/60">
                You advance automatically this round
            </span>
            <span class="font-bebas text-[.7rem] tracking-[.15em] text-[#e8e0d0]/40 animate-pulse">
                WAITING FOR OTHER MATCHES...
            </span>
        </div>
    );
}

function EliminatedScreen() {
    return (
        <div class="flex flex-col items-center gap-3 py-8">
            <span class="font-bebas text-[1.2rem] tracking-[.12em] text-[#c0261a]">
                ELIMINATED
            </span>
            <span class="font-karla text-[.9rem] text-[#e8e0d0]/60">
                Watch the remaining matches below
            </span>
        </div>
    );
}

function RoundResultsScreen(props: {
    round: RpsRoundView;
    playerName: (id: string) => string;
    isHost: boolean;
    onNextRound: () => void;
}) {
    return (
        <div class="flex flex-col items-center gap-4 py-4">
            <span class="font-bebas text-[1.2rem] tracking-[.15em] text-[#e8c547]">
                {props.round.label} RESULTS
            </span>
            <div class="w-full max-w-md space-y-2">
                <For each={props.round.matches}>
                    {(match) => <MatchResultCard match={match} />}
                </For>
                <Show when={props.round.byePlayer}>
                    <div class="flex items-center justify-center px-4 py-2 bg-[#1a1a2e] border border-[#e8e0d0]/10 rounded">
                        <span class="font-karla text-[.85rem] text-[#e8e0d0]/60">
                            {props.round.byePlayer!.name} — BYE
                        </span>
                    </div>
                </Show>
            </div>
            <Show
                when={props.isHost}
                fallback={
                    <span class="font-bebas text-[.7rem] tracking-[.15em] text-[#e8e0d0]/40 animate-pulse">
                        WAITING FOR HOST...
                    </span>
                }
            >
                <button
                    class="font-bebas text-[1rem] tracking-[.14em] bg-[#e8c547] text-[#12121e] border-2 border-[#12121e] px-8 py-3 shadow-[3px_3px_0_#2a2a4e] transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#2a2a4e] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none mt-2"
                    onClick={props.onNextRound}
                >
                    NEXT ROUND
                </button>
            </Show>
        </div>
    );
}

function MatchResultCard(props: { match: RpsMatchView }) {
    return (
        <div class="flex items-center justify-between px-4 py-3 bg-[#1a1a2e] border border-[#e8e0d0]/10 rounded">
            <span
                class={`font-karla text-[.9rem] flex-1 ${
                    props.match.winnerId === props.match.player1.id
                        ? "text-[#e8c547] font-bold"
                        : "text-[#e8e0d0]/60"
                }`}
            >
                {props.match.player1.name}
            </span>
            <span class="font-bebas text-[.9rem] tracking-[.1em] text-[#e8e0d0]/40 px-3">
                {props.match.player1Wins} — {props.match.player2Wins}
            </span>
            <span
                class={`font-karla text-[.9rem] flex-1 text-right ${
                    props.match.winnerId === props.match.player2.id
                        ? "text-[#e8c547] font-bold"
                        : "text-[#e8e0d0]/60"
                }`}
            >
                {props.match.player2.name}
            </span>
        </div>
    );
}

function TournamentOverScreen(props: {
    view: RpsPlayerView;
    playerName: (id: string) => string;
    onReturnToLobby: () => void;
    isHost: boolean;
}) {
    const winnerName = () =>
        props.view.winnerId
            ? props.playerName(props.view.winnerId)
            : "NOBODY";

    return (
        <div class="flex flex-col items-center gap-4 py-8">
            <span class="font-bebas text-[.8rem] tracking-[.25em] text-[#e8c547]/60">
                TOURNAMENT CHAMPION
            </span>
            <span class="font-bebas text-[2.2rem] tracking-[.1em] text-[#e8c547]">
                {winnerName()}
            </span>
            <Show when={props.isHost}>
                <button
                    class="font-bebas text-[.9rem] tracking-[.12em] text-[#e8e0d0] border border-[#e8c547]/40 px-5 py-2 hover:bg-[#e8c547]/10 transition-colors mt-4"
                    onClick={props.onReturnToLobby}
                >
                    RETURN TO LOBBY
                </button>
            </Show>
        </div>
    );
}

function BracketDisplay(props: {
    rounds: RpsRoundView[];
    totalRounds: number;
    currentRound: number;
    playerId: string;
}) {
    return (
        <div class="mt-4 border-t border-[#e8e0d0]/10 pt-4">
            <div class="font-bebas text-[.7rem] tracking-[.2em] text-[#e8e0d0]/40 mb-3">
                BRACKET
            </div>
            <div class="space-y-3">
                <For each={props.rounds}>
                    {(round) => (
                        <div>
                            <div
                                class={`font-bebas text-[.65rem] tracking-[.18em] mb-1.5 ${
                                    round.roundNumber === props.currentRound
                                        ? "text-[#e8c547]"
                                        : "text-[#e8e0d0]/30"
                                }`}
                            >
                                {round.label}
                            </div>
                            <div class="space-y-1">
                                <For each={round.matches}>
                                    {(match) => {
                                        const isMyMatch =
                                            match.player1.id ===
                                                props.playerId ||
                                            match.player2.id ===
                                                props.playerId;
                                        return (
                                            <div
                                                class={`flex items-center gap-2 px-3 py-1.5 rounded text-[.8rem] ${
                                                    isMyMatch
                                                        ? "bg-[#e8c547]/10 border border-[#e8c547]/20"
                                                        : "bg-[#1a1a2e]/50"
                                                }`}
                                            >
                                                <span
                                                    class={`font-karla flex-1 ${
                                                        match.winnerId ===
                                                        match.player1.id
                                                            ? "text-[#e8c547]"
                                                            : match.winnerId &&
                                                                match.winnerId !==
                                                                    match
                                                                        .player1
                                                                        .id
                                                              ? "text-[#e8e0d0]/30 line-through"
                                                              : "text-[#e8e0d0]/70"
                                                    }`}
                                                >
                                                    {match.player1.name}
                                                </span>
                                                <span class="font-bebas text-[.7rem] text-[#e8e0d0]/30">
                                                    {match.player1Wins}—
                                                    {match.player2Wins}
                                                </span>
                                                <span
                                                    class={`font-karla flex-1 text-right ${
                                                        match.winnerId ===
                                                        match.player2.id
                                                            ? "text-[#e8c547]"
                                                            : match.winnerId &&
                                                                match.winnerId !==
                                                                    match
                                                                        .player2
                                                                        .id
                                                              ? "text-[#e8e0d0]/30 line-through"
                                                              : "text-[#e8e0d0]/70"
                                                    }`}
                                                >
                                                    {match.player2.name}
                                                </span>
                                                <Show
                                                    when={
                                                        match.status ===
                                                        "active"
                                                    }
                                                >
                                                    <span class="font-bebas text-[.55rem] tracking-[.1em] text-[#e8c547]/60 ml-1">
                                                        LIVE
                                                    </span>
                                                </Show>
                                            </div>
                                        );
                                    }}
                                </For>
                                <Show when={round.byePlayer}>
                                    <div class="flex items-center gap-2 px-3 py-1 text-[.75rem]">
                                        <span class="font-karla text-[#e8e0d0]/40">
                                            {round.byePlayer!.name}
                                        </span>
                                        <span class="font-bebas text-[.6rem] tracking-[.1em] text-[#e8e0d0]/20">
                                            BYE
                                        </span>
                                    </div>
                                </Show>
                            </div>
                        </div>
                    )}
                </For>
            </div>
        </div>
    );
}
