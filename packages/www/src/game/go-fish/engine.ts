import { SUITS, RANKS } from "~/assets/card-deck/types";
import type { Card, Rank } from "~/assets/card-deck/types";
import type {
    GoFishState,
    GoFishPlayer,
    GoFishAction,
    GoFishResult,
} from "./types";

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function defaultShuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function initGame(
    players: { id: string; name: string }[],
    shuffle: <T>(arr: T[]) => T[] = defaultShuffle,
): GoFishState {
    const deck = shuffle(createDeck());
    const cardsPerPlayer = players.length <= 3 ? 7 : 5;

    const goFishPlayers: GoFishPlayer[] = players.map((p) => ({
        id: p.id,
        name: p.name,
        hand: [],
        books: [],
    }));

    for (let i = 0; i < cardsPerPlayer; i++) {
        for (const player of goFishPlayers) {
            const card = deck.pop();
            if (card) player.hand.push(card);
        }
    }

    const state: GoFishState = {
        players: goFishPlayers,
        drawPile: deck,
        currentPlayerIndex: 0,
        turnPhase: "awaiting_ask",
        lastAction: null,
        lastResult: null,
        lastAskedRank: null,
        gameOver: false,
        winner: null,
    };

    for (const player of state.players) {
        checkForBooks(player);
    }

    return state;
}

export function checkForBooks(player: GoFishPlayer): Rank[] {
    const rankCounts: Partial<Record<Rank, number>> = {};
    for (const card of player.hand) {
        rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1;
    }

    const newBooks: Rank[] = [];
    for (const [rankStr, count] of Object.entries(rankCounts)) {
        const rank = Number(rankStr) as Rank;
        if (count === 4) {
            player.hand = player.hand.filter((c) => c.rank !== rank);
            player.books.push(rank);
            newBooks.push(rank);
        }
    }

    return newBooks;
}

export function checkGameOver(state: GoFishState): boolean {
    const totalBooks = state.players.reduce(
        (sum, p) => sum + p.books.length,
        0,
    );
    if (totalBooks === 13) return true;

    if (state.drawPile.length === 0) {
        const allEmpty = state.players.every((p) => p.hand.length === 0);
        if (allEmpty) return true;
    }

    return false;
}

function getWinners(state: GoFishState): string[] {
    let maxBooks = 0;
    for (const p of state.players) {
        if (p.books.length > maxBooks) maxBooks = p.books.length;
    }
    return state.players
        .filter((p) => p.books.length === maxBooks)
        .map((p) => p.id);
}

function advanceToNextPlayer(state: GoFishState): void {
    let next = (state.currentPlayerIndex + 1) % state.players.length;
    let attempts = 0;

    while (
        state.players[next].hand.length === 0 &&
        state.drawPile.length === 0 &&
        attempts < state.players.length
    ) {
        next = (next + 1) % state.players.length;
        attempts++;
    }

    state.currentPlayerIndex = next;
    state.turnPhase = "awaiting_ask";
}

function handleEmptyHand(state: GoFishState, player: GoFishPlayer): void {
    if (player.hand.length === 0 && state.drawPile.length > 0) {
        const card = state.drawPile.pop()!;
        player.hand.push(card);
    }
}

export function processAction(
    state: GoFishState,
    action: GoFishAction,
): GoFishResult {
    if (state.gameOver) {
        return { type: "error", message: "Game is already over" };
    }

    const currentPlayer = state.players[state.currentPlayerIndex];

    if (action.type === "ask") {
        if (action.askerId !== currentPlayer.id) {
            return { type: "error", message: "Not your turn" };
        }

        if (state.turnPhase !== "awaiting_ask") {
            return {
                type: "error",
                message: "You must draw a card (Go Fish)",
            };
        }

        if (action.targetId === action.askerId) {
            return { type: "error", message: "Cannot ask yourself" };
        }

        const target = state.players.find((p) => p.id === action.targetId);
        if (!target) {
            return { type: "error", message: "Target player not found" };
        }

        const hasRank = currentPlayer.hand.some(
            (c) => c.rank === action.rank,
        );
        if (!hasRank) {
            return {
                type: "error",
                message: "You must hold at least one card of the requested rank",
            };
        }

        state.lastAction = action;
        state.lastAskedRank = action.rank;

        const matchingCards = target.hand.filter(
            (c) => c.rank === action.rank,
        );

        if (matchingCards.length > 0) {
            target.hand = target.hand.filter((c) => c.rank !== action.rank);
            currentPlayer.hand.push(...matchingCards);

            const newBooks = checkForBooks(currentPlayer);
            const bookMade = newBooks.length > 0;

            handleEmptyHand(state, currentPlayer);

            if (checkGameOver(state)) {
                state.gameOver = true;
                state.winner = getWinners(state);
                const result: GoFishResult = {
                    type: "cards_given",
                    fromId: action.targetId,
                    toId: action.askerId,
                    rank: action.rank,
                    count: matchingCards.length,
                    bookMade,
                };
                state.lastResult = result;
                return result;
            }

            if (currentPlayer.hand.length === 0 && state.drawPile.length === 0) {
                advanceToNextPlayer(state);
            } else {
                state.turnPhase = "awaiting_ask";
            }

            const result: GoFishResult = {
                type: "cards_given",
                fromId: action.targetId,
                toId: action.askerId,
                rank: action.rank,
                count: matchingCards.length,
                bookMade,
            };
            state.lastResult = result;
            return result;
        }

        state.turnPhase = "go_fish";
        const result: GoFishResult = {
            type: "go_fish",
            playerId: action.askerId,
            drewAskedRank: false,
            bookMade: false,
        };
        state.lastResult = result;
        return result;
    }

    if (action.type === "draw") {
        if (action.playerId !== currentPlayer.id) {
            return { type: "error", message: "Not your turn" };
        }

        if (state.turnPhase !== "go_fish") {
            return { type: "error", message: "You cannot draw right now" };
        }

        state.lastAction = action;

        if (state.drawPile.length === 0) {
            advanceToNextPlayer(state);
            if (checkGameOver(state)) {
                state.gameOver = true;
                state.winner = getWinners(state);
                return { type: "game_over", winners: state.winner };
            }
            const result: GoFishResult = {
                type: "go_fish",
                playerId: action.playerId,
                drewAskedRank: false,
                bookMade: false,
            };
            state.lastResult = result;
            return result;
        }

        const drawnCard = state.drawPile.pop()!;
        currentPlayer.hand.push(drawnCard);

        const drewAskedRank = drawnCard.rank === state.lastAskedRank;
        const newBooks = checkForBooks(currentPlayer);
        const bookMade = newBooks.length > 0;

        if (checkGameOver(state)) {
            state.gameOver = true;
            state.winner = getWinners(state);
            const result: GoFishResult = {
                type: "go_fish",
                playerId: action.playerId,
                drewAskedRank,
                bookMade,
            };
            state.lastResult = result;
            return result;
        }

        if (drewAskedRank) {
            handleEmptyHand(state, currentPlayer);
            state.turnPhase = "awaiting_ask";
        } else {
            advanceToNextPlayer(state);
        }

        const result: GoFishResult = {
            type: "go_fish",
            playerId: action.playerId,
            drewAskedRank,
            bookMade,
        };
        state.lastResult = result;
        return result;
    }

    return { type: "error", message: "Unknown action type" };
}
