import {
    createEffect,
    createMemo,
    createSignal,
    For,
    Show,
    onCleanup,
    untrack,
} from "solid-js";
import { TableButton } from "~/components/casino";
import { TableDie } from "~/components/casino/table-die";
import { PlayerAvatar } from "~/components/casino/player-avatar";
import { CATEGORY_LABELS, SCORING_CATEGORIES } from "~/game/yahtzee/types";
import { calculateScore } from "~/game/yahtzee/engine";
import { CategoryArt } from "./category-art";
import { YahtzeeScorecard } from "./yahtzee-scorecard";
import type { Dice, ScoringCategory } from "~/game/yahtzee";
import type { YahtzeeConnection } from "~/game/yahtzee/connection";
import type { PartyLayout } from "~/components/party-layout-controls";

export function YahtzeeRoom(props: {
    roomId: string;
    playerId: string | null;
    isHost: boolean;
    connection: YahtzeeConnection;
    title: string;
    onEndGame: () => void;
    onReturnToLobby: () => void;
    initialLayout?: PartyLayout;
}) {
    const view = () => props.connection.view();
    const [category, setCategory] = createSignal<ScoringCategory | null>(null);
    const [claimedDice, setClaimedDice] = createSignal<Dice>([1, 1, 1, 1, 1]);
    const [error, setError] = createSignal<string | null>(null);
    createEffect(view, () => {
        setError(null);
    });
    let seed = "";
    createEffect(view, (current) =>
        untrack(() => {
            if (!current?.canClaim) {
                seed = "";
                setCategory(null);
                return;
            }
            const key = `${current.round}:${current.dice.join(",")}`;
            if (key === seed) return;
            seed = key;
            setClaimedDice([...current.dice] as Dice);
            const mine = current.players.find(
                (player) => player.id === props.playerId,
            );
            const open = SCORING_CATEGORIES.filter(
                (cat) => mine?.scorecard[cat] === undefined,
            );
            if (!category() || !open.includes(category()!))
                setCategory(
                    [...open].sort(
                        (a, b) =>
                            calculateScore(current.dice, b) -
                            calculateScore(current.dice, a),
                    )[0] ?? null,
                );
        }),
    );
    onCleanup(
        props.connection.subscribe((event) => {
            if (event.type === "yahtzee:error") setError(event.data.message);
        }),
    );
    const name = (id: string) =>
        view()?.players.find((player) => player.id === id)?.name ?? "Player";
    const mine = () =>
        view()?.players.find((player) => player.id === props.playerId);
    const phone = () =>
        view()?.mode === "standard" && props.initialLayout === "controller";
    const claimScores = createMemo(
        () =>
            Object.fromEntries(
                SCORING_CATEGORIES.map((cat) => [
                    cat,
                    calculateScore(claimedDice(), cat),
                ]),
            ) as Record<ScoringCategory, number>,
    );
    const canHold = () => !!view()?.canRoll && view()?.phase === "mid_turn";
    const cycle = (index: number) =>
        setClaimedDice((current) => {
            const next = [...current] as Dice;
            next[index] = next[index] === 6 ? 1 : next[index] + 1;
            return next;
        });
    return (
        <div
            class="min-h-dvh paper font-karla text-ink"
            data-testid="yahtzee-room"
            data-layout={phone() ? "controller" : "table"}
        >
            <header class="flex flex-wrap items-center justify-between gap-2 border-b-3 border-ink bg-kraft px-3 py-2">
                <div>
                    <h1 class="font-bebas text-2xl" data-testid="yahtzee-title">
                        {props.title.toUpperCase()}
                    </h1>
                    <span
                        class="font-bebas text-sm text-muted"
                        data-testid="yahtzee-round"
                    >
                        ROUND {view()?.round ?? 1} / 13
                    </span>
                </div>
                <div class="flex items-center gap-3">
                    <span
                        class="font-bebas text-xl"
                        data-testid="yahtzee-my-score"
                    >
                        {mine()?.totalScore ?? 0} PTS
                    </span>
                    <Show when={props.isHost && view()?.phase !== "game_over"}>
                        <TableButton
                            size="compact"
                            onClick={props.onEndGame}
                            testId="yahtzee-end-button"
                        >
                            END
                        </TableButton>
                    </Show>
                </div>
            </header>
            <main
                class={`mx-auto space-y-4 p-3 pb-6 ${phone() ? "max-w-lg" : "max-w-5xl"}`}
            >
                <Show when={error()}>
                    {(message) => (
                        <p
                            role="alert"
                            class="border-2 border-tomato bg-cream p-3 text-tomato"
                        >
                            {message()}
                        </p>
                    )}
                </Show>
                <Show when={view()}>
                    {(current) => (
                        <>
                            <Show when={current().phase !== "game_over"}>
                                <section class="table-mat border-3 border-ink bg-navy p-3 text-cream shadow-ink">
                                    <div class="mb-4 flex items-center gap-3">
                                        <PlayerAvatar
                                            id={current().currentPlayerId}
                                            name={name(
                                                current().currentPlayerId,
                                            )}
                                            class="h-10 w-10 text-2xl"
                                        />
                                        <div class="min-w-0">
                                            <h2
                                                data-testid="yahtzee-turn-label"
                                                class="truncate font-bebas text-2xl"
                                            >
                                                {current().isMyTurn
                                                    ? "YOUR TURN"
                                                    : `${name(current().currentPlayerId).toUpperCase()}'S TURN`}
                                            </h2>
                                            <span class="font-bebas text-sm">
                                                {current().mode === "lying" &&
                                                !current().isMyTurn
                                                    ? "PRIVATE ROLL"
                                                    : `${current().rollsLeft} ROLLS LEFT`}
                                            </span>
                                        </div>
                                    </div>
                                    <div class="flex justify-center gap-1.5 pb-3">
                                        <For
                                            each={[0, 1, 2, 3, 4]}
                                            keyed={false}
                                        >
                                            {(_, index) => (
                                                <button
                                                    type="button"
                                                    disabled={!canHold()}
                                                    aria-label={`${current().held[index] ? "Release" : "Hold"} die ${index + 1}`}
                                                    aria-pressed={
                                                        current().held[index]
                                                            ? "true"
                                                            : "false"
                                                    }
                                                    data-testid={`yahtzee-die-${index}`}
                                                    data-held={String(
                                                        current().held[index],
                                                    )}
                                                    data-has-value={String(
                                                        current().dice[index] >
                                                            0,
                                                    )}
                                                    onClick={() =>
                                                        props.connection.send({
                                                            type: "yahtzee:toggle_hold",
                                                            data: {
                                                                diceIndex:
                                                                    index,
                                                            },
                                                        })
                                                    }
                                                    class="rounded-lg focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-sun"
                                                >
                                                    <TableDie
                                                        value={
                                                            current().dice[
                                                                index
                                                            ]
                                                        }
                                                        held={
                                                            current().held[
                                                                index
                                                            ] &&
                                                            current().dice[
                                                                index
                                                            ] > 0
                                                        }
                                                        hidden={
                                                            current().mode ===
                                                                "lying" &&
                                                            !current().isMyTurn
                                                        }
                                                    />
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                    <Show when={current().canRoll}>
                                        <TableButton
                                            class="mt-2 w-full"
                                            tone="sun"
                                            onClick={() =>
                                                props.connection.send({
                                                    type: "yahtzee:roll",
                                                    data: {},
                                                })
                                            }
                                            testId="yahtzee-roll-button"
                                        >
                                            ROLL
                                            <Show
                                                when={current().rollsLeft < 3}
                                            >
                                                {" "}
                                                ({current().rollsLeft} LEFT)
                                            </Show>
                                        </TableButton>
                                    </Show>
                                    <Show when={canHold()}>
                                        <p class="mt-3 text-center text-sm">
                                            Tap dice to hold
                                        </p>
                                    </Show>
                                </section>
                            </Show>
                            <Show when={current().pendingClaim}>
                                {(claim) => (
                                    <section
                                        class="border-3 border-ink bg-sun p-3 shadow-ink"
                                        data-testid="yahtzee-pending-claim"
                                    >
                                        <div class="mb-3 flex items-center gap-2">
                                            <CategoryArt
                                                category={claim().category}
                                            />
                                            <div class="flex-1 font-bebas text-xl">
                                                {name(claim().playerId)} ·{" "}
                                                {
                                                    CATEGORY_LABELS[
                                                        claim().category
                                                    ]
                                                }
                                            </div>
                                            <span class="font-bebas text-3xl">
                                                {claim().claimedPoints}
                                            </span>
                                        </div>
                                        <div class="flex justify-center gap-1.5">
                                            <For
                                                each={claim().claimedDice}
                                                keyed={false}
                                            >
                                                {(die) => (
                                                    <TableDie value={die()} />
                                                )}
                                            </For>
                                        </div>
                                        <Show when={current().canAcceptClaim}>
                                            <div class="mt-4 grid grid-cols-2 gap-3">
                                                <TableButton
                                                    tone="teal"
                                                    testId="yahtzee-believe-button"
                                                    onClick={() =>
                                                        props.connection.send({
                                                            type: "yahtzee:accept_claim",
                                                            data: {},
                                                        })
                                                    }
                                                >
                                                    BELIEVE
                                                </TableButton>
                                                <TableButton
                                                    tone="tomato"
                                                    testId="yahtzee-liar-button"
                                                    onClick={() =>
                                                        props.connection.send({
                                                            type: "yahtzee:challenge_claim",
                                                            data: {},
                                                        })
                                                    }
                                                >
                                                    LIAR!
                                                </TableButton>
                                            </div>
                                        </Show>
                                    </section>
                                )}
                            </Show>
                            <Show
                                when={
                                    current().phase !== "game_over" &&
                                    current().lastTurnReveal
                                }
                            >
                                {(reveal) => (
                                    <section
                                        class="border-3 border-ink bg-cream p-3 shadow-ink"
                                        data-testid="yahtzee-last-turn-reveal"
                                    >
                                        <h2
                                            data-testid="yahtzee-announcement"
                                            class={`mb-3 font-bebas text-2xl ${reveal().outcome === "caught_lying" ? "text-tomato" : "text-teal"}`}
                                        >
                                            {name(
                                                reveal().playerId,
                                            ).toUpperCase()}{" "}
                                            {reveal().outcome === "caught_lying"
                                                ? "GOT CAUGHT LYING"
                                                : reveal().outcome ===
                                                    "truthful_challenge"
                                                  ? "TOLD THE TRUTH"
                                                  : "CLAIM ACCEPTED"}
                                        </h2>
                                        <Show
                                            when={
                                                reveal().penaltyPlayerId &&
                                                reveal().penaltyPoints > 0
                                            }
                                        >
                                            <div
                                                class="mb-3 inline-flex items-center gap-2 border-2 border-ink bg-kraft px-2 py-1"
                                                aria-label={
                                                    name(
                                                        reveal()
                                                            .penaltyPlayerId!,
                                                    ) +
                                                    " loses " +
                                                    reveal().penaltyPoints +
                                                    " points"
                                                }
                                            >
                                                <PlayerAvatar
                                                    id={
                                                        reveal()
                                                            .penaltyPlayerId!
                                                    }
                                                    name={name(
                                                        reveal()
                                                            .penaltyPlayerId!,
                                                    )}
                                                    class="h-7 w-7 text-lg"
                                                />
                                                <span class="font-bebas">
                                                    {name(
                                                        reveal()
                                                            .penaltyPlayerId!,
                                                    )}
                                                </span>
                                                <span class="font-bebas text-xl text-tomato">
                                                    −{reveal().penaltyPoints}{" "}
                                                    PTS
                                                </span>
                                            </div>
                                        </Show>
                                        <div class="flex items-center gap-2 font-bebas">
                                            <CategoryArt
                                                category={reveal().category}
                                            />
                                            {CATEGORY_LABELS[reveal().category]}
                                        </div>
                                        <div class="mt-3 flex flex-wrap gap-4">
                                            <div>
                                                <h3 class="mb-2 font-bebas text-sm">
                                                    CLAIMED ·{" "}
                                                    {reveal().claimedPoints} PTS
                                                </h3>
                                                <div class="flex gap-1">
                                                    <For
                                                        each={
                                                            reveal().claimedDice
                                                        }
                                                        keyed={false}
                                                    >
                                                        {(die) => (
                                                            <TableDie
                                                                value={die()}
                                                            />
                                                        )}
                                                    </For>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 class="mb-2 font-bebas text-sm">
                                                    ACTUAL
                                                </h3>
                                                <div class="flex gap-1">
                                                    <For
                                                        each={
                                                            reveal().actualDice
                                                        }
                                                        keyed={false}
                                                    >
                                                        {(die) => (
                                                            <TableDie
                                                                value={die()}
                                                            />
                                                        )}
                                                    </For>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                )}
                            </Show>
                            <Show when={current().canClaim}>
                                <section
                                    class="border-3 border-ink bg-sun p-3 shadow-ink"
                                    data-testid="yahtzee-claim-panel"
                                >
                                    <div class="mb-3 flex items-center justify-between gap-2">
                                        <h2 class="font-bebas text-xl">
                                            YOUR CLAIM
                                        </h2>
                                        <TableButton
                                            size="compact"
                                            onClick={() =>
                                                setClaimedDice([
                                                    ...current().dice,
                                                ] as Dice)
                                            }
                                        >
                                            USE REAL ROLL
                                        </TableButton>
                                    </div>
                                    <div class="flex justify-center gap-1.5">
                                        <For each={claimedDice()} keyed={false}>
                                            {(die, index) => (
                                                <button
                                                    type="button"
                                                    aria-label={`Change claimed die ${index + 1}, showing ${die()}`}
                                                    onClick={() => cycle(index)}
                                                    class="rounded-lg focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-navy"
                                                >
                                                    <TableDie value={die()} />
                                                </button>
                                            )}
                                        </For>
                                    </div>
                                    <p class="mt-3 text-center text-sm">
                                        Tap dice to change · choose a category
                                        below
                                    </p>
                                    <Show when={category()}>
                                        {(cat) => (
                                            <TableButton
                                                class="mt-3 w-full"
                                                onClick={() =>
                                                    props.connection.send({
                                                        type: "yahtzee:claim",
                                                        data: {
                                                            category: cat(),
                                                            claimedDice:
                                                                claimedDice(),
                                                        },
                                                    })
                                                }
                                            >
                                                SEND CLAIM ·{" "}
                                                {CATEGORY_LABELS[cat()]} ·{" "}
                                                {claimScores()[cat()]} PTS
                                            </TableButton>
                                        )}
                                    </Show>
                                </section>
                            </Show>
                            <Show when={current().phase === "game_over"}>
                                <section
                                    class="border-3 border-ink bg-cream p-4 shadow-ink"
                                    data-testid="yahtzee-game-over"
                                >
                                    <h2 class="font-bebas text-3xl">
                                        GAME OVER
                                    </h2>
                                    <For
                                        each={[...current().players].sort(
                                            (a, b) =>
                                                b.totalScore - a.totalScore,
                                        )}
                                        keyed={false}
                                    >
                                        {(player) => (
                                            <div class="flex items-center gap-3 border-b border-ink/20 py-3 font-bebas text-xl">
                                                <PlayerAvatar
                                                    id={player().id}
                                                    name={player().name}
                                                />
                                                <span class="min-w-0 flex-1 truncate">
                                                    {player().name.toUpperCase()}
                                                </span>
                                                <span>
                                                    {player().totalScore}
                                                </span>
                                                <Show
                                                    when={current().winners?.includes(
                                                        player().id,
                                                    )}
                                                >
                                                    <span class="text-teal">
                                                        WINNER
                                                    </span>
                                                </Show>
                                            </div>
                                        )}
                                    </For>
                                    <Show when={props.isHost}>
                                        <TableButton
                                            class="mt-4 w-full"
                                            onClick={props.onReturnToLobby}
                                            testId="yahtzee-return-button"
                                        >
                                            RETURN TO LOBBY
                                        </TableButton>
                                    </Show>
                                </section>
                            </Show>
                            <YahtzeeScorecard
                                players={current().players}
                                currentPlayerId={current().currentPlayerId}
                                myId={props.playerId}
                                phone={phone()}
                                canChoose={
                                    current().canScore || current().canClaim
                                }
                                potentialScores={
                                    current().canClaim
                                        ? claimScores()
                                        : current().potentialScores
                                }
                                suggested={current().suggestedCategories}
                                selected={category()}
                                onChoose={(cat) =>
                                    current().canClaim
                                        ? setCategory(cat)
                                        : props.connection.send({
                                              type: "yahtzee:score",
                                              data: { category: cat },
                                          })
                                }
                            />
                        </>
                    )}
                </Show>
            </main>
        </div>
    );
}
