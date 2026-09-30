import type {
    SixNimmtState,
    SixNimmtPlayerView,
    SixNimmtTableView,
} from "./schemas";

export function getTableView(state: SixNimmtState): SixNimmtTableView {
    return {
        round: state.round,
        turn: state.turn,
        stage: state.stage,
        rows: state.rows,
        revealed: state.revealed,
        placements: state.placements,
        winners: state.winners,
        players: state.players.map(
            ({ id, name, score, roundScore, active, selected, hand }) => ({
                id,
                name,
                score,
                roundScore,
                active,
                ready: selected !== null,
                cardCount: hand.length,
            }),
        ),
    };
}
export function getPlayerView(
    state: SixNimmtState,
    playerId: string,
): SixNimmtPlayerView {
    const player = state.players.find(
        (player) => player.id === playerId && player.active,
    );
    return {
        ...getTableView(state),
        myHand: player?.hand ?? [],
        selected: player?.selected ?? null,
    };
}
