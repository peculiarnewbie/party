import type { Card } from "~/assets/card-deck/types";
import type {
    BlackjackState,
    BlackjackPhase,
    RoundResult,
} from "./types";
import {
    getHandValue,
    isHandDone,
    canSplit,
    canDoubleDown,
} from "./engine";

export interface PlayerHandView {
    cards: Card[];
    bet: number;
    doubled: boolean;
    stood: boolean;
    busted: boolean;
    isBlackjack: boolean;
    value: number;
    soft: boolean;
}

export interface PlayerInfoView {
    id: string;
    name: string;
    chips: number;
    hands: PlayerHandView[];
    currentHandIndex: number;
    done: boolean;
    bet: number;
    insuranceBet: number;
    insuranceDecided: boolean;
}

export interface DealerView {
    cards: (Card | "hidden")[];
    value: number | null;
    upCardValue: number | null;
    busted: boolean;
}

export interface BlackjackPlayerView {
    phase: BlackjackPhase;
    roundNumber: number;
    myId: string;
    dealer: DealerView;
    players: PlayerInfoView[];
    currentPlayerIndex: number;
    results: RoundResult[] | null;
    shoeCount: number;
    canHit: boolean;
    canStand: boolean;
    canDouble: boolean;
    canSplit: boolean;
    isMyTurn: boolean;
    needsBet: boolean;
    needsInsurance: boolean;
}

export function getPlayerView(
    state: BlackjackState,
    playerId: string,
): BlackjackPlayerView {
    const me = state.players.find((p) => p.id === playerId);
    const isMyTurn =
        state.phase === "playing" &&
        state.players[state.currentPlayerIndex]?.id === playerId;

    const currentHand =
        isMyTurn && me ? me.hands[me.currentHandIndex] : null;

    const dealerCards: (Card | "hidden")[] = state.dealerHand.map(
        (card, i) => {
            if (i === 1 && !state.dealerRevealed) return "hidden";
            return card;
        },
    );

    let upCardValue: number | null = null;
    if (state.dealerHand.length > 0) {
        upCardValue = getHandValue([state.dealerHand[0]]).value;
    }

    return {
        phase: state.phase,
        roundNumber: state.roundNumber,
        myId: playerId,
        dealer: {
            cards: state.dealerHand.length > 0 ? dealerCards : [],
            value: state.dealerRevealed
                ? getHandValue(state.dealerHand).value
                : null,
            upCardValue,
            busted:
                state.dealerRevealed &&
                getHandValue(state.dealerHand).value > 21,
        },
        players: state.players.map((p) => ({
            id: p.id,
            name: p.name,
            chips: p.chips,
            hands: p.hands.map((h) => {
                const { value, soft } = getHandValue(h.cards);
                return {
                    cards: [...h.cards],
                    bet: h.bet,
                    doubled: h.doubled,
                    stood: h.stood,
                    busted: h.busted,
                    isBlackjack: h.isBlackjack,
                    value,
                    soft,
                };
            }),
            currentHandIndex: p.currentHandIndex,
            done: p.done,
            bet: p.bet,
            insuranceBet: p.insuranceBet,
            insuranceDecided: p.insuranceDecided,
        })),
        currentPlayerIndex: state.currentPlayerIndex,
        results: state.results,
        shoeCount: state.shoe.length,
        canHit:
            isMyTurn && !!currentHand && !isHandDone(currentHand),
        canStand:
            isMyTurn && !!currentHand && !isHandDone(currentHand),
        canDouble:
            isMyTurn &&
            !!currentHand &&
            !!me &&
            !isHandDone(currentHand) &&
            canDoubleDown(me, currentHand),
        canSplit:
            isMyTurn &&
            !!currentHand &&
            !!me &&
            !isHandDone(currentHand) &&
            canSplit(me, currentHand),
        isMyTurn,
        needsBet:
            state.phase === "betting" &&
            !!me &&
            me.bet === 0 &&
            !me.done,
        needsInsurance:
            state.phase === "insurance" &&
            !!me &&
            !me.insuranceDecided &&
            !me.done,
    };
}
