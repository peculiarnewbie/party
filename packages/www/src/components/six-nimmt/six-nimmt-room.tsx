import { createSignal, For, Show, onCleanup } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { TableButton, TableLayout, TablePanel } from "~/components/casino";
import type { PartyLayout } from "~/components/party-layout-controls";
import type { SixNimmtConnection } from "~/game/six-nimmt/connection";
import { colors, fonts } from "~/styles/tokens.stylex";
import { SixNimmtBoard } from "./six-nimmt-board";
import { NumberCard } from "./number-card";

export function SixNimmtRoom(props: {
    connection: SixNimmtConnection;
    playerId: string | null;
    isHost: boolean;
    layout: PartyLayout;
    onReturnToLobby: () => void;
}) {
    const view = () => props.connection.view();
    const [choice, setChoice] = createSignal<{
        round: number;
        turn: number;
        card: number;
    } | null>(null);
    const [error, setError] = createSignal("");
    const [rules, setRules] = createSignal(false);
    onCleanup(
        props.connection.subscribe((event) => setError(event.data.message)),
    );
    const chosen = () => {
        const c = choice();
        const v = view();
        return c &&
            v &&
            c.round === v.round &&
            c.turn === v.turn &&
            v.myHand.includes(c.card)
            ? c.card
            : null;
    };
    const isChoosing = () => {
        const stage = view()?.stage;
        return stage?.type === "choosing" && stage.playerId === props.playerId;
    };
    const locked = () => view()?.selected !== null;
    const select = (card: number) => {
        const v = view();
        if (v) {
            setChoice({ round: v.round, turn: v.turn, card });
            setError("");
        }
    };
    const lock = () => {
        const v = view();
        const card = chosen();
        if (v && card !== null) {
            setError("");
            props.connection.send({
                type: "six_nimmt:lock",
                data: { round: v.round, turn: v.turn, card },
            });
        }
    };
    const chooseRow = (row: number) => {
        const v = view();
        if (v) {
            setError("");
            props.connection.send({
                type: "six_nimmt:choose_row",
                data: { round: v.round, turn: v.turn, row },
            });
        }
    };
    return (
        <main
            data-testid="six-nimmt-room"
            data-layout={props.layout}
            class={`${stylex.attrs(styles.room).class} paper`}
        >
            <header {...stylex.attrs(styles.header)}>
                <h1>6 nimmt!</h1>
                <span>
                    {props.layout === "controller"
                        ? "Your private controls"
                        : "Avoid the sixth card"}
                </span>
                <button
                    type="button"
                    onClick={() => setRules(true)}
                    {...stylex.attrs(styles.help)}
                >
                    How to play
                </button>
            </header>
            <Show when={view()} fallback={<p>Waiting for the deal…</p>}>
                {(v) => (
                    <TableLayout
                        compactTable
                        table={
                            <SixNimmtBoard
                                view={v()}
                                playerId={props.playerId}
                                onChooseRow={chooseRow}
                            />
                        }
                    >
                        <div {...stylex.attrs(styles.controls)}>
                            <Show
                                when={
                                    v().stage.type !== "game_over" &&
                                    v().stage.type !== "round_over"
                                }
                            >
                                <p {...stylex.attrs(styles.label)}>
                                    {locked()
                                        ? "Locked in · waiting for everyone"
                                        : v().stage.type === "selecting"
                                          ? "Your hand · choose one card"
                                          : "Your remaining cards"}
                                </p>
                                <div
                                    data-testid="six-nimmt-hand"
                                    {...stylex.attrs(styles.hand)}
                                >
                                    <For each={v().myHand} keyed={false}>
                                        {(card) => (
                                            <button
                                                type="button"
                                                data-testid={`six-nimmt-card-${card()}`}
                                                aria-label={`Select ${card()}`}
                                                aria-pressed={
                                                    (v().selected ??
                                                        chosen()) === card()
                                                        ? "true"
                                                        : "false"
                                                }
                                                disabled={
                                                    v().stage.type !==
                                                        "selecting" || locked()
                                                }
                                                onClick={() => select(card())}
                                                {...stylex.attrs(
                                                    styles.cardButton,
                                                )}
                                            >
                                                <NumberCard
                                                    value={card()}
                                                    selected={
                                                        (v().selected ??
                                                            chosen()) === card()
                                                    }
                                                />
                                            </button>
                                        )}
                                    </For>
                                </div>
                                <Show when={v().stage.type === "selecting"}>
                                    <TableButton
                                        testId="six-nimmt-lock"
                                        tone="tomato"
                                        disabled={chosen() === null || locked()}
                                        onClick={lock}
                                    >
                                        {locked()
                                            ? "Card locked"
                                            : chosen() === null
                                              ? "Choose a card"
                                              : `Lock in ${chosen()}`}
                                    </TableButton>
                                </Show>
                                <Show when={v().stage.type === "choosing"}>
                                    <p {...stylex.attrs(styles.label)}>
                                        {isChoosing()
                                            ? "Tap a row above to take it"
                                            : "Waiting for the row choice"}
                                    </p>
                                </Show>
                                <Show when={v().stage.type === "resolving"}>
                                    <p {...stylex.attrs(styles.label)}>
                                        Revealing cards from lowest to highest…
                                    </p>
                                </Show>
                            </Show>
                            <Show
                                when={
                                    v().stage.type === "round_over" ||
                                    v().stage.type === "game_over"
                                }
                            >
                                <TablePanel>
                                    <p {...stylex.attrs(styles.result)}>
                                        {v().stage.type === "game_over"
                                            ? "Game over · lowest score wins"
                                            : `Hand ${v().round} complete`}
                                    </p>
                                    <div {...stylex.attrs(styles.results)}>
                                        <For
                                            each={[...v().players].sort(
                                                (a, b) => a.score - b.score,
                                            )}
                                            keyed={false}
                                        >
                                            {(p) => (
                                                <span>{`${p().name}: ${p().score} (+${p().roundScore})${p().active ? "" : " · left"}`}</span>
                                            )}
                                        </For>
                                    </div>
                                </TablePanel>
                                <Show when={v().stage.type === "round_over"}>
                                    <Show
                                        when={props.isHost}
                                        fallback={
                                            <p>Waiting for the host to deal…</p>
                                        }
                                    >
                                        <TableButton
                                            tone="tomato"
                                            testId="six-nimmt-next"
                                            onClick={() =>
                                                props.connection.send({
                                                    type: "six_nimmt:next_round",
                                                    data: { round: v().round },
                                                })
                                            }
                                        >
                                            Deal next hand
                                        </TableButton>
                                    </Show>
                                </Show>
                            </Show>
                            <Show
                                when={
                                    v().stage.type === "game_over" &&
                                    props.isHost
                                }
                            >
                                <TableButton
                                    tone="tomato"
                                    onClick={props.onReturnToLobby}
                                >
                                    Back to lobby
                                </TableButton>
                            </Show>
                            <Show when={error()}>
                                <p role="alert" {...stylex.attrs(styles.error)}>
                                    {error()}
                                </p>
                            </Show>
                        </div>
                    </TableLayout>
                )}
            </Show>
            <Show when={rules()}>
                <div {...stylex.attrs(styles.backdrop)}>
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-label="How to play 6 nimmt"
                        {...stylex.attrs(styles.rules)}
                    >
                        <h2 {...stylex.attrs(styles.result)}>
                            How to play 6 nimmt!
                        </h2>
                        <p>
                            Everyone gets ten cards. Choose one secretly, then
                            lock it in. When everyone is ready, cards reveal and
                            play from lowest to highest.
                        </p>
                        <p>
                            Your card joins the row whose last number is closest
                            below it. If it would be the sixth card, you take
                            the five cards already there; your card starts the
                            row again.
                        </p>
                        <p>
                            Below every row? Choose any row to take, then start
                            it with your card.
                        </p>
                        <p>
                            Each card shows its penalty: normally 1; multiples
                            of 5 cost 2, multiples of 10 cost 3, multiples of 11
                            cost 5. The 55 costs 7.
                        </p>
                        <p>
                            After ten turns, deal a new hand. Once someone has
                            66 or more points at the end of a hand, the lowest
                            score wins. Ties share the win.
                        </p>
                        <TableButton onClick={() => setRules(false)}>
                            Got it
                        </TableButton>
                    </section>
                </div>
            </Show>
        </main>
    );
}
const styles = stylex.create({
    room: {
        backgroundColor: colors.paper,
        height: "100dvh",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        color: colors.ink,
        fontFamily: fonts.body,
    },
    header: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 12,
        justifyContent: "space-between",
        paddingInline: 12,
        height: 44,
        backgroundColor: colors.kraft,
        borderBottomWidth: 3,
        borderBottomStyle: "solid",
        borderBottomColor: colors.ink,
        fontFamily: fonts.heading,
        fontSize: { default: 15, "@media (min-width: 900px)": 20 },
    },
    help: { textDecoration: "underline", cursor: "pointer" },
    controls: {
        display: "flex",
        flexDirection: "column",
        gap: 6,
        maxWidth: 980,
        marginInline: "auto",
    },
    label: {
        textAlign: "center",
        fontFamily: fonts.heading,
        fontSize: 14,
        letterSpacing: ".08em",
    },
    hand: {
        display: "grid",
        gridTemplateColumns: {
            default: "repeat(5, minmax(0, 1fr))",
            "@media (min-width: 700px) and (max-aspect-ratio: 2/1)":
                "repeat(10, minmax(0, 1fr))",
        },
        gap: 10,
        padding: 7,
        maxWidth: {
            default: 370,
            "@media (min-width: 700px) and (max-aspect-ratio: 2/1)": 980,
        },
        width: "100%",
        alignSelf: "center",
    },
    cardButton: {
        height: {
            default: 65,
            "@media (min-width: 900px)": 90,
            "@media (max-width: 639px) and (max-height: 700px)": 50,
        },
        minWidth: 0,
        cursor: { default: "pointer", ":disabled": "default" },
        outline: {
            default: "none",
            ":focus-visible": `3px solid ${colors.tomato}`,
        },
        outlineOffset: 4,
        borderRadius: 5,
    },
    result: { fontFamily: fonts.heading, fontSize: 24, textAlign: "center" },
    results: {
        display: "flex",
        flexWrap: "wrap",
        gap: 10,
        justifyContent: "center",
        fontSize: 14,
    },
    error: { color: colors.tomato, textAlign: "center", fontSize: 14 },
    backdrop: {
        position: "fixed",
        inset: 0,
        zIndex: 100,
        backgroundColor: "rgba(26,26,26,.65)",
        display: "grid",
        placeItems: "center",
        padding: 16,
    },
    rules: {
        display: "flex",
        flexDirection: "column",
        gap: 16,
        maxWidth: 540,
        maxHeight: "85dvh",
        overflowY: "auto",
        padding: 24,
        backgroundColor: colors.cream,
        borderWidth: 3,
        borderStyle: "solid",
        borderColor: colors.ink,
        boxShadow: `6px 6px 0 ${colors.ink}`,
    },
});
