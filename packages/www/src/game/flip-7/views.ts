import type {
    Flip7Card,
    Flip7PendingChoice,
    Flip7Phase,
    Flip7PlayerStatus,
    Flip7RoundResult,
    Flip7State,
} from "./types";

export interface Flip7CardView {
    kind: "number" | "bonus" | "multiplier" | "action";
    label: string;
    value: number | null;
}

export interface Flip7PlayerInfo {
    id: string;
    name: string;
    totalScore: number;
    status: Flip7PlayerStatus;
    roundScore: number;
    uniqueNumberCount: number;
    hasSecondChance: boolean;
    cards: Flip7CardView[];
}

export interface Flip7TargetChoiceView {
    chooserPlayerId: string;
    card: Flip7PendingChoice["card"];
    validTargetIds: string[];
}

export interface Flip7PlayerView {
    myId: string;
    hostId: string;
    phase: Flip7Phase;
    roundNumber: number;
    targetScore: number;
    dealerId: string | null;
    currentPlayerId: string | null;
    deckCount: number;
    discardCount: number;
    players: Flip7PlayerInfo[];
    targetChoice: Flip7TargetChoiceView | null;
    canHit: boolean;
    canStay: boolean;
    requiresMyTargetChoice: boolean;
    validTargetIds: string[];
    lastRoundResult: Flip7RoundResult | null;
    winners: string[] | null;
    endedByHost: boolean;
}

function toCardView(card: Flip7Card): Flip7CardView {
    if (card.type === "number") {
        return {
            kind: "number",
            label: `${card.value}`,
            value: card.value,
        };
    }

    if (card.type === "bonus") {
        return {
            kind: "bonus",
            label: `+${card.value}`,
            value: card.value,
        };
    }

    if (card.type === "multiplier") {
        return {
            kind: "multiplier",
            label: "x2",
            value: 2,
        };
    }

    return {
        kind: "action",
        label: "2ND",
        value: null,
    };
}

function getNumberTotal(cards: Flip7Card[]) {
    return cards.reduce((sum, card) => {
        if (card.type !== "number") return sum;
        return sum + card.value;
    }, 0);
}

function getFlatModifierTotal(cards: Flip7Card[]) {
    return cards.reduce((sum, card) => {
        if (card.type !== "bonus") return sum;
        return sum + card.value;
    }, 0);
}

function hasMultiplier(cards: Flip7Card[]) {
    return cards.some((card) => card.type === "multiplier");
}

function uniqueNumberCount(cards: Flip7Card[]) {
    return new Set(
        cards
            .filter(
                (card): card is Extract<Flip7Card, { type: "number" }> =>
                    card.type === "number",
            )
            .map((card) => card.value),
    ).size;
}

function roundScore(cards: Flip7Card[], status: Flip7PlayerStatus) {
    if (status === "busted") {
        return 0;
    }

    const numberTotal = getNumberTotal(cards);
    const multiplied = hasMultiplier(cards) ? numberTotal * 2 : numberTotal;
    return multiplied + getFlatModifierTotal(cards);
}

export function getPlayerView(
    state: Flip7State,
    playerId: string,
): Flip7PlayerView {
    const me = state.players.find((player) => player.id === playerId) ?? null;
    const currentPlayerId =
        state.currentPlayerIndex === null
            ? null
            : state.players[state.currentPlayerIndex]?.id ?? null;
    const targetChoice = state.pendingChoice
        ? {
              chooserPlayerId: state.pendingChoice.chooserPlayerId,
              card: state.pendingChoice.card,
              validTargetIds: [...state.pendingChoice.validTargetIds],
          }
        : null;

    return {
        myId: playerId,
        hostId: state.hostId,
        phase: state.phase,
        roundNumber: state.roundNumber,
        targetScore: state.targetScore,
        dealerId: state.players[state.dealerIndex]?.id ?? null,
        currentPlayerId,
        deckCount: state.deck.length,
        discardCount: state.discardPile.length,
        players: state.players.map((player) => ({
            id: player.id,
            name: player.name,
            totalScore: player.totalScore,
            status: player.status,
            roundScore: roundScore(player.cards, player.status),
            uniqueNumberCount: uniqueNumberCount(player.cards),
            hasSecondChance: player.cards.some(
                (card) =>
                    card.type === "action" && card.action === "second_chance",
            ),
            cards: player.cards.map(toCardView),
        })),
        targetChoice,
        canHit:
            state.phase === "turn" &&
            currentPlayerId === playerId &&
            me?.status === "active",
        canStay:
            state.phase === "turn" &&
            currentPlayerId === playerId &&
            me?.status === "active" &&
            (me?.cards.length ?? 0) > 0,
        requiresMyTargetChoice:
            state.phase === "awaiting_target" &&
            state.pendingChoice?.chooserPlayerId === playerId,
        validTargetIds:
            state.pendingChoice?.chooserPlayerId === playerId
                ? [...state.pendingChoice.validTargetIds]
                : [],
        lastRoundResult: state.lastRoundResult,
        winners: state.winners ? [...state.winners] : null,
        endedByHost: state.endedByHost,
    };
}
