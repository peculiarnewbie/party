import type { DiscType, SkullPhase, SkullResult, SkullState } from "./types";

export interface SkullPlayerInfo {
    id: string;
    name: string;
    handCount: number;
    matCount: number;
    faceDownCount: number;
    successfulChallenges: number;
    eliminated: boolean;
    isCurrentPlayer: boolean;
    isStarter: boolean;
    isHighestBidder: boolean;
    hasPassed: boolean;
    revealedDiscs: DiscType[];
}

export interface SkullAttemptView {
    challengerId: string;
    target: number;
    revealedCount: number;
    autoRevealDone: boolean;
    revealedSteps: {
        ownerId: string;
        disc: DiscType;
        automatic: boolean;
    }[];
}

export interface SkullPlayerView {
    myId: string;
    phase: SkullPhase;
    roundNumber: number;
    currentPlayerId: string;
    starterPlayerId: string;
    highestBid: number | null;
    highestBidderId: string | null;
    passedBidderIds: string[];
    penaltyPlayerId: string | null;
    penaltyChooserId: string | null;
    penaltyTargetHandCount: number;
    pendingNextStarterChooserId: string | null;
    winnerId: string | null;
    players: SkullPlayerInfo[];
    myHand: DiscType[];
    myMat: DiscType[];
    isMyTurn: boolean;
    canPlayDisc: boolean;
    canStartChallenge: boolean;
    canRaiseBid: boolean;
    canPassBid: boolean;
    minBid: number;
    maxBid: number;
    attempt: SkullAttemptView | null;
    selectableFlipOwnerIds: string[];
    needsDiscardChoice: boolean;
    discardableDiscIndices: number[];
    canChooseNextStarter: boolean;
    nextStarterOptions: string[];
    lastPublicResult: SkullResult | null;
}

function getRevealedDiscs(state: SkullState, ownerId: string) {
    const player = state.players.find((entry) => entry.id === ownerId);
    if (!player || !state.attempt) {
        return [] as DiscType[];
    }

    const revealedCount = state.attempt.revealedSteps.filter(
        (step) => step.ownerId === ownerId,
    ).length;

    return player.mat.slice(player.mat.length - revealedCount).reverse();
}

export function getPlayerView(
    state: SkullState,
    playerId: string,
    lastPublicResult: SkullResult | null = null,
): SkullPlayerView {
    const me = state.players.find((player) => player.id === playerId);
    const myHand = me ? [...me.hand] : [];
    const myMat = me ? [...me.mat] : [];
    const maxBid = state.players.reduce((total, player) => total + player.mat.length, 0);
    const minBid = (state.highestBid ?? 0) + 1;
    const selectableFlipOwnerIds =
        state.phase === "attempt" &&
        state.attempt &&
        state.attempt.challengerId === playerId &&
        state.attempt.autoRevealDone
            ? state.players
                  .filter(
                      (player) =>
                          player.id !== playerId &&
                          !player.eliminated &&
                          player.mat.length > getRevealedDiscs(state, player.id).length,
                  )
                  .map((player) => player.id)
            : [];

    const penaltyTarget = state.penaltyPlayerId
        ? state.players.find((player) => player.id === state.penaltyPlayerId)
        : null;
    const penaltyTargetHandCount = penaltyTarget?.hand.length ?? 0;

    return {
        myId: playerId,
        phase: state.phase,
        roundNumber: state.roundNumber,
        currentPlayerId: state.currentPlayerId,
        starterPlayerId: state.starterPlayerId,
        highestBid: state.highestBid,
        highestBidderId: state.highestBidderId,
        passedBidderIds: [...state.passedBidderIds],
        penaltyPlayerId: state.penaltyPlayerId,
        penaltyChooserId: state.penaltyChooserId,
        penaltyTargetHandCount,
        pendingNextStarterChooserId: state.pendingNextStarterChooserId,
        winnerId: state.winnerId,
        players: state.players.map((player) => {
            const revealedDiscs = getRevealedDiscs(state, player.id);
            return {
                id: player.id,
                name: player.name,
                handCount: player.hand.length,
                matCount: player.mat.length,
                faceDownCount: player.mat.length - revealedDiscs.length,
                successfulChallenges: player.successfulChallenges,
                eliminated: player.eliminated,
                isCurrentPlayer: state.currentPlayerId === player.id,
                isStarter: state.starterPlayerId === player.id,
                isHighestBidder: state.highestBidderId === player.id,
                hasPassed: state.passedBidderIds.includes(player.id),
                revealedDiscs,
            };
        }),
        myHand,
        myMat,
        isMyTurn: state.currentPlayerId === playerId,
        canPlayDisc:
            (state.phase === "turn_prep" || state.phase === "building") &&
            state.currentPlayerId === playerId &&
            myHand.length > 0,
        canStartChallenge:
            state.phase === "building" &&
            state.currentPlayerId === playerId &&
            maxBid > 0,
        canRaiseBid:
            state.phase === "auction" &&
            state.currentPlayerId === playerId &&
            state.highestBid !== null &&
            minBid <= maxBid &&
            state.highestBidderId !== playerId,
        canPassBid:
            state.phase === "auction" &&
            state.currentPlayerId === playerId &&
            state.highestBidderId !== playerId,
        minBid,
        maxBid,
        attempt: state.attempt
            ? {
                  challengerId: state.attempt.challengerId,
                  target: state.attempt.target,
                  revealedCount: state.attempt.revealedCount,
                  autoRevealDone: state.attempt.autoRevealDone,
                  revealedSteps: state.attempt.revealedSteps.map((step) => ({
                      ownerId: step.ownerId,
                      disc: step.disc,
                      automatic: step.automatic,
                  })),
              }
            : null,
        selectableFlipOwnerIds,
        needsDiscardChoice:
            state.phase === "penalty" && state.penaltyChooserId === playerId,
        discardableDiscIndices:
            state.phase === "penalty" && state.penaltyChooserId === playerId
                ? Array.from({ length: penaltyTargetHandCount }, (_, index) => index)
                : [],
        canChooseNextStarter:
            state.phase === "next_starter" &&
            state.pendingNextStarterChooserId === playerId,
        nextStarterOptions:
            state.phase === "next_starter" &&
            state.pendingNextStarterChooserId === playerId
                ? state.players
                      .filter((player) => !player.eliminated)
                      .map((player) => player.id)
                : [],
        lastPublicResult,
    };
}
