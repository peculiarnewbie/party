import type { Card } from "~/assets/card-deck/types";
import { getLegalActions } from "./engine";
import type { PokerEvent, PokerPlayerStatus, PokerPot, PokerState, PokerStreet } from "./types";

export type PokerVisibilityMode = "standard" | "backwards";

export interface PokerPlayerPublicView {
    id: string;
    name: string;
    stack: number;
    status: PokerPlayerStatus;
    connected: boolean;
    committedThisStreet: number;
    committedThisHand: number;
    holeCardCount: number;
    visibleHoleCards: Card[];
    isDealer: boolean;
    isSmallBlind: boolean;
    isBigBlind: boolean;
    isActing: boolean;
}

export interface PokerPlayerView {
    myHoleCards: Card[];
    myHoleCardCount: number;
    myStack: number;
    myStatus: PokerPlayerStatus | "spectator" | null;
    isSpectator: boolean;
    legalActions: string[];
    callAmount: number;
    minBetOrRaise: number | null;
    maxBet: number;
    players: PokerPlayerPublicView[];
    board: Card[];
    pots: PokerPot[];
    actingPlayerId: string | null;
    street: PokerStreet;
    handNumber: number;
    eventLog: PokerEvent[];
    spectators: { id: string; name: string }[];
    endedByHost: boolean;
    winnerIds: string[] | null;
}

function getMyVisibleHoleCards(
    holeCards: Card[],
    visibilityMode: PokerVisibilityMode,
): Card[] {
    if (visibilityMode === "backwards") {
        return [];
    }

    return [...holeCards];
}

function getSeatVisibleHoleCards(
    viewerId: string,
    targetPlayerId: string,
    viewerIsSeated: boolean,
    holeCards: Card[],
    visibilityMode: PokerVisibilityMode,
): Card[] {
    if (!viewerIsSeated) {
        return [];
    }

    if (visibilityMode === "backwards" && viewerId !== targetPlayerId) {
        return [...holeCards];
    }

    return [];
}

export function getPlayerView(
    state: PokerState,
    playerId: string,
    visibilityMode: PokerVisibilityMode = "standard",
): PokerPlayerView {
    const me = state.players.find((player) => player.id === playerId);
    const legal = me ? getLegalActions(state, playerId) : {
        legalActions: [],
        callAmount: 0,
        minBetOrRaise: null,
        maxBet: 0,
    };

    return {
        myHoleCards: me ? getMyVisibleHoleCards(me.holeCards, visibilityMode) : [],
        myHoleCardCount: me?.holeCards.length ?? 0,
        myStack: me?.stack ?? 0,
        myStatus: me ? me.status : "spectator",
        isSpectator: !me,
        legalActions: legal.legalActions,
        callAmount: legal.callAmount,
        minBetOrRaise: legal.minBetOrRaise,
        maxBet: legal.maxBet,
        players: state.players.map((player, index) => ({
            id: player.id,
            name: player.name,
            stack: player.stack,
            status: player.status,
            connected: player.connected,
            committedThisStreet: player.committedThisStreet,
            committedThisHand: player.committedThisHand,
            holeCardCount: player.holeCards.length,
            visibleHoleCards: getSeatVisibleHoleCards(
                playerId,
                player.id,
                !!me,
                player.holeCards,
                visibilityMode,
            ),
            isDealer: index === state.dealerIndex,
            isSmallBlind: index === state.smallBlindIndex,
            isBigBlind: index === state.bigBlindIndex,
            isActing: index === state.actingPlayerIndex,
        })),
        board: [...state.board],
        pots: state.pots.map((pot) => ({
            amount: pot.amount,
            eligiblePlayerIds: [...pot.eligiblePlayerIds],
        })),
        actingPlayerId:
            state.actingPlayerIndex === null
                ? null
                : state.players[state.actingPlayerIndex]?.id ?? null,
        street: state.street,
        handNumber: state.handNumber,
        eventLog: [...state.eventLog],
        spectators: state.spectators.map((spectator) => ({ ...spectator })),
        endedByHost: state.endedByHost,
        winnerIds: state.winnerIds ? [...state.winnerIds] : null,
    };
}
