import type { DiscType, SkullPhase, SkullResult } from "./types";
import type {
    SkullAttemptView,
    SkullPlayerInfo,
    SkullPlayerView,
} from "./views";

export function makePlayerInfo(
    overrides: Partial<SkullPlayerInfo> = {},
): SkullPlayerInfo {
    return {
        id: "p1",
        name: "Alice",
        handCount: 4,
        matCount: 0,
        faceDownCount: 0,
        successfulChallenges: 0,
        eliminated: false,
        isCurrentPlayer: false,
        isStarter: false,
        isHighestBidder: false,
        hasPassed: false,
        revealedDiscs: [],
        ...overrides,
    };
}

export function makeAttempt(
    overrides: Partial<SkullAttemptView> = {},
): SkullAttemptView {
    return {
        challengerId: "p1",
        target: 2,
        revealedCount: 0,
        autoRevealDone: true,
        revealedSteps: [],
        ...overrides,
    };
}

export function makeView(
    overrides: Partial<SkullPlayerView> = {},
): SkullPlayerView {
    const players = overrides.players ?? [
        makePlayerInfo({ id: "p1", name: "Alice", isCurrentPlayer: true }),
        makePlayerInfo({ id: "p2", name: "Bob" }),
        makePlayerInfo({ id: "p3", name: "Carol" }),
    ];
    return {
        myId: "p1",
        phase: "turn_prep" as SkullPhase,
        roundNumber: 1,
        currentPlayerId: "p1",
        starterPlayerId: "p1",
        highestBid: null,
        highestBidderId: null,
        passedBidderIds: [],
        penaltyPlayerId: null,
        penaltyChooserId: null,
        penaltyTargetHandCount: 0,
        pendingNextStarterChooserId: null,
        winnerId: null,
        players,
        myHand: ["flower", "flower", "flower", "skull"] as DiscType[],
        myMat: [],
        isMyTurn: true,
        canPlayDisc: true,
        canStartChallenge: false,
        canRaiseBid: false,
        canPassBid: false,
        minBid: 1,
        maxBid: 0,
        attempt: null,
        selectableFlipOwnerIds: [],
        needsDiscardChoice: false,
        discardableDiscIndices: [],
        canChooseNextStarter: false,
        nextStarterOptions: [],
        lastPublicResult: null as SkullResult | null,
        ...overrides,
    };
}
