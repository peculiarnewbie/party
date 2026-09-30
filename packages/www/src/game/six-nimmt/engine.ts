import type { SixNimmtState } from "./schemas";

export function bullheads(card: number): number {
    if (card === 55) return 7;
    if (card % 11 === 0) return 5;
    if (card % 10 === 0) return 3;
    if (card % 5 === 0) return 2;
    return 1;
}
export function rowPenalty(row: readonly number[]): number {
    return row.reduce((sum, card) => sum + bullheads(card), 0);
}
export function shuffledDeck(random: () => number = Math.random): number[] {
    const deck = Array.from({ length: 104 }, (_, i) => i + 1);
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [deck[i], deck[j]] = [deck[j]!, deck[i]!];
    }
    return deck;
}
function deal(state: SixNimmtState, deck: readonly number[]): SixNimmtState {
    if (
        deck.length !== 104 ||
        new Set(deck).size !== 104 ||
        deck.some((card) => !Number.isInteger(card) || card < 1 || card > 104)
    )
        throw new Error("A complete 104-card deck is required");
    let offset = 4;
    return {
        ...state,
        turn: 1,
        stage: { type: "selecting" },
        rows: deck.slice(0, 4).map((card) => [card]),
        queue: [],
        revealed: [],
        placements: [],
        winners: [],
        players: state.players.map((player) => {
            const hand = player.active
                ? deck.slice(offset, (offset += 10)).sort((a, b) => a - b)
                : [];
            return { ...player, hand, roundScore: 0, selected: null };
        }),
    };
}
export function initGame(
    players: readonly { id: string; name: string }[],
    deck = shuffledDeck(),
): SixNimmtState {
    if (
        players.length < 2 ||
        players.length > 10 ||
        new Set(players.map((player) => player.id)).size !== players.length
    )
        throw new Error("6 nimmt needs 2–10 unique players");
    return deal(
        {
            players: players.map((player) => ({
                ...player,
                hand: [],
                selected: null,
                score: 0,
                roundScore: 0,
                active: true,
            })),
            round: 1,
            turn: 1,
            stage: { type: "selecting" },
            rows: [],
            queue: [],
            revealed: [],
            placements: [],
            winners: [],
        },
        deck,
    );
}
export type ActionResult =
    | { state: SixNimmtState; error?: never }
    | { error: string; state?: never };
function revealWhenReady(state: SixNimmtState): SixNimmtState {
    const active = state.players.filter((player) => player.active);
    if (!active.every((player) => player.selected !== null)) return state;
    const plays = active
        .flatMap((player) =>
            player.selected === null
                ? []
                : [
                      {
                          playerId: player.id,
                          name: player.name,
                          card: player.selected,
                      },
                  ],
        )
        .sort((a, b) => a.card - b.card);
    return {
        ...state,
        stage: { type: "resolving" },
        queue: plays,
        revealed: plays,
        placements: [],
        players: state.players.map((player) => ({
            ...player,
            hand: player.hand.filter((card) => card !== player.selected),
            selected: null,
        })),
    };
}
export function lockCard(
    state: SixNimmtState,
    playerId: string,
    card: number,
): ActionResult {
    const player = state.players.find(
        (player) => player.id === playerId && player.active,
    );
    if (state.stage.type !== "selecting")
        return { error: "Wait for the next turn." };
    if (!player || !player.hand.includes(card))
        return { error: "Choose a card from your hand." };
    if (player.selected !== null)
        return { error: "Your card is already locked in." };
    return {
        state: revealWhenReady({
            ...state,
            players: state.players.map((player) =>
                player.id === playerId ? { ...player, selected: card } : player,
            ),
        }),
    };
}
export function destination(
    rows: readonly (readonly number[])[],
    card: number,
): number | null {
    let chosen: number | null = null;
    let closest = 0;
    rows.forEach((row, i) => {
        const end = row.at(-1) ?? 0;
        if (end < card && end > closest) {
            closest = end;
            chosen = i;
        }
    });
    return chosen;
}
function place(
    state: SixNimmtState,
    rowIndex: number,
    take: boolean,
): SixNimmtState {
    const play = state.queue[0];
    const row = state.rows[rowIndex];
    if (!play || !row) return state;
    const taken = take ? row : [];
    const penalty = rowPenalty(taken);
    return {
        ...state,
        stage: { type: "resolving" },
        queue: state.queue.slice(1),
        rows: state.rows.map((row, i) =>
            i === rowIndex ? [...(take ? [] : row), play.card] : row,
        ),
        players: state.players.map((player) =>
            player.id === play.playerId
                ? {
                      ...player,
                      score: player.score + penalty,
                      roundScore: player.roundScore + penalty,
                  }
                : player,
        ),
        placements: [
            ...state.placements,
            { ...play, row: rowIndex, taken, penalty },
        ],
    };
}
export function finishGame(state: SixNimmtState): SixNimmtState {
    const active = state.players.filter((player) => player.active);
    const low = Math.min(...active.map((player) => player.score));
    return {
        ...state,
        stage: { type: "game_over" },
        queue: [],
        winners: active
            .filter((player) => player.score === low)
            .map((player) => player.id),
    };
}
export function advance(state: SixNimmtState): SixNimmtState {
    if (state.stage.type !== "resolving") return state;
    const play = state.queue[0];
    if (!play) {
        if (state.turn === 10)
            return state.players.some(
                (player) => player.active && player.score >= 66,
            )
                ? finishGame(state)
                : { ...state, stage: { type: "round_over" } };
        return {
            ...state,
            turn: state.turn + 1,
            stage: { type: "selecting" },
            revealed: [],
            placements: [],
        };
    }
    const row = destination(state.rows, play.card);
    if (row === null)
        return {
            ...state,
            stage: {
                type: "choosing",
                playerId: play.playerId,
                card: play.card,
            },
        };
    return place(state, row, state.rows[row]!.length === 5);
}
export function chooseRow(
    state: SixNimmtState,
    playerId: string,
    row: number,
): ActionResult {
    if (state.stage.type !== "choosing" || state.stage.playerId !== playerId)
        return { error: "It is not your row choice." };
    if (!Number.isInteger(row) || row < 0 || row > 3)
        return { error: "Choose one of the four rows." };
    return { state: place(state, row, true) };
}
export function nextRound(
    state: SixNimmtState,
    deck = shuffledDeck(),
): ActionResult {
    if (state.stage.type !== "round_over")
        return { error: "This hand is not finished." };
    return { state: deal({ ...state, round: state.round + 1 }, deck) };
}
export function removePlayer(
    state: SixNimmtState,
    playerId: string,
): SixNimmtState {
    if (
        !state.players.some((player) => player.id === playerId && player.active)
    )
        return state;
    let next: SixNimmtState = {
        ...state,
        players: state.players.map((player) =>
            player.id === playerId
                ? { ...player, active: false, hand: [], selected: null }
                : player,
        ),
        queue: state.queue.filter((play) => play.playerId !== playerId),
    };
    if (state.stage.type === "game_over") return next;
    if (next.players.filter((player) => player.active).length < 2)
        return finishGame(next);
    if (next.stage.type === "choosing" && next.stage.playerId === playerId)
        next = { ...next, stage: { type: "resolving" } };
    return next.stage.type === "selecting" ? revealWhenReady(next) : next;
}
