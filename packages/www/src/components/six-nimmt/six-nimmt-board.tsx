import { For, Show } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { rowPenalty } from "~/game/six-nimmt/engine";
import type { SixNimmtTableView } from "~/game/six-nimmt/schemas";
import { colors, fonts, textures } from "~/styles/tokens.stylex";
import { NumberCard } from "./number-card";
import { createCardPlacementMotion } from "./card-placement-motion";

export function SixNimmtBoard(props: {
    view: SixNimmtTableView;
    playerId?: string | null;
    onChooseRow?: (row: number) => void;
}) {
    let board!: HTMLElement;
    createCardPlacementMotion(() => props.view, () => board);
    const choosing = () =>
        props.view.stage.type === "choosing" &&
        props.view.stage.playerId === props.playerId &&
        !!props.onChooseRow;
    const name = (id: string) =>
        props.view.players.find((player) => player.id === id)?.name ?? "Player";
    const status = () => {
        const stage = props.view.stage;
        if (stage.type === "choosing")
            return `${name(stage.playerId)}: ${stage.card} is too low. Choose a row.`;
        if (stage.type === "game_over")
            return `${props.view.winners.map(name).join(" & ") || "Nobody"} wins!`;
        if (stage.type === "round_over")
            return "Hand complete · lowest score leads";
        if (stage.type === "selecting")
            return `${props.view.players.filter((p) => p.ready && p.active).length}/${props.view.players.filter((p) => p.active).length} locked in · green = ready`;
        const last = props.view.placements.at(-1);
        return last
            ? `${last.name} played ${last.card}${last.penalty ? ` · takes ${last.penalty} points` : ` · row ${last.row + 1}`}`
            : "All cards revealed · lowest goes first";
    };
    return (
        <section
            ref={board}
            data-testid="six-nimmt-board"
            {...stylex.attrs(styles.board)}
        >
            <div {...stylex.attrs(styles.top)}>
                <strong>6 nimmt!</strong>
                <span>
                    Hand {props.view.round} · {props.view.turn}/10
                </span>
            </div>
            <p
                role="status"
                data-testid="six-nimmt-status"
                {...stylex.attrs(styles.status)}
            >
                {status()}
            </p>
            <div
                data-testid="six-nimmt-players"
                {...stylex.attrs(styles.scores)}
            >
                <For each={props.view.players} keyed={false}>
                    {(player) => {
                        const play = () =>
                            props.view.revealed.find(
                                (play) => play.playerId === player().id,
                            );
                        const placement = () =>
                            props.view.placements.find(
                                (play) => play.playerId === player().id,
                            );
                        const state = () =>
                            placement()
                                ? "placed"
                                : play()
                                  ? "revealed"
                                  : player().ready
                                    ? "ready"
                                    : "waiting";
                        const description = () =>
                            `${player().name}, ${player().score} points${play() ? `, card ${play()?.card}${placement() ? ` played in row ${(placement()?.row ?? 0) + 1}` : " revealed"}` : player().ready ? ", ready" : ", choosing"}${player().active ? "" : ", left"}`;
                        return (
                            <div
                                data-testid={`six-nimmt-player-${player().id}`}
                                data-state={state()}
                                {...stylex.attrs(
                                    styles.score,
                                    player().id === props.playerId && styles.me,
                                    player().ready && styles.ready,
                                    !player().active && styles.left,
                                )}
                                title={description()}
                                aria-label={description()}
                            >
                                <span {...stylex.attrs(styles.playerDetails)}>
                                    <span {...stylex.attrs(styles.playerName)}>
                                        {player().name}
                                    </span>
                                    <strong>{player().score}</strong>
                                </span>
                                <span
                                    data-six-nimmt-source={player().id}
                                    {...(play()
                                        ? placement()
                                            ? stylex.attrs(
                                                  styles.playerCard,
                                                  styles.placed,
                                              )
                                            : stylex.attrs(styles.playerCard)
                                        : stylex.attrs(
                                              styles.playerCard,
                                              styles.cardBack,
                                          ))}
                                >
                                    <Show
                                        when={play()}
                                        fallback={
                                            <span aria-hidden="true">?</span>
                                        }
                                    >
                                        {(revealed) => (
                                            <span data-testid="six-nimmt-revealed-card">
                                                {revealed().card}
                                            </span>
                                        )}
                                    </Show>
                                </span>
                            </div>
                        );
                    }}
                </For>
            </div>
            <div {...stylex.attrs(styles.rows)}>
                <For each={props.view.rows} keyed={false}>
                    {(row, index) => (
                        <button
                            type="button"
                            data-testid={`six-nimmt-row-${index}`}
                            disabled={!choosing()}
                            aria-label={`Take row ${index + 1} for ${rowPenalty(row())} points`}
                            onClick={() => props.onChooseRow?.(index)}
                            {...stylex.attrs(
                                styles.row,
                                choosing() && styles.choose,
                            )}
                        >
                            <span {...stylex.attrs(styles.rowLabel)}>
                                {index + 1}
                            </span>
                            <span {...stylex.attrs(styles.cards)}>
                                <For each={[0, 1, 2, 3, 4]} keyed={false}>
                                    {(slot) => (
                                        <span
                                            data-testid={`six-nimmt-slot-${index}-${slot()}`}
                                            {...stylex.attrs(styles.slot)}
                                        >
                                            <Show
                                                when={row()[slot()]}
                                                fallback={
                                                    <span
                                                        {...stylex.attrs(
                                                            styles.empty,
                                                        )}
                                                    />
                                                }
                                            >
                                                {(card) => (
                                                    <NumberCard
                                                        value={card()}
                                                    />
                                                )}
                                            </Show>
                                        </span>
                                    )}
                                </For>
                            </span>
                            <span {...stylex.attrs(styles.rowLabel)}>
                                {rowPenalty(row())}
                                <small {...stylex.attrs(styles.points)}>
                                    pts
                                </small>
                            </span>
                        </button>
                    )}
                </For>
            </div>
            <div
                aria-hidden="true"
                data-six-nimmt-motion-layer
                {...stylex.attrs(styles.motionLayer)}
            />
        </section>
    );
}
const styles = stylex.create({
    board: {
        position: "relative",
        overflow: "hidden",
        containerType: "size",
        height: "100%",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: { default: 8, "@media (min-width: 900px)": 16 },
        borderWidth: 3,
        borderStyle: "solid",
        borderColor: colors.ink,
        borderRadius: 12,
        backgroundColor: colors.navy,
        backgroundImage: textures.table,
        backgroundSize: "14px 14px",
        color: colors.cream,
        boxShadow: `4px 5px 0 ${colors.ink}`,
        fontFamily: fonts.heading,
    },
    top: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: { default: 18, "@media (min-width: 900px)": 26 },
        letterSpacing: ".05em",
    },
    status: {
        fontFamily: fonts.body,
        fontSize: { default: 12, "@media (min-width: 900px)": 16 },
        minHeight: 18,
        textAlign: "center",
        lineHeight: 1.2,
    },
    scores: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(50px, 1fr))",
        gap: 4,
        width: "100%",
        maxWidth: 1200,
        alignSelf: "center",
    },
    score: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { default: 3, "@media (max-height: 700px)": 1 },
        minWidth: 0,
        fontFamily: fonts.body,
        fontSize: {
            default: 11,
            "@media (min-width: 900px)": 16,
            "@media (max-height: 700px)": 9,
        },
        lineHeight: {
            default: "16px",
            "@media (min-width: 900px)": "22px",
            "@media (max-height: 700px)": "10px",
        },
        padding: { default: 4, "@media (max-height: 700px)": 2 },
        backgroundColor: colors.cream,
        color: colors.ink,
        borderRadius: 3,
    },
    playerDetails: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 3,
        width: "100%",
        minWidth: 0,
    },
    playerCard: {
        display: "grid",
        placeItems: "center",
        width: {
            default: 30,
            "@media (min-width: 900px)": 46,
            "@media (max-height: 700px)": 24,
        },
        height: {
            default: 34,
            "@media (min-width: 900px)": 54,
            "@media (max-height: 700px)": 18,
        },
        fontFamily: fonts.heading,
        fontSize: {
            default: 24,
            "@media (min-width: 900px)": 36,
            "@media (max-height: 700px)": 16,
        },
        lineHeight: 1,
        borderWidth: 1,
        borderStyle: "solid",
        borderColor: colors.ink,
        borderRadius: 3,
        backgroundColor: colors.card,
        color: colors.ink,
        boxShadow: `1px 1px 0 ${colors.ink}`,
        transitionProperty: "background-color, color",
        transitionDuration: "160ms",
    },
    cardBack: {
        backgroundColor: colors.navy,
        color: colors.cream,
        backgroundImage: textures.table,
        backgroundSize: "8px 8px",
    },
    playerName: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    ready: { backgroundColor: colors.teal, color: colors.cream },
    me: { backgroundColor: colors.sun },
    left: { opacity: 0.5 },
    rows: {
        display: "grid",
        gridTemplateRows: "repeat(4, minmax(0, 1fr))",
        gap: 8,
        flex: "1 1 0%",
        minHeight: 0,
        paddingBottom: 4,
    },
    row: {
        display: "grid",
        gridTemplateColumns: "24px minmax(0, 1fr) 32px",
        alignItems: "center",
        minHeight: 0,
        gap: 6,
        padding: {
            default: 4,
            "@media (max-height: 700px)": 2,
            "@media (max-height: 500px)": 0,
        },
        borderRadius: 6,
        backgroundColor: "rgba(255,255,255,.08)",
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "transparent",
        color: colors.cream,
        cursor: "default",
    },
    choose: {
        borderColor: colors.sun,
        cursor: "pointer",
        backgroundColor: {
            default: "rgba(245,197,66,.1)",
            ":hover": "rgba(245,197,66,.25)",
        },
        outline: {
            default: "none",
            ":focus-visible": `3px solid ${colors.sun}`,
        },
    },
    cards: {
        display: "grid",
        gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
        gap: { default: 5, "@media (min-width: 900px)": 12 },
        height: "100%",
        minHeight: 0,
        width: "100%",
        maxWidth: 880,
        justifySelf: "center",
    },
    slot: {
        display: "block",
        minHeight: 0,
        height: "100%",
        "--number-card-font": {
            default: "clamp(16px, 6cqh, 56px)",
            "@media (max-height: 700px)": "16px",
        },
        "--number-card-direction": {
            default: "column",
            "@media (max-height: 700px)": "row",
        },
        "--number-card-small": "clamp(9px, 2cqh, 16px)",
    },
    empty: {
        display: "block",
        height: "100%",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: "rgba(255,255,255,.2)",
        borderRadius: 4,
    },
    rowLabel: {
        fontSize: "clamp(16px, 4cqh, 32px)",
        textAlign: "center",
        lineHeight: 1,
    },
    points: {
        display: { default: "block", "@media (max-height: 700px)": "inline" },
        fontSize: { default: 10, "@media (max-height: 700px)": 8 },
    },
    placed: { backgroundColor: colors.sun },
    motionLayer: {
        position: "absolute",
        inset: 0,
        zIndex: 20,
        pointerEvents: "none",
    },
});
