import { SUITS, RANKS } from "~/assets/card-deck/types";
import type { Card } from "~/assets/card-deck/types";
import type {
    BlackjackState,
    BlackjackPlayer,
    BlackjackHand,
    BlackjackAction,
    BlackjackResult,
    RoundResult,
    HandResult,
} from "./types";

export const STARTING_CHIPS = 1000;
export const MIN_BET = 10;
export const MAX_BET = 500;
export const DECK_COUNT = 6;
export const SHOE_RESHUFFLE_THRESHOLD = 78;
export const MAX_SPLITS = 3;

function defaultShuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export function createShoe(
    deckCount: number = DECK_COUNT,
    shuffle: <T>(arr: T[]) => T[] = defaultShuffle,
): Card[] {
    const cards: Card[] = [];
    for (let d = 0; d < deckCount; d++) {
        for (const suit of SUITS) {
            for (const rank of RANKS) {
                cards.push({ suit, rank });
            }
        }
    }
    return shuffle(cards);
}

export function getHandValue(cards: Card[]): { value: number; soft: boolean } {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
        if (card.rank === 1) {
            aces++;
            total += 11;
        } else if (card.rank >= 11) {
            total += 10;
        } else {
            total += card.rank;
        }
    }

    let softAces = aces;
    while (total > 21 && softAces > 0) {
        total -= 10;
        softAces--;
    }

    return { value: total, soft: softAces > 0 };
}

export function isNaturalBlackjack(cards: Card[]): boolean {
    return cards.length === 2 && getHandValue(cards).value === 21;
}

export function isHandDone(hand: BlackjackHand): boolean {
    return hand.stood || hand.busted || hand.isBlackjack;
}

export function canSplit(player: BlackjackPlayer, hand: BlackjackHand): boolean {
    if (hand.cards.length !== 2) return false;
    if (player.hands.length - 1 >= MAX_SPLITS) return false;

    const v1 = hand.cards[0].rank >= 11 ? 10 : hand.cards[0].rank;
    const v2 = hand.cards[1].rank >= 11 ? 10 : hand.cards[1].rank;
    if (v1 !== v2) return false;

    if (player.chips < hand.bet) return false;
    return true;
}

export function canDoubleDown(
    player: BlackjackPlayer,
    hand: BlackjackHand,
): boolean {
    if (hand.cards.length !== 2) return false;
    if (player.chips < hand.bet) return false;
    return true;
}

function drawCard(state: BlackjackState): Card {
    if (state.shoe.length === 0) {
        state.shoe = createShoe(state.deckCount);
    }
    return state.shoe.pop()!;
}

function burnCard(state: BlackjackState): void {
    state.burnPile.push(drawCard(state));
}

function createHand(
    cards: Card[],
    bet: number,
    fromSplit = false,
): BlackjackHand {
    return {
        cards,
        bet,
        doubled: false,
        stood: false,
        busted: false,
        isBlackjack: !fromSplit && isNaturalBlackjack(cards),
        fromSplit,
    };
}

function advanceToNextHand(state: BlackjackState): void {
    const player = state.players[state.currentPlayerIndex];
    if (!player) return;

    const nextIdx = player.currentHandIndex + 1;
    if (nextIdx < player.hands.length) {
        player.currentHandIndex = nextIdx;
        if (isHandDone(player.hands[nextIdx])) {
            advanceToNextHand(state);
        }
        return;
    }

    player.done = true;
    advanceToNextPlayer(state);
}

function advanceToNextPlayer(state: BlackjackState): void {
    let next = state.currentPlayerIndex + 1;
    while (next < state.players.length && state.players[next].done) {
        next++;
    }

    if (next >= state.players.length) {
        playDealer(state);
        settleRound(state);
        return;
    }

    state.currentPlayerIndex = next;
}

function playDealer(state: BlackjackState): void {
    state.dealerRevealed = true;
    state.phase = "dealer_turn";

    const allBusted = state.players.every((p) =>
        p.hands.every((h) => h.busted),
    );
    if (allBusted) return;

    while (true) {
        const { value, soft } = getHandValue(state.dealerHand);
        if (value > 21) break;
        if (value > 17) break;
        if (value === 17 && !soft) break;
        state.dealerHand.push(drawCard(state));
    }
}

function settleRound(state: BlackjackState): void {
    state.phase = "settled";
    state.dealerRevealed = true;

    const dealerValue = getHandValue(state.dealerHand).value;
    const dealerBusted = dealerValue > 21;
    const dealerBJ = isNaturalBlackjack(state.dealerHand);

    const results: RoundResult[] = [];

    for (const player of state.players) {
        const handResults: HandResult[] = [];
        let totalPayout = 0;

        for (let i = 0; i < player.hands.length; i++) {
            const hand = player.hands[i];
            const handValue = getHandValue(hand.cards).value;
            let outcome: HandResult["outcome"];
            let payout = 0;

            if (hand.busted) {
                outcome = "bust";
                payout = 0;
            } else if (hand.isBlackjack && !dealerBJ) {
                outcome = "blackjack";
                payout = hand.bet + Math.floor(hand.bet * 1.5);
            } else if (hand.isBlackjack && dealerBJ) {
                outcome = "push";
                payout = hand.bet;
            } else if (dealerBJ) {
                outcome = "lose";
                payout = 0;
            } else if (dealerBusted) {
                outcome = "win";
                payout = hand.bet * 2;
            } else if (handValue > dealerValue) {
                outcome = "win";
                payout = hand.bet * 2;
            } else if (handValue === dealerValue) {
                outcome = "push";
                payout = hand.bet;
            } else {
                outcome = "lose";
                payout = 0;
            }

            totalPayout += payout;
            handResults.push({ handIndex: i, bet: hand.bet, payout, outcome });
        }

        let insurancePayout = 0;
        if (player.insuranceBet > 0 && dealerBJ) {
            insurancePayout = player.insuranceBet * 3;
        }

        const totalBet =
            player.hands.reduce((s, h) => s + h.bet, 0) +
            player.insuranceBet;
        const netChips = totalPayout + insurancePayout - totalBet;

        player.chips += totalPayout + insurancePayout;

        results.push({
            playerId: player.id,
            playerName: player.name,
            hands: handResults,
            insurancePayout,
            netChips,
        });
    }

    state.results = results;
}

function dealCards(state: BlackjackState): boolean {
    burnCard(state);

    for (const player of state.players) {
        if (player.done) continue;
        const cards = [drawCard(state), drawCard(state)];
        player.hands = [createHand(cards, player.bet)];
        player.currentHandIndex = 0;
    }

    state.dealerHand = [drawCard(state), drawCard(state)];
    state.dealerRevealed = false;

    return state.dealerHand[0].rank === 1;
}

function startPlayingPhase(state: BlackjackState): void {
    state.phase = "playing";

    for (const player of state.players) {
        if (player.done) continue;
        if (player.hands.length === 1 && player.hands[0].isBlackjack) {
            player.done = true;
        }
    }

    state.currentPlayerIndex = 0;
    while (
        state.currentPlayerIndex < state.players.length &&
        state.players[state.currentPlayerIndex].done
    ) {
        state.currentPlayerIndex++;
    }

    if (state.currentPlayerIndex >= state.players.length) {
        playDealer(state);
        settleRound(state);
    }
}

export function initGame(
    players: { id: string; name: string }[],
    shuffle?: <T>(arr: T[]) => T[],
): BlackjackState {
    return {
        players: players.map((p) => ({
            id: p.id,
            name: p.name,
            chips: STARTING_CHIPS,
            hands: [],
            currentHandIndex: 0,
            bet: 0,
            insuranceBet: 0,
            insuranceDecided: false,
            done: false,
        })),
        shoe: createShoe(DECK_COUNT, shuffle ?? defaultShuffle),
        burnPile: [],
        dealerHand: [],
        dealerRevealed: false,
        currentPlayerIndex: 0,
        phase: "betting",
        roundNumber: 1,
        deckCount: DECK_COUNT,
        cutCardPosition: SHOE_RESHUFFLE_THRESHOLD,
        results: null,
    };
}

export function processAction(
    state: BlackjackState,
    action: BlackjackAction,
): BlackjackResult {
    if (action.type === "new_round") {
        if (state.phase !== "settled") {
            return { type: "error", message: "Cannot start new round now" };
        }

        if (state.shoe.length < state.cutCardPosition) {
            state.shoe = createShoe(state.deckCount);
            state.burnPile = [];
        }

        state.roundNumber++;
        state.phase = "betting";
        state.dealerHand = [];
        state.dealerRevealed = false;
        state.results = null;

        for (const player of state.players) {
            player.hands = [];
            player.currentHandIndex = 0;
            player.bet = 0;
            player.insuranceBet = 0;
            player.insuranceDecided = false;
            player.done = player.chips < MIN_BET;
        }

        return { type: "new_round", roundNumber: state.roundNumber };
    }

    if (action.type === "place_bet") {
        if (state.phase !== "betting") {
            return { type: "error", message: "Not in betting phase" };
        }

        const player = state.players.find((p) => p.id === action.playerId);
        if (!player) return { type: "error", message: "Player not found" };
        if (player.done) return { type: "error", message: "Sitting out" };
        if (player.bet > 0) return { type: "error", message: "Already bet" };

        const amount = Math.max(
            MIN_BET,
            Math.min(MAX_BET, action.amount, player.chips),
        );
        player.bet = amount;
        player.chips -= amount;

        const active = state.players.filter((p) => !p.done);
        if (!active.every((p) => p.bet > 0)) {
            return {
                type: "bet_placed",
                playerId: action.playerId,
                amount,
            };
        }

        const insuranceOffered = dealCards(state);

        if (insuranceOffered) {
            state.phase = "insurance";
            return { type: "dealt", insuranceOffered: true };
        }

        const upCard = state.dealerHand[0];
        const upValue =
            upCard.rank === 1 ? 11 : upCard.rank >= 11 ? 10 : upCard.rank;
        if (upValue === 10 && isNaturalBlackjack(state.dealerHand)) {
            state.dealerRevealed = true;
            settleRound(state);
            return { type: "settled", results: state.results! };
        }

        startPlayingPhase(state);

        if (state.results) {
            return { type: "settled", results: state.results };
        }

        return { type: "dealt", insuranceOffered: false };
    }

    if (action.type === "insurance") {
        if (state.phase !== "insurance") {
            return { type: "error", message: "Not in insurance phase" };
        }

        const player = state.players.find((p) => p.id === action.playerId);
        if (!player) return { type: "error", message: "Player not found" };
        if (player.done) return { type: "error", message: "Sitting out" };
        if (player.insuranceDecided) {
            return { type: "error", message: "Already decided" };
        }

        player.insuranceDecided = true;
        if (action.accept) {
            const amt = Math.floor(player.bet / 2);
            if (player.chips >= amt) {
                player.insuranceBet = amt;
                player.chips -= amt;
            }
        }

        const active = state.players.filter((p) => !p.done);
        if (!active.every((p) => p.insuranceDecided)) {
            return {
                type: "bet_placed",
                playerId: action.playerId,
                amount: player.insuranceBet,
            };
        }

        const dealerBJ = isNaturalBlackjack(state.dealerHand);

        if (dealerBJ) {
            state.dealerRevealed = true;
            settleRound(state);
            return { type: "insurance_resolved", dealerBlackjack: true };
        }

        startPlayingPhase(state);

        if (state.results) {
            return { type: "settled", results: state.results };
        }

        return { type: "insurance_resolved", dealerBlackjack: false };
    }

    if (action.type === "hit") {
        if (state.phase !== "playing") {
            return { type: "error", message: "Not in playing phase" };
        }

        const player = state.players[state.currentPlayerIndex];
        if (!player || player.id !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }

        const hand = player.hands[player.currentHandIndex];
        if (!hand || isHandDone(hand)) {
            return { type: "error", message: "Hand is done" };
        }

        hand.cards.push(drawCard(state));
        const { value } = getHandValue(hand.cards);
        const hi = player.currentHandIndex;

        if (value > 21) {
            hand.busted = true;
            advanceToNextHand(state);
            return {
                type: "player_hit",
                playerId: action.playerId,
                handIndex: hi,
                busted: true,
            };
        }

        if (value === 21) {
            hand.stood = true;
            advanceToNextHand(state);
            return {
                type: "player_hit",
                playerId: action.playerId,
                handIndex: hi,
                busted: false,
            };
        }

        return {
            type: "player_hit",
            playerId: action.playerId,
            handIndex: player.currentHandIndex,
            busted: false,
        };
    }

    if (action.type === "stand") {
        if (state.phase !== "playing") {
            return { type: "error", message: "Not in playing phase" };
        }

        const player = state.players[state.currentPlayerIndex];
        if (!player || player.id !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }

        const hand = player.hands[player.currentHandIndex];
        if (!hand || isHandDone(hand)) {
            return { type: "error", message: "Hand is done" };
        }

        hand.stood = true;
        const hi = player.currentHandIndex;
        advanceToNextHand(state);

        return {
            type: "player_stood",
            playerId: action.playerId,
            handIndex: hi,
        };
    }

    if (action.type === "double_down") {
        if (state.phase !== "playing") {
            return { type: "error", message: "Not in playing phase" };
        }

        const player = state.players[state.currentPlayerIndex];
        if (!player || player.id !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }

        const hand = player.hands[player.currentHandIndex];
        if (!hand || isHandDone(hand)) {
            return { type: "error", message: "Hand is done" };
        }

        if (!canDoubleDown(player, hand)) {
            return { type: "error", message: "Cannot double down" };
        }

        player.chips -= hand.bet;
        hand.bet *= 2;
        hand.doubled = true;

        hand.cards.push(drawCard(state));
        const { value } = getHandValue(hand.cards);
        hand.busted = value > 21;
        hand.stood = true;

        const hi = player.currentHandIndex;
        advanceToNextHand(state);

        return {
            type: "player_doubled",
            playerId: action.playerId,
            handIndex: hi,
            busted: hand.busted,
        };
    }

    if (action.type === "split") {
        if (state.phase !== "playing") {
            return { type: "error", message: "Not in playing phase" };
        }

        const player = state.players[state.currentPlayerIndex];
        if (!player || player.id !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }

        const hand = player.hands[player.currentHandIndex];
        if (!hand || isHandDone(hand)) {
            return { type: "error", message: "Hand is done" };
        }

        if (!canSplit(player, hand)) {
            return { type: "error", message: "Cannot split" };
        }

        const splitBet = hand.bet;
        player.chips -= splitBet;

        const card1 = hand.cards[0];
        const card2 = hand.cards[1];
        const splittingAces = card1.rank === 1;

        const hand1: BlackjackHand = {
            cards: [card1, drawCard(state)],
            bet: splitBet,
            doubled: false,
            stood: splittingAces,
            busted: false,
            isBlackjack: false,
            fromSplit: true,
        };

        const hand2: BlackjackHand = {
            cards: [card2, drawCard(state)],
            bet: splitBet,
            doubled: false,
            stood: splittingAces,
            busted: false,
            isBlackjack: false,
            fromSplit: true,
        };

        if (!splittingAces) {
            if (getHandValue(hand1.cards).value === 21) hand1.stood = true;
            if (getHandValue(hand2.cards).value === 21) hand2.stood = true;
        }

        player.hands.splice(player.currentHandIndex, 1, hand1, hand2);

        if (isHandDone(hand1)) {
            advanceToNextHand(state);
        }

        return { type: "player_split", playerId: action.playerId };
    }

    return { type: "error", message: "Unknown action" };
}

export function removePlayer(
    state: BlackjackState,
    playerId: string,
): BlackjackResult | null {
    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex < 0) return null;

    state.players.splice(playerIndex, 1);
    if (state.results) {
        state.results = state.results.filter((result) => result.playerId !== playerId);
    }

    if (state.players.length === 0) {
        state.phase = "settled";
        state.results = [];
        state.currentPlayerIndex = 0;
        return { type: "settled", results: [] };
    }

    if (playerIndex < state.currentPlayerIndex) {
        state.currentPlayerIndex -= 1;
    }
    if (state.currentPlayerIndex >= state.players.length) {
        state.currentPlayerIndex = state.players.length - 1;
    }

    if (state.phase === "betting") {
        const activePlayers = state.players.filter((player) => !player.done);
        if (activePlayers.length === 0) {
            state.phase = "settled";
            state.results = [];
            return { type: "settled", results: [] };
        }

        if (!activePlayers.every((player) => player.bet > 0)) {
            return null;
        }

        const insuranceOffered = dealCards(state);

        if (insuranceOffered) {
            state.phase = "insurance";
            return { type: "dealt", insuranceOffered: true };
        }

        const upCard = state.dealerHand[0];
        const upValue =
            upCard.rank === 1 ? 11 : upCard.rank >= 11 ? 10 : upCard.rank;
        if (upValue === 10 && isNaturalBlackjack(state.dealerHand)) {
            state.dealerRevealed = true;
            settleRound(state);
            return { type: "settled", results: state.results! };
        }

        startPlayingPhase(state);

        if (state.results) {
            return { type: "settled", results: state.results };
        }

        return { type: "dealt", insuranceOffered: false };
    }

    if (state.phase === "insurance") {
        const activePlayers = state.players.filter((player) => !player.done);
        if (activePlayers.length === 0) {
            state.phase = "settled";
            state.results = [];
            return { type: "settled", results: [] };
        }

        if (!activePlayers.every((player) => player.insuranceDecided)) {
            return null;
        }

        const dealerBJ = isNaturalBlackjack(state.dealerHand);

        if (dealerBJ) {
            state.dealerRevealed = true;
            settleRound(state);
            return { type: "insurance_resolved", dealerBlackjack: true };
        }

        startPlayingPhase(state);

        if (state.results) {
            return { type: "settled", results: state.results };
        }

        return { type: "insurance_resolved", dealerBlackjack: false };
    }

    if (state.phase === "playing") {
        while (
            state.currentPlayerIndex < state.players.length &&
            state.players[state.currentPlayerIndex].done
        ) {
            state.currentPlayerIndex += 1;
        }

        if (state.currentPlayerIndex >= state.players.length) {
            playDealer(state);
            settleRound(state);
            return { type: "settled", results: state.results! };
        }
    }

    return null;
}
