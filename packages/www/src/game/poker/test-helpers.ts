import type { Card } from "~/assets/card-deck/types";
import type {
    PokerEvent,
    PokerPlayerStatus,
    PokerPot,
    PokerStreet,
} from "./types";
import type { PokerPlayerPublicView, PokerPlayerView } from "./views";

export function makeSeat(
    overrides: Partial<PokerPlayerPublicView> = {},
): PokerPlayerPublicView {
    return {
        id: "p1",
        name: "Alice",
        stack: 1000,
        status: "active" as PokerPlayerStatus,
        connected: true,
        committedThisStreet: 0,
        committedThisHand: 0,
        holeCardCount: 2,
        visibleHoleCards: [],
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isActing: false,
        ...overrides,
    };
}

export function makeView(overrides: Partial<PokerPlayerView> = {}): PokerPlayerView {
    return {
        myHoleCards: [],
        myHoleCardCount: 0,
        myStack: 1000,
        myStatus: "active",
        isSpectator: false,
        legalActions: [],
        callAmount: 0,
        minBetOrRaise: null,
        maxBet: 0,
        players: [],
        board: [],
        pots: [],
        actingPlayerId: null,
        street: "preflop" as PokerStreet,
        handNumber: 1,
        eventLog: [],
        spectators: [],
        endedByHost: false,
        winnerIds: null,
        ...overrides,
    };
}

export function makeEvent(overrides: Partial<PokerEvent> = {}): PokerEvent {
    return {
        id: 1,
        type: "hand_started",
        message: "Hand started",
        ...overrides,
    };
}

export function makePot(overrides: Partial<PokerPot> = {}): PokerPot {
    return {
        amount: 0,
        eligiblePlayerIds: [],
        ...overrides,
    };
}

export const SAMPLE_CARDS: Card[] = [
    { rank: 1, suit: "spade" },
    { rank: 13, suit: "heart" },
];

export const SAMPLE_BOARD: Card[] = [
    { rank: 5, suit: "club" },
    { rank: 7, suit: "diamond" },
    { rank: 9, suit: "spade" },
];
