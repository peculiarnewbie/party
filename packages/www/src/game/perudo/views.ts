import type { PerudoState, FaceValue } from "./types";
import type { PerudoPlayerInfo, PerudoPlayerView } from "./schemas";

export type { PerudoPlayerInfo, PerudoPlayerView };

export function getPlayerView(
    state: PerudoState,
    playerId: string,
): PerudoPlayerView {
    const activePlayers = state.players.filter((p) => !p.eliminated);
    const currentPlayer =
        activePlayers[
            state.currentPlayerIndex % Math.max(1, activePlayers.length)
        ];
    const startingPlayer =
        activePlayers[
            state.startingPlayerIndex % Math.max(1, activePlayers.length)
        ];
    const isMyTurn = currentPlayer?.id === playerId;

    const players: PerudoPlayerInfo[] = state.players.map((p) => {
        const isCurrent = currentPlayer?.id === p.id;
        const isStarting = startingPlayer?.id === p.id;
        return {
            id: p.id,
            name: p.name,
            diceCount: p.dice.length,
            eliminated: p.eliminated,
            isCurrentPlayer: isCurrent,
            isStartingPlayer: isStarting,
            dice: p.id === playerId && !p.eliminated ? [...p.dice] : null,
        };
    });

    const activePlayerIds = activePlayers.map((p) => p.id);
    const myIndex = activePlayerIds.indexOf(playerId);
    const currentIndex = activePlayerIds.indexOf(currentPlayer?.id ?? "");
    const expectedNext =
        activePlayers.length > 1
            ? (currentIndex + 1) % activePlayers.length
            : -1;
    const canChallenge =
        isMyTurn === false &&
        state.phase === "bidding" &&
        state.currentBid !== null &&
        myIndex === expectedNext;

    let mustBet = false;
    if (
        isMyTurn &&
        state.phase === "round_start" &&
        currentPlayer?.id === playerId
    ) {
        mustBet = true;
    }

    let nextHigherBid: { quantity: number; faceValue: FaceValue } | null = null;
    if (state.currentBid) {
        const cb = state.currentBid;
        if (cb.quantity < state.totalDiceInPlay) {
            nextHigherBid = {
                quantity: cb.quantity + 1,
                faceValue: cb.faceValue,
            };
        } else {
            const nextFace = ((cb.faceValue % 6) + 1) as FaceValue;
            nextHigherBid = {
                quantity: cb.quantity,
                faceValue: nextFace,
            };
        }
    } else {
        nextHigherBid = { quantity: 1, faceValue: 1 as FaceValue };
    }

    const canBid =
        isMyTurn &&
        (state.phase === "bidding" || state.phase === "round_start");

    return {
        myId: playerId,
        phase: state.phase,
        roundNumber: state.roundNumber,
        currentBid: state.currentBid,
        bidHistory: [...state.bidHistory],
        palificoRound: state.palificoRound,
        lastChallengeResult: state.lastChallengeResult,
        winners: state.winners,
        totalDiceInPlay: state.totalDiceInPlay,
        revealTimerActive: state.revealTimerActive,
        isMyTurn,
        currentPlayerId: currentPlayer?.id ?? "",
        players,
        canBid,
        canChallenge,
        mustBet,
        nextHigherBid,
    };
}
