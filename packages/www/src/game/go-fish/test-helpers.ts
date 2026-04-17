import type { Card, Rank } from "~/assets/card-deck/types";
import type { GoFishPlayerView } from "./views";
import type { TurnPhase } from "./types";

export interface SeatOverrides {
    id?: string;
    name?: string;
    cardCount?: number;
    books?: Rank[];
}

export function makeSeat(overrides: SeatOverrides = {}) {
    return {
        id: "p1",
        name: "Alice",
        cardCount: 7,
        books: [] as Rank[],
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<GoFishPlayerView> = {},
): GoFishPlayerView {
    return {
        myHand: [],
        drawPileCount: 40,
        currentPlayerId: "p1",
        turnPhase: "awaiting_ask" as TurnPhase,
        players: [
            makeSeat({ id: "p1", name: "Alice" }),
            makeSeat({ id: "p2", name: "Bob" }),
        ],
        lastAction: null,
        lastResult: null,
        gameOver: false,
        winner: null,
        ...overrides,
    };
}

export const SAMPLE_HAND: Card[] = [
    { rank: 7, suit: "spade" },
    { rank: 7, suit: "heart" },
    { rank: 13, suit: "club" },
];
