import type {
    CockroachPokerState,
    CockroachPokerPhase,
    CockroachPokerResult,
    CreatureType,
} from "./types";

export interface CockroachPokerPlayerInfo {
    id: string;
    name: string;
    handCount: number;
    faceUpCards: CreatureType[];
}

export interface OfferChainView {
    originalOffererId: string;
    currentOffererId: string;
    currentReceiverId: string;
    currentClaim: CreatureType;
    seenByPlayerIds: string[];
    peekedCard: CreatureType | null;
    mustAccept: boolean;
}

export interface CockroachPokerPlayerView {
    myId: string;
    phase: CockroachPokerPhase;
    activePlayerId: string;
    isMyTurn: boolean;
    players: CockroachPokerPlayerInfo[];
    myHand: CreatureType[];
    offerChain: OfferChainView | null;
    loserId: string | null;
    loseReason: "four_of_a_kind" | "empty_hand" | null;
    lastResult: CockroachPokerResult | null;
    validPassTargets: string[];
    validOfferTargets: string[];
}

export function getPlayerView(
    state: CockroachPokerState,
    playerId: string,
): CockroachPokerPlayerView {
    const me = state.players.find((p) => p.id === playerId);

    const players: CockroachPokerPlayerInfo[] = state.players.map((p) => ({
        id: p.id,
        name: p.name,
        handCount: p.hand.length,
        faceUpCards: [...p.faceUpCards],
    }));

    const myHand = me ? [...me.hand] : [];

    let offerChain: OfferChainView | null = null;
    let validPassTargets: string[] = [];

    if (state.offerChain) {
        const chain = state.offerChain;

        const hasPeeked = chain.seenByPlayerIds.includes(playerId);
        const peekedCard = hasPeeked ? chain.cardValue : null;

        const unseenPlayers = state.players.filter(
            (p) =>
                p.id !== chain.currentReceiverId &&
                !chain.seenByPlayerIds.includes(p.id),
        );
        const mustAccept = unseenPlayers.length === 0;

        offerChain = {
            originalOffererId: chain.originalOffererId,
            currentOffererId: chain.currentOffererId,
            currentReceiverId: chain.currentReceiverId,
            currentClaim: chain.currentClaim,
            seenByPlayerIds: [...chain.seenByPlayerIds],
            peekedCard,
            mustAccept,
        };

        if (playerId === chain.currentReceiverId && !mustAccept) {
            validPassTargets = unseenPlayers.map((p) => p.id);
        }
    }

    const validOfferTargets =
        state.phase === "offering" && playerId === state.activePlayerId
            ? state.players.filter((p) => p.id !== playerId).map((p) => p.id)
            : [];

    return {
        myId: playerId,
        phase: state.phase,
        activePlayerId: state.activePlayerId,
        isMyTurn: playerId === state.activePlayerId,
        players,
        myHand,
        offerChain,
        loserId: state.loserId,
        loseReason: state.loseReason,
        lastResult: state.lastResult,
        validPassTargets,
        validOfferTargets,
    };
}
