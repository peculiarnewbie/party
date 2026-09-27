import { Show } from "solid-js";
import * as stylex from "@stylexjs/stylex";
import { TableButton } from "~/components/casino";
import { colors, fonts } from "~/styles/tokens.stylex";
import type { Rank } from "~/assets/card-deck/types";
import { RANK_LABEL } from "~/assets/card-deck/types";

interface TurnActionsProps {
    isMyTurn: boolean;
    turnPhase: string;
    selectedOpponent: string | null;
    selectedOpponentName: string | null;
    selectedRank: Rank | null;
    onCancel: () => void;
    currentPlayerName: string;
}

export function TurnActions(props: TurnActionsProps) {
    const hint = () => {
        if (props.selectedOpponent && props.selectedRank) return null;
        if (props.selectedOpponent)
            return `ASKING ${props.selectedOpponentName?.toUpperCase()} \u2014 PICK A RANK`;
        if (props.selectedRank)
            return `ASKING FOR ${RANK_LABEL[props.selectedRank]}s \u2014 PICK A PLAYER`;
        return "SELECT A PLAYER AND A RANK";
    };

    return (
        <div {...stylex.attrs(styles.bar)}>
            <Show
                when={props.isMyTurn}
                fallback={
                    <div {...stylex.attrs(styles.hint)}>
                        WAITING FOR {props.currentPlayerName.toUpperCase()}...
                    </div>
                }
            >
                <Show when={props.turnPhase === "awaiting_ask"}>
                    <div {...stylex.attrs(styles.actions)}>
                        <span {...stylex.attrs(styles.hint)}>{hint()}</span>
                        <Show
                            when={props.selectedOpponent || props.selectedRank}
                        >
                            <TableButton
                                size="compact"
                                class="px-4"
                                onClick={() => props.onCancel()}
                            >
                                Clear
                            </TableButton>
                        </Show>
                    </div>
                </Show>

                <Show when={props.turnPhase === "go_fish"}>
                    <div {...stylex.attrs(styles.hint, styles.draw)}>
                        GO FISH! DRAW A CARD
                    </div>
                </Show>
            </Show>
        </div>
    );
}

const styles = stylex.create({
    bar: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingInline: 4,
        paddingBlock: 4,
        minHeight: 40,
    },
    actions: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 12,
    },
    hint: {
        fontFamily: fonts.heading,
        fontSize: "1rem",
        letterSpacing: "0.12em",
        color: colors.muted,
        textAlign: "center",
    },
    draw: { color: colors.tomato },
});
