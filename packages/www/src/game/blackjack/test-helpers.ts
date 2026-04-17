import type { Card, Rank, Suit } from "~/assets/card-deck/types";
import type {
    BlackjackPhase,
    RoundResult,
} from "./types";
import type {
    BlackjackPlayerView,
    DealerView,
    PlayerHandView,
    PlayerInfoView,
} from "./views";

export function makeCard(rank: Rank, suit: Suit = "spade"): Card {
    return { rank, suit };
}

export function makeHand(
    overrides: Partial<PlayerHandView> = {},
): PlayerHandView {
    return {
        cards: [makeCard(10, "spade"), makeCard(7, "heart")],
        bet: 50,
        doubled: false,
        stood: false,
        busted: false,
        isBlackjack: false,
        value: 17,
        soft: false,
        ...overrides,
    };
}

export function makePlayerInfo(
    overrides: Partial<PlayerInfoView> = {},
): PlayerInfoView {
    return {
        id: "p1",
        name: "Alice",
        chips: 1000,
        hands: [makeHand()],
        currentHandIndex: 0,
        done: false,
        bet: 50,
        insuranceBet: 0,
        insuranceDecided: false,
        ...overrides,
    };
}

export function makeDealer(overrides: Partial<DealerView> = {}): DealerView {
    return {
        cards: [],
        value: null,
        upCardValue: null,
        busted: false,
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<BlackjackPlayerView> = {},
): BlackjackPlayerView {
    return {
        phase: "betting" as BlackjackPhase,
        roundNumber: 1,
        myId: "p1",
        dealer: makeDealer(),
        players: [
            makePlayerInfo({ id: "p1", name: "Alice" }),
            makePlayerInfo({ id: "p2", name: "Bob" }),
        ],
        currentPlayerIndex: 0,
        results: null as RoundResult[] | null,
        shoeCount: 200,
        canHit: false,
        canStand: false,
        canDouble: false,
        canSplit: false,
        isMyTurn: false,
        needsBet: true,
        needsInsurance: false,
        ...overrides,
    };
}
