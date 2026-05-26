import { getLegalActions } from "./engine";
import type {
    PokerActionType,
    PokerEvent,
    PokerPlayerStatus,
    PokerPot,
    PokerState,
    PokerStreet,
} from "./types";
import type {
    PokerPlayerPublicView,
    PokerPlayerView,
} from "./schemas";

export type PokerVisibilityMode = "standard" | "backwards";

export type { PokerPlayerPublicView, PokerPlayerView };

function getMyVisibleHoleCards(
    holeCards: PokerPlayerView["myHoleCards"],
    visibilityMode: PokerVisibilityMode,
): PokerPlayerView["myHoleCards"] {
    if (visibilityMode === "backwards") {
        return [];
    }

    return [...holeCards];
}

function getSeatVisibleHoleCards(
    viewerId: string,
    targetPlayerId: string,
    viewerIsSeated: boolean,
    holeCards: PokerPlayerView["myHoleCards"],
    visibilityMode: PokerVisibilityMode,
): PokerPlayerView["myHoleCards"] {
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
    viewerId: string,
    visibilityMode: PokerVisibilityMode = "standard",
): PokerPlayerView {
    const viewerIsSeated = state.players.some(
        (player) => player.id === viewerId,
    );
    const me = state.players.find((player) => player.id === viewerId);
    const actingPlayer =
        state.actingPlayerIndex === null
            ? null
            : state.players[state.actingPlayerIndex];

    const players: PokerPlayerPublicView[] = state.players.map(
        (player, index) => ({
            id: player.id,
            name: player.name,
            stack: player.stack,
            status: player.status,
            connected: player.connected,
            committedThisStreet: player.committedThisStreet,
            committedThisHand: player.committedThisHand,
            holeCardCount: player.holeCards.length,
            visibleHoleCards: getSeatVisibleHoleCards(
                viewerId,
                player.id,
                viewerIsSeated,
                player.holeCards,
                visibilityMode,
            ),
            isDealer: index === state.dealerIndex,
            isSmallBlind: index === state.smallBlindIndex,
            isBigBlind: index === state.bigBlindIndex,
            isActing: index === state.actingPlayerIndex,
        }),
    );

    const actionContext = me
        ? getLegalActions(state, me.id)
        : {
              legalActions: [] as PokerActionType[],
              callAmount: 0,
              minBetOrRaise: null,
              maxBet: 0,
          };

    return {
        myHoleCards: me
            ? getMyVisibleHoleCards(me.holeCards, visibilityMode)
            : [],
        myHoleCardCount: me?.holeCards.length ?? 0,
        myStack: me?.stack ?? 0,
        myStatus: me?.status ?? "spectator",
        isSpectator: !me,
        legalActions: actionContext.legalActions,
        callAmount: actionContext.callAmount,
        minBetOrRaise: actionContext.minBetOrRaise,
        maxBet: actionContext.maxBet,
        players,
        board: [...state.board],
        pots: state.pots.map((pot: PokerPot) => ({
            amount: pot.amount,
            eligiblePlayerIds: [...pot.eligiblePlayerIds],
        })),
        actingPlayerId: actingPlayer?.id ?? null,
        street: state.street as PokerStreet,
        handNumber: state.handNumber,
        eventLog: state.eventLog.map((event: PokerEvent) => ({ ...event })),
        spectators: state.spectators.map((spectator) => ({ ...spectator })),
        endedByHost: state.endedByHost,
        winnerIds: state.winnerIds ? [...state.winnerIds] : null,
    };
}
