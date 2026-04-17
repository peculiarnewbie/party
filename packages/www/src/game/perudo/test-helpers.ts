import type {
    Bid,
    ChallengeResult,
    FaceValue,
    PerudoPhase,
} from "./types";
import type { PerudoPlayerInfo, PerudoPlayerView } from "./views";

export function makePlayerInfo(
    overrides: Partial<PerudoPlayerInfo> = {},
): PerudoPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        diceCount: 5,
        eliminated: false,
        isCurrentPlayer: false,
        isStartingPlayer: false,
        dice: null,
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<PerudoPlayerView> = {},
): PerudoPlayerView {
    return {
        myId: "p1",
        phase: "bidding" as PerudoPhase,
        roundNumber: 1,
        currentBid: null,
        bidHistory: [],
        palificoRound: false,
        lastChallengeResult: null,
        winners: null,
        totalDiceInPlay: 10,
        revealTimerActive: false,
        isMyTurn: true,
        currentPlayerId: "p1",
        players: [
            makePlayerInfo({ id: "p1", name: "Alice" }),
            makePlayerInfo({ id: "p2", name: "Bob" }),
        ],
        canBid: true,
        canChallenge: true,
        mustBet: false,
        nextHigherBid: { quantity: 1, faceValue: 2 as FaceValue },
        ...overrides,
    };
}

export function makeBid(overrides: Partial<Bid> = {}): Bid {
    return {
        playerId: "p1",
        quantity: 2,
        faceValue: 3 as FaceValue,
        ...overrides,
    };
}

export function makeChallengeResult(
    overrides: Partial<ChallengeResult> = {},
): ChallengeResult {
    return {
        challengerId: "p2",
        bidderId: "p1",
        bid: makeBid(),
        wasCorrect: false,
        actualCount: 1,
        loserId: "p1",
        loserNewCount: 4,
        ...overrides,
    };
}
