import type {
    CockroachPokerState,
    CockroachPokerAction,
    CockroachPokerResult,
    CreatureType,
} from "./types";
import { CREATURE_TYPES } from "./types";

const CARDS_PER_CREATURE = 8;
const LOSS_THRESHOLD = 4;

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function buildDeck(): CreatureType[] {
    const deck: CreatureType[] = [];
    for (const creature of CREATURE_TYPES) {
        for (let i = 0; i < CARDS_PER_CREATURE; i++) {
            deck.push(creature);
        }
    }
    return deck;
}

function hasFourOfAKind(faceUpCards: CreatureType[]): CreatureType | null {
    const counts: Partial<Record<CreatureType, number>> = {};
    for (const card of faceUpCards) {
        counts[card] = (counts[card] ?? 0) + 1;
        if (counts[card]! >= LOSS_THRESHOLD) {
            return card;
        }
    }
    return null;
}

function getNextPlayer(
    players: CockroachPokerState["players"],
    currentId: string,
): string {
    const idx = players.findIndex((p) => p.id === currentId);
    const nextIdx = (idx + 1) % players.length;
    return players[nextIdx].id;
}

export function initGame(
    inputPlayers: { id: string; name: string }[],
    shuffleFn: <T>(arr: T[]) => T[] = shuffle,
): CockroachPokerState {
    const deck = shuffleFn(buildDeck());
    const n = inputPlayers.length;
    const cardsPerPlayer = Math.floor(deck.length / n);

    const players = inputPlayers.map((p, i) => ({
        id: p.id,
        name: p.name,
        hand: deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer),
        faceUpCards: [] as CreatureType[],
    }));

    return {
        players,
        phase: "offering",
        activePlayerId: players[0].id,
        offerChain: null,
        loserId: null,
        loseReason: null,
        lastResult: null,
    };
}

function resolveCall(
    state: CockroachPokerState,
    calledTrue: boolean,
): CockroachPokerResult {
    const chain = state.offerChain!;
    const claimMatchesCard = chain.currentClaim === chain.cardValue;
    const callerCorrect = calledTrue === claimMatchesCard;

    const cardTakerId = callerCorrect
        ? chain.currentOffererId
        : chain.currentReceiverId;

    const taker = state.players.find((p) => p.id === cardTakerId)!;
    taker.faceUpCards.push(chain.cardValue);

    const fourOfAKind = hasFourOfAKind(taker.faceUpCards);
    if (fourOfAKind) {
        state.phase = "game_over";
        state.loserId = cardTakerId;
        state.loseReason = "four_of_a_kind";
        state.offerChain = null;

        const result: CockroachPokerResult = {
            type: "game_over",
            loserId: cardTakerId,
            reason: "four_of_a_kind",
        };
        state.lastResult = result;
        return result;
    }

    state.offerChain = null;
    state.activePlayerId = cardTakerId;

    if (taker.hand.length === 0) {
        state.phase = "game_over";
        state.loserId = cardTakerId;
        state.loseReason = "empty_hand";

        const result: CockroachPokerResult = {
            type: "game_over",
            loserId: cardTakerId,
            reason: "empty_hand",
        };
        state.lastResult = result;
        return result;
    }

    state.phase = "offering";

    const result: CockroachPokerResult = {
        type: "call_resolved",
        callerId: chain.currentReceiverId,
        calledTrue,
        wasCorrect: callerCorrect,
        actualCard: chain.cardValue,
        cardTakerId,
    };
    state.lastResult = result;
    return result;
}

export function processAction(
    state: CockroachPokerState,
    action: CockroachPokerAction,
): CockroachPokerResult {
    if (state.phase === "game_over") {
        return { type: "error", message: "Game is over" };
    }

    if (action.type === "offer_card") {
        if (state.phase !== "offering") {
            return { type: "error", message: "Not in offering phase" };
        }
        if (action.playerId !== state.activePlayerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (action.targetId === action.playerId) {
            return { type: "error", message: "Cannot offer to yourself" };
        }

        const player = state.players.find((p) => p.id === action.playerId);
        if (!player) {
            return { type: "error", message: "Player not found" };
        }

        const target = state.players.find((p) => p.id === action.targetId);
        if (!target) {
            return { type: "error", message: "Target not found" };
        }

        if (action.cardIndex < 0 || action.cardIndex >= player.hand.length) {
            return { type: "error", message: "Invalid card index" };
        }

        const cardValue = player.hand.splice(action.cardIndex, 1)[0];

        state.offerChain = {
            originalOffererId: action.playerId,
            cardValue,
            currentClaim: action.claim,
            currentOffererId: action.playerId,
            currentReceiverId: action.targetId,
            seenByPlayerIds: [action.playerId],
        };
        state.phase = "awaiting_response";
        state.activePlayerId = action.targetId;

        const result: CockroachPokerResult = {
            type: "card_offered",
            offererId: action.playerId,
            receiverId: action.targetId,
            claim: action.claim,
        };
        state.lastResult = result;
        return result;
    }

    if (action.type === "call_true") {
        if (state.phase !== "awaiting_response") {
            return { type: "error", message: "Not in response phase" };
        }
        if (action.playerId !== state.activePlayerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (!state.offerChain) {
            return { type: "error", message: "No active offer" };
        }

        return resolveCall(state, true);
    }

    if (action.type === "call_false") {
        if (state.phase !== "awaiting_response") {
            return { type: "error", message: "Not in response phase" };
        }
        if (action.playerId !== state.activePlayerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (!state.offerChain) {
            return { type: "error", message: "No active offer" };
        }

        return resolveCall(state, false);
    }

    if (action.type === "peek_and_pass") {
        if (state.phase !== "awaiting_response") {
            return { type: "error", message: "Not in response phase" };
        }
        if (action.playerId !== state.activePlayerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (!state.offerChain) {
            return { type: "error", message: "No active offer" };
        }

        const chain = state.offerChain;

        const unseenPlayers = state.players.filter(
            (p) =>
                p.id !== action.playerId &&
                !chain.seenByPlayerIds.includes(p.id),
        );

        if (unseenPlayers.length === 0) {
            return {
                type: "error",
                message: "You are the last player and must accept",
            };
        }

        if (action.targetId === action.playerId) {
            return { type: "error", message: "Cannot pass to yourself" };
        }

        if (chain.seenByPlayerIds.includes(action.targetId)) {
            return {
                type: "error",
                message: "That player has already seen this card",
            };
        }

        const target = state.players.find((p) => p.id === action.targetId);
        if (!target) {
            return { type: "error", message: "Target not found" };
        }

        chain.seenByPlayerIds.push(action.playerId);
        chain.currentOffererId = action.playerId;
        chain.currentReceiverId = action.targetId;
        chain.currentClaim = action.newClaim;
        state.activePlayerId = action.targetId;

        const result: CockroachPokerResult = {
            type: "card_passed",
            passerId: action.playerId,
            newReceiverId: action.targetId,
            newClaim: action.newClaim,
        };
        state.lastResult = result;
        return result;
    }

    return { type: "error", message: "Unknown action" };
}

export function removePlayer(
    state: CockroachPokerState,
    playerId: string,
): CockroachPokerResult | null {
    const idx = state.players.findIndex((p) => p.id === playerId);
    if (idx < 0) return null;

    state.players.splice(idx, 1);

    if (state.players.length < 3) {
        state.phase = "game_over";
        state.loserId = null;
        state.loseReason = null;
        state.offerChain = null;
        state.lastResult = null;
        return null;
    }

    if (state.offerChain) {
        const chain = state.offerChain;
        const involved =
            chain.currentOffererId === playerId ||
            chain.currentReceiverId === playerId ||
            chain.originalOffererId === playerId;

        if (involved) {
            state.offerChain = null;
            state.phase = "offering";

            const nextId = state.players[0].id;
            state.activePlayerId = nextId;

            if (state.players.find((p) => p.id === nextId)!.hand.length === 0) {
                state.phase = "game_over";
                state.loserId = nextId;
                state.loseReason = "empty_hand";
            }
        } else {
            chain.seenByPlayerIds = chain.seenByPlayerIds.filter(
                (id) => id !== playerId,
            );
        }
    } else if (state.activePlayerId === playerId) {
        const nextId = state.players[0].id;
        state.activePlayerId = nextId;

        if (
            state.phase === "offering" &&
            state.players.find((p) => p.id === nextId)!.hand.length === 0
        ) {
            state.phase = "game_over";
            state.loserId = nextId;
            state.loseReason = "empty_hand";
        }
    }

    return null;
}

export function endGameByHost(state: CockroachPokerState): CockroachPokerResult {
    state.phase = "game_over";
    state.offerChain = null;
    const result: CockroachPokerResult = {
        type: "game_over",
        loserId: state.loserId ?? state.activePlayerId,
        reason: "four_of_a_kind",
    };
    state.lastResult = result;
    return result;
}
