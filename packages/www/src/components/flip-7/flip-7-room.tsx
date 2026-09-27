import { type PartyLayout } from "~/components/party-layout-controls";
import { PlayerBoard } from "./player-board";
import { createSignal, For, Match, onCleanup, Show, Switch } from "solid-js";
import type { Component } from "solid-js";
import type { Flip7PlayerView } from "~/game/flip-7/views";
import type {
    Flip7ClientOutgoing,
    Flip7Connection,
} from "~/game/flip-7/connection";

interface Flip7RoomProps {
    roomId: string;
    initialLayout?: PartyLayout;
    playerId: string | null;
    isHost: boolean;
    connection: Flip7Connection;
    onEndGame: () => void;
    onReturnToLobby: () => void;
}

const TARGET_LABELS = {
    freeze: "FREEZE",
    flip_three: "FLIP THREE",
    second_chance: "SECOND CHANCE",
} as const;

export const Flip7Room: Component<Flip7RoomProps> = (props) => {
    const layout = () => props.initialLayout ?? "table";
    const isController = () => layout() === "controller";
    const view = () => props.connection.view();
    const [error, setError] = createSignal<string | null>(null);

    const sendFlip7 = (message: Flip7ClientOutgoing) => {
        if (!props.playerId) return;
        props.connection.send(message);
    };

    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "flip_7:error") {
                const message = (event.data as { message?: unknown })?.message;
                setError(
                    typeof message === "string"
                        ? message
                        : "Something went wrong",
                );
            }
        }),
    );

    const playerName = (playerId: string) =>
        view()?.players.find((player) => player.id === playerId)?.name ??
        "Unknown";

    return (
        <div
            data-testid="flip-7-room"
            data-layout={layout()}
            class="min-h-screen bg-[#ddd5c4] text-[#1a1a1a] font-karla"
        >
            <Show when={view()} keyed>
                {(state) => (
                    <div
                        class={`mx-auto px-4 py-6 ${isController() ? "max-w-md" : "max-w-6xl"}`}
                    >
                        <div class="flex flex-wrap items-start justify-between gap-4 mb-6">
                            <div>
                                <div class="font-bebas text-[.78rem] tracking-[.24em] text-[#c0261a] mb-2">
                                    PRESS YOUR LUCK
                                </div>
                                <h1 class="font-bebas text-[2.6rem] tracking-[.08em] leading-none">
                                    FLIP 7
                                </h1>
                                <div class="font-bebas text-[.78rem] tracking-[.18em] text-[#9a9080] mt-2">
                                    ROOM {props.roomId.toUpperCase()} · ROUND{" "}
                                    {state.roundNumber} · TARGET{" "}
                                    {state.targetScore}
                                </div>
                            </div>
                            <div class="flex flex-wrap items-center gap-3">
                                <Show when={!isController()}>
                                    <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] px-4 py-2 shadow-[3px_3px_0_#1a1a1a]">
                                        <div class="font-bebas text-[.68rem] tracking-[.18em] text-[#9a9080]">
                                            DECK
                                        </div>
                                        <div class="font-bebas text-[1.3rem] tracking-[.08em]">
                                            {state.deckCount}
                                        </div>
                                    </div>
                                    <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] px-4 py-2 shadow-[3px_3px_0_#1a1a1a]">
                                        <div class="font-bebas text-[.68rem] tracking-[.18em] text-[#9a9080]">
                                            DISCARD
                                        </div>
                                        <div class="font-bebas text-[1.3rem] tracking-[.08em]">
                                            {state.discardCount}
                                        </div>
                                    </div>
                                </Show>
                                <Show
                                    when={
                                        props.isHost &&
                                        state.phase !== "game_over"
                                    }
                                >
                                    <button
                                        type="button"
                                        onClick={props.onEndGame}
                                        class="font-bebas text-[.84rem] tracking-[.16em] bg-[#c0261a] text-[#ddd5c4] border-2 border-[#1a1a1a] px-4 py-2 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                                    >
                                        END GAME
                                    </button>
                                </Show>
                            </div>
                        </div>

                        <div
                            class={
                                isController()
                                    ? "space-y-4"
                                    : "grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-6"
                            }
                        >
                            <div
                                class={
                                    isController()
                                        ? "flex flex-col gap-4"
                                        : "space-y-6"
                                }
                            >
                                <div
                                    class={`border-2 border-[#1a1a1a] bg-[#c9c0b0] p-5 shadow-[4px_4px_0_#1a1a1a] ${isController() ? "order-2" : ""}`}
                                >
                                    <Show when={!isController()}>
                                        <div class="flex flex-wrap gap-4 items-center justify-between mb-4">
                                            <div>
                                                <div class="font-bebas text-[.72rem] tracking-[.22em] text-[#9a9080]">
                                                    DEALER
                                                </div>
                                                <div class="font-bebas text-[1.25rem] tracking-[.08em]">
                                                    {state.dealerId
                                                        ? playerName(
                                                              state.dealerId,
                                                          )
                                                        : "TBD"}
                                                </div>
                                            </div>
                                            <div>
                                                <div class="font-bebas text-[.72rem] tracking-[.22em] text-[#9a9080]">
                                                    CURRENT TURN
                                                </div>
                                                <div class="font-bebas text-[1.25rem] tracking-[.08em]">
                                                    {state.currentPlayerId
                                                        ? playerName(
                                                              state.currentPlayerId,
                                                          )
                                                        : "RESOLVING"}
                                                </div>
                                            </div>
                                            <div>
                                                <div class="font-bebas text-[.72rem] tracking-[.22em] text-[#9a9080]">
                                                    PHASE
                                                </div>
                                                <div class="font-bebas text-[1.25rem] tracking-[.08em]">
                                                    {state.phase
                                                        .replaceAll("_", " ")
                                                        .toUpperCase()}
                                                </div>
                                            </div>
                                        </div>
                                    </Show>
                                    <Show when={error()}>
                                        <div class="mb-4 border-2 border-[#c0261a] bg-[#f4d6d1] px-4 py-3 text-[.92rem] text-[#7f1d1d]">
                                            {error()}
                                        </div>
                                    </Show>

                                    <Switch>
                                        <Match
                                            when={state.requiresMyTargetChoice}
                                        >
                                            <TargetChoicePanel
                                                view={state}
                                                playerName={playerName}
                                                onChooseTarget={(targetId) =>
                                                    sendFlip7({
                                                        type: "flip_7:choose_target",
                                                        data: { targetId },
                                                    })
                                                }
                                            />
                                        </Match>
                                        <Match
                                            when={
                                                state.phase === "initial_deal"
                                            }
                                        >
                                            <InfoPanel
                                                eyebrow="DEALING"
                                                title="Opening Cards Are Being Dealt"
                                                body="Action cards can interrupt the opening deal. Wait for the state to settle before taking your turn."
                                            />
                                        </Match>
                                        <Match
                                            when={
                                                state.phase ===
                                                    "awaiting_target" &&
                                                state.targetChoice
                                            }
                                        >
                                            <InfoPanel
                                                eyebrow="ACTION CARD"
                                                title={`${playerName(state.targetChoice!.chooserPlayerId)} must choose a target`}
                                                body={`${TARGET_LABELS[state.targetChoice!.card]} can be played on any active player.`}
                                            />
                                        </Match>
                                        <Match when={state.phase === "turn"}>
                                            <TurnPanel
                                                compact={isController()}
                                                view={state}
                                                playerName={playerName}
                                                onHit={() =>
                                                    sendFlip7({
                                                        type: "flip_7:hit",
                                                        data: {},
                                                    })
                                                }
                                                onStay={() =>
                                                    sendFlip7({
                                                        type: "flip_7:stay",
                                                        data: {},
                                                    })
                                                }
                                            />
                                        </Match>
                                        <Match
                                            when={
                                                state.phase === "round_over" &&
                                                state.lastRoundResult
                                            }
                                        >
                                            <RoundOverPanel
                                                view={state}
                                                playerName={playerName}
                                                onNextRound={() =>
                                                    sendFlip7({
                                                        type: "flip_7:next_round",
                                                        data: {},
                                                    })
                                                }
                                                onReturnToLobby={
                                                    props.onReturnToLobby
                                                }
                                            />
                                        </Match>
                                        <Match
                                            when={state.phase === "game_over"}
                                        >
                                            <GameOverPanel
                                                view={state}
                                                playerName={playerName}
                                                onReturnToLobby={
                                                    props.onReturnToLobby
                                                }
                                            />
                                        </Match>
                                    </Switch>
                                </div>

                                <div
                                    class={`space-y-4 ${isController() ? "order-1" : ""}`}
                                >
                                    <For
                                        each={
                                            isController()
                                                ? state.players.filter(
                                                      (player) =>
                                                          player.id ===
                                                          props.playerId,
                                                  )
                                                : state.players
                                        }
                                    >
                                        {(player) => (
                                            <PlayerBoard
                                                player={player}
                                                isCurrent={
                                                    state.currentPlayerId ===
                                                    player.id
                                                }
                                                isWinner={
                                                    state.winners?.includes(
                                                        player.id,
                                                    ) ?? false
                                                }
                                            />
                                        )}
                                    </For>
                                </div>
                            </div>

                            <Show when={!isController()}>
                                <div class="space-y-6">
                                    <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-5 shadow-[4px_4px_0_#1a1a1a]">
                                        <div class="font-bebas text-[.78rem] tracking-[.22em] text-[#c0261a] mb-3">
                                            HOW SCORING WORKS
                                        </div>
                                        <div class="text-[.95rem] leading-relaxed text-[#5a5040] space-y-2">
                                            <p>Number cards add together.</p>
                                            <p>
                                                `x2` doubles number-card points
                                                before flat bonuses are added.
                                            </p>
                                            <p>
                                                `+2` to `+10` adds flat points
                                                even if you have no numbers.
                                            </p>
                                            <p>
                                                `Second Chance` scores nothing,
                                                but it can cancel one duplicate
                                                number.
                                            </p>
                                            <p>
                                                Flip 7 unique numbers to end the
                                                round immediately and earn +15.
                                            </p>
                                        </div>
                                    </div>

                                    <Show when={state.lastRoundResult}>
                                        <div class="border-2 border-[#1a1a1a] bg-[#c9c0b0] p-5 shadow-[4px_4px_0_#1a1a1a]">
                                            <div class="font-bebas text-[.78rem] tracking-[.22em] text-[#c0261a] mb-3">
                                                LAST ROUND
                                            </div>
                                            <div class="space-y-3">
                                                <For
                                                    each={
                                                        state.lastRoundResult
                                                            ?.scores ?? []
                                                    }
                                                >
                                                    {(score) => (
                                                        <div class="flex items-center justify-between border-b border-[#b8ae9e] pb-2 last:border-b-0 last:pb-0">
                                                            <div>
                                                                <div class="font-bebas text-[1rem] tracking-[.08em]">
                                                                    {playerName(
                                                                        score.playerId,
                                                                    )}
                                                                </div>
                                                                <div class="font-bebas text-[.66rem] tracking-[.18em] text-[#9a9080]">
                                                                    {score.status
                                                                        .replaceAll(
                                                                            "_",
                                                                            " ",
                                                                        )
                                                                        .toUpperCase()}
                                                                </div>
                                                            </div>
                                                            <div class="text-right">
                                                                <div class="font-bebas text-[1.1rem] tracking-[.08em]">
                                                                    +
                                                                    {
                                                                        score.score
                                                                    }
                                                                </div>
                                                                <div class="font-bebas text-[.66rem] tracking-[.18em] text-[#9a9080]">
                                                                    TOTAL{" "}
                                                                    {
                                                                        score.totalScore
                                                                    }
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </For>
                                            </div>
                                        </div>
                                    </Show>
                                </div>
                            </Show>
                        </div>
                    </div>
                )}
            </Show>
        </div>
    );
};

const InfoPanel: Component<{
    eyebrow: string;
    title: string;
    body: string;
}> = (props) => (
    <div class="border-2 border-[#1a1a1a] bg-[#ddd5c4] p-5">
        <div class="font-bebas text-[.74rem] tracking-[.24em] text-[#c0261a] mb-2">
            {props.eyebrow}
        </div>
        <h2 class="font-bebas text-[1.8rem] tracking-[.06em] leading-none mb-3">
            {props.title}
        </h2>
        <p class="text-[.96rem] leading-relaxed text-[#5a5040]">{props.body}</p>
    </div>
);

const TurnPanel: Component<{
    view: Flip7PlayerView;
    playerName: (playerId: string) => string;
    compact?: boolean;
    onHit: () => void;
    onStay: () => void;
}> = (props) => (
    <div class="border-2 border-[#1a1a1a] bg-[#ddd5c4] p-5">
        <Show
            when={props.view.canHit || props.view.canStay}
            fallback={
                <InfoPanel
                    eyebrow="WAIT"
                    title={
                        props.view.currentPlayerId
                            ? `${props.playerName(props.view.currentPlayerId)} is deciding`
                            : "Resolving card effects"
                    }
                    body="You can see every public card on the table while the current player decides whether to push or bank their points."
                />
            }
        >
            <div class="font-bebas text-[.74rem] tracking-[.24em] text-[#c0261a] mb-2">
                YOUR TURN
            </div>
            <h2 class="font-bebas text-[1.9rem] tracking-[.06em] leading-none mb-3">
                HIT OR STAY
            </h2>
            <Show when={!props.compact}>
                <p class="text-[.96rem] leading-relaxed text-[#5a5040] mb-5">
                    `Hit` draws one more card. `Stay` banks your current line,
                    but you need at least one face-up card to do it.
                </p>
            </Show>
            <div class="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={props.onHit}
                    disabled={!props.view.canHit}
                    class="flex-1 min-w-[100px] font-bebas text-[1.1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    HIT
                </button>
                <button
                    type="button"
                    onClick={props.onStay}
                    disabled={!props.view.canStay}
                    class="flex-1 min-w-[100px] font-bebas text-[1.1rem] tracking-[.14em] bg-[#c9c0b0] text-[#1a1a1a] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] disabled:opacity-40 disabled:cursor-default disabled:shadow-none enabled:hover:-translate-x-0.5 enabled:hover:-translate-y-0.5 enabled:hover:shadow-[5px_5px_0_#9a9080]"
                >
                    STAY
                </button>
            </div>
        </Show>
    </div>
);

const TargetChoicePanel: Component<{
    view: Flip7PlayerView;
    playerName: (playerId: string) => string;
    onChooseTarget: (targetId: string) => void;
}> = (props) => (
    <div class="border-2 border-[#1a1a1a] bg-[#ddd5c4] p-5">
        <div class="font-bebas text-[.74rem] tracking-[.24em] text-[#c0261a] mb-2">
            TARGET REQUIRED
        </div>
        <h2 class="font-bebas text-[1.9rem] tracking-[.06em] leading-none mb-3">
            PLAY {TARGET_LABELS[props.view.targetChoice!.card]}
        </h2>
        <p class="text-[.96rem] leading-relaxed text-[#5a5040] mb-5">
            Choose any active player to receive this action card.
        </p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <For each={props.view.validTargetIds}>
                {(targetId) => (
                    <button
                        type="button"
                        onClick={() => props.onChooseTarget(targetId)}
                        class="text-left font-bebas text-[1rem] tracking-[.1em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-4 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                    >
                        {props.playerName(targetId)}
                    </button>
                )}
            </For>
        </div>
    </div>
);

const RoundOverPanel: Component<{
    view: Flip7PlayerView;
    playerName: (playerId: string) => string;
    onNextRound: () => void;
    onReturnToLobby: () => void;
}> = (props) => (
    <div class="border-2 border-[#1a1a1a] bg-[#ddd5c4] p-5">
        <div class="font-bebas text-[.74rem] tracking-[.24em] text-[#c0261a] mb-2">
            ROUND OVER
        </div>
        <h2 class="font-bebas text-[1.9rem] tracking-[.06em] leading-none mb-3">
            {props.view.lastRoundResult?.flip7WinnerId
                ? `${props.playerName(props.view.lastRoundResult.flip7WinnerId)} flipped 7`
                : "Everyone is done for the round"}
        </h2>
        <p class="text-[.96rem] leading-relaxed text-[#5a5040] mb-5">
            Scores are banked. The next round starts with the dealer passing to
            the left.
        </p>
        <Show
            when={props.view.hostId === props.view.myId}
            fallback={
                <div class="font-bebas text-[.86rem] tracking-[.18em] text-[#9a9080]">
                    WAITING FOR HOST TO START THE NEXT ROUND
                </div>
            }
        >
            <div class="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={props.onNextRound}
                    class="font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
                >
                    NEXT ROUND
                </button>
                <button
                    type="button"
                    onClick={props.onReturnToLobby}
                    class="font-bebas text-[1rem] tracking-[.14em] bg-[#c9c0b0] text-[#1a1a1a] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#9a9080] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#9a9080]"
                >
                    RETURN TO LOBBY
                </button>
            </div>
        </Show>
    </div>
);

const GameOverPanel: Component<{
    view: Flip7PlayerView;
    playerName: (playerId: string) => string;
    onReturnToLobby: () => void;
}> = (props) => (
    <div class="border-2 border-[#1a1a1a] bg-[#ddd5c4] p-5">
        <div class="font-bebas text-[.74rem] tracking-[.24em] text-[#c0261a] mb-2">
            GAME OVER
        </div>
        <h2 class="font-bebas text-[2rem] tracking-[.06em] leading-none mb-3">
            <Show
                when={(props.view.winners?.length ?? 0) > 0}
                fallback={"No winners"}
            >
                {(props.view.winners ?? [])
                    .map((winnerId) => props.playerName(winnerId))
                    .join(" & ")}
            </Show>
        </h2>
        <p class="text-[.96rem] leading-relaxed text-[#5a5040] mb-5">
            <Show
                when={!props.view.endedByHost}
                fallback={
                    "The host ended this game before the target score was reached."
                }
            >
                First to at least {props.view.targetScore} at the end of a round
                takes it.
            </Show>
        </p>
        <Show when={props.view.hostId === props.view.myId}>
            <button
                type="button"
                onClick={props.onReturnToLobby}
                class="font-bebas text-[1rem] tracking-[.14em] bg-[#1a3a6e] text-[#ddd5c4] border-2 border-[#1a1a1a] px-5 py-3 shadow-[3px_3px_0_#1a1a1a] transition-all duration-[120ms] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#1a1a1a]"
            >
                RETURN TO LOBBY
            </button>
        </Show>
    </div>
);
