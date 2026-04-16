import type {
    ChallengeTrait,
    DrawContext,
    DrawPileCard,
    SpiceType,
    SpicyAction,
    SpicyCard,
    SpicyEndReason,
    SpicyEngineResult,
    SpicyFinalScore,
    SpicyPlayer,
    SpicyResult,
    SpicyState,
} from "./types";
import {
    SPICE_TYPES,
    SPICY_HAND_SIZE,
    SPICY_MIN_PLAYERS,
    SPICY_STANDARD_COPIES,
    SPICY_TROPHY_COUNT,
    SPICY_WILD_CARDS_PER_TYPE,
} from "./types";

export type ShuffleFn = <T>(items: T[]) => T[];

const DEFAULT_WORLD_END_ID = "worlds_end" as const;

function shuffle<T>(items: T[]) {
    const deck = [...items];
    for (let index = deck.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [deck[index], deck[swapIndex]] = [deck[swapIndex]!, deck[index]!];
    }
    return deck;
}

function buildDeck(): SpicyCard[] {
    const deck: SpicyCard[] = [];

    for (const spice of SPICE_TYPES) {
        for (let number = 1; number <= 10; number++) {
            for (let copy = 0; copy < SPICY_STANDARD_COPIES; copy++) {
                deck.push({
                    id: `standard:${spice}:${number}:${copy}`,
                    kind: "standard",
                    spice,
                    number,
                });
            }
        }
    }

    for (let index = 0; index < SPICY_WILD_CARDS_PER_TYPE; index++) {
        deck.push({
            id: `wild-spice:${index}`,
            kind: "wild_spice",
        });
        deck.push({
            id: `wild-number:${index}`,
            kind: "wild_number",
        });
    }

    return deck;
}

function getApproximateWorldEndIndex(playerCount: number, drawPileSize: number) {
    const ratio = playerCount <= 4 ? 0.45 : 0.65;
    return Math.min(
        drawPileSize,
        Math.max(0, Math.floor(drawPileSize * ratio)),
    );
}

function insertWorldsEnd(
    drawPile: SpicyCard[],
    playerCount: number,
    worldEndIndex?: number,
): DrawPileCard[] {
    const pile = [...drawPile] as DrawPileCard[];
    const insertAt =
        worldEndIndex ??
        getApproximateWorldEndIndex(playerCount, drawPile.length);
    pile.splice(insertAt, 0, {
        id: DEFAULT_WORLD_END_ID,
        kind: "worlds_end",
    });
    return pile;
}

function clonePlayers(players: { id: string; name: string }[], handSize: number) {
    return players.map((player) => ({
        id: player.id,
        name: player.name,
        hand: [] as SpicyCard[],
        wonCardCount: 0,
        trophies: 0,
        handSize,
    }));
}

function getPlayer(state: SpicyState, playerId: string) {
    return state.players.find((player) => player.id === playerId) ?? null;
}

function getPlayerIndex(state: SpicyState, playerId: string) {
    return state.players.findIndex((player) => player.id === playerId);
}

export function getNextPlayerId(state: SpicyState, playerId: string) {
    const index = getPlayerIndex(state, playerId);
    if (index < 0 || state.players.length === 0) {
        return state.players[0]?.id ?? "";
    }
    return state.players[(index + 1) % state.players.length]!.id;
}

function getPreviousPlayerId(state: SpicyState, playerId: string) {
    const index = getPlayerIndex(state, playerId);
    if (index < 0 || state.players.length === 0) {
        return state.players[0]?.id ?? "";
    }
    return state.players[
        (index - 1 + state.players.length) % state.players.length
    ]!.id;
}

export function getAllowedDeclarations(
    state: Pick<SpicyState, "stack">,
): { numbers: number[]; spices: SpiceType[] } {
    const top = state.stack[state.stack.length - 1];
    if (!top) {
        return {
            numbers: [1, 2, 3],
            spices: [...SPICE_TYPES],
        };
    }

    const numbers =
        top.declaredNumber >= 10
            ? [1, 2, 3]
            : Array.from(
                  { length: 10 - top.declaredNumber },
                  (_, offset) => top.declaredNumber + offset + 1,
              );

    return {
        numbers,
        spices: [top.declaredSpice],
    };
}

export function isValidDeclaration(
    state: Pick<SpicyState, "stack">,
    declaredNumber: number,
    declaredSpice: SpiceType,
) {
    const allowed = getAllowedDeclarations(state);
    return (
        allowed.numbers.includes(declaredNumber) &&
        allowed.spices.includes(declaredSpice)
    );
}

function cardMatchesNumber(card: SpicyCard, declaredNumber: number) {
    if (card.kind === "wild_number") {
        return true;
    }
    if (card.kind === "wild_spice") {
        return false;
    }
    return card.number === declaredNumber;
}

function cardMatchesSpice(card: SpicyCard, declaredSpice: SpiceType) {
    if (card.kind === "wild_spice") {
        return true;
    }
    if (card.kind === "wild_number") {
        return false;
    }
    return card.spice === declaredSpice;
}

function computeFinalScores(players: SpicyPlayer[]): SpicyFinalScore[] {
    return players.map((player) => ({
        playerId: player.id,
        points:
            player.wonCardCount + player.trophies * 10 - player.hand.length,
        wonCardCount: player.wonCardCount,
        trophies: player.trophies,
        handCount: player.hand.length,
    }));
}

function endGame(
    state: SpicyState,
    reason: SpicyEndReason,
    forcedWinners?: string[],
): SpicyResult {
    const finalScores = computeFinalScores(state.players);
    const highestScore = Math.max(...finalScores.map((score) => score.points));
    const winners =
        forcedWinners ??
        finalScores
            .filter((score) => score.points === highestScore)
            .map((score) => score.playerId);

    state.phase = "game_over";
    state.winners = winners;
    state.endReason = reason;
    state.finalScores = finalScores;
    state.pendingLastCardPlayerId = null;
    state.safePassPlayerIds = [];

    return {
        type: "game_over",
        winners,
        reason,
        finalScores,
    };
}

function drawCards(
    state: SpicyState,
    playerId: string,
    count: number,
    during: DrawContext,
    events: SpicyResult[],
) {
    const player = getPlayer(state, playerId);
    if (!player) {
        return { drawnCount: 0, worldsEndRevealed: false };
    }

    let drawnCount = 0;
    while (drawnCount < count) {
        const nextCard = state.drawPile[0];
        if (!nextCard) {
            return { drawnCount, worldsEndRevealed: false };
        }

        if (nextCard.kind === "worlds_end") {
            state.drawPile.shift();
            events.push({
                type: "worlds_end_revealed",
                triggeringPlayerId: playerId,
                during,
            });
            return { drawnCount, worldsEndRevealed: true };
        }

        player.hand.push(nextCard);
        state.drawPile.shift();
        drawnCount += 1;
    }

    return { drawnCount, worldsEndRevealed: false };
}

function finalizeTrophy(
    state: SpicyState,
    playerId: string,
    events: SpicyResult[],
) {
    const player = getPlayer(state, playerId);
    if (!player) {
        return { ended: false };
    }

    player.trophies += 1;
    state.trophiesRemaining = Math.max(0, state.trophiesRemaining - 1);

    let drewCount = 0;
    let worldsEndRevealed = false;

    if (player.trophies < 2 && state.trophiesRemaining > 0) {
        const refill = drawCards(state, playerId, 6, "trophy_refill", events);
        drewCount = refill.drawnCount;
        worldsEndRevealed = refill.worldsEndRevealed;
    }

    events.push({
        type: "trophy_awarded",
        playerId,
        trophies: player.trophies,
        trophiesRemaining: state.trophiesRemaining,
        drewCount,
    });

    if (player.trophies >= 2) {
        events.push(endGame(state, "two_trophies", [player.id]));
        return { ended: true };
    }

    if (state.trophiesRemaining === 0) {
        events.push(endGame(state, "all_trophies"));
        return { ended: true };
    }

    if (worldsEndRevealed) {
        events.push(endGame(state, "worlds_end"));
        return { ended: true };
    }

    return { ended: false };
}

export function initGame(
    players: { id: string; name: string }[],
    options?: {
        shuffleFn?: ShuffleFn;
        worldEndIndex?: number;
    },
): SpicyState {
    const shuffleFn = options?.shuffleFn ?? shuffle;
    const deck = shuffleFn(buildDeck());
    const spicyPlayers = clonePlayers(players, SPICY_HAND_SIZE);
    let cursor = 0;

    for (let round = 0; round < SPICY_HAND_SIZE; round++) {
        for (const player of spicyPlayers) {
            player.hand.push(deck[cursor]!);
            cursor += 1;
        }
    }

    const drawPile = insertWorldsEnd(
        deck.slice(cursor),
        players.length,
        options?.worldEndIndex,
    );

    return {
        players: spicyPlayers.map(({ handSize: _handSize, ...player }) => player),
        phase: "playing",
        currentPlayerId: players[0]?.id ?? "",
        stack: [],
        drawPile,
        pendingLastCardPlayerId: null,
        safePassPlayerIds: [],
        trophiesRemaining: SPICY_TROPHY_COUNT,
        winners: null,
        endReason: null,
        finalScores: null,
    };
}

function resolveChallenge(
    state: SpicyState,
    challengerId: string,
    trait: ChallengeTrait,
): SpicyEngineResult {
    const topEntry = state.stack[state.stack.length - 1];
    if (!topEntry) {
        return { type: "error", message: "Nothing to challenge" };
    }

    if (topEntry.playerId === challengerId) {
        return { type: "error", message: "You cannot challenge your own card" };
    }

    const events: SpicyResult[] = [];
    const cardWasWrong =
        trait === "number"
            ? !cardMatchesNumber(topEntry.card, topEntry.declaredNumber)
            : !cardMatchesSpice(topEntry.card, topEntry.declaredSpice);

    const challengerWon = cardWasWrong;
    const winnerId = challengerWon ? challengerId : topEntry.playerId;
    const loserId = challengerWon ? topEntry.playerId : challengerId;
    const winner = getPlayer(state, winnerId);
    if (!winner) {
        return { type: "error", message: "Winner not found" };
    }

    winner.wonCardCount += state.stack.length;
    const collectedCardCount = state.stack.length;
    state.stack = [];

    const loserDraw = drawCards(
        state,
        loserId,
        2,
        "challenge_penalty",
        events,
    );

    events.push({
        type: "challenge_resolved",
        challengerId,
        challengedPlayerId: topEntry.playerId,
        challengedTrait: trait,
        declaredNumber: topEntry.declaredNumber,
        declaredSpice: topEntry.declaredSpice,
        actualCard: topEntry.card,
        challengerWon,
        winnerId,
        loserId,
        collectedCardCount,
        loserDrewCount: loserDraw.drawnCount,
    });

    const lastCardWinner =
        state.pendingLastCardPlayerId !== null &&
        !challengerWon &&
        state.pendingLastCardPlayerId === topEntry.playerId;

    state.pendingLastCardPlayerId = null;
    state.safePassPlayerIds = [];

    if (lastCardWinner) {
        const trophyResult = finalizeTrophy(state, topEntry.playerId, events);
        if (!trophyResult.ended) {
            state.phase = "playing";
            state.currentPlayerId = loserId;
        }
        return { type: "ok", events };
    }

    if (loserDraw.worldsEndRevealed) {
        events.push(endGame(state, "worlds_end"));
        return { type: "ok", events };
    }

    state.phase = "playing";
    state.currentPlayerId = loserId;
    return { type: "ok", events };
}

function resolveLastCardConfirmation(
    state: SpicyState,
    playerId: string,
): SpicyEngineResult {
    if (state.phase !== "last_card_window" || !state.pendingLastCardPlayerId) {
        return { type: "error", message: "No last card to confirm" };
    }

    if (playerId === state.pendingLastCardPlayerId) {
        return {
            type: "error",
            message: "You cannot confirm your own last card",
        };
    }

    if (state.safePassPlayerIds.includes(playerId)) {
        return { type: "error", message: "You already confirmed" };
    }

    state.safePassPlayerIds = [...state.safePassPlayerIds, playerId];
    const required = Math.max(0, state.players.length - 1);
    const events: SpicyResult[] = [
        {
            type: "last_card_confirmed",
            playerId,
            pendingPlayerId: state.pendingLastCardPlayerId,
            confirmations: state.safePassPlayerIds.length,
            required,
        },
    ];

    if (state.safePassPlayerIds.length < required) {
        return { type: "ok", events };
    }

    const pendingPlayerId = state.pendingLastCardPlayerId;
    state.pendingLastCardPlayerId = null;
    state.safePassPlayerIds = [];

    const trophyResult = finalizeTrophy(state, pendingPlayerId, events);
    if (!trophyResult.ended) {
        state.phase = "playing";
    }

    return { type: "ok", events };
}

export function processAction(
    state: SpicyState,
    action: SpicyAction,
): SpicyEngineResult {
    if (state.phase === "game_over") {
        return { type: "error", message: "Game is already over" };
    }

    if (action.type === "challenge") {
        return resolveChallenge(state, action.playerId, action.trait);
    }

    if (action.type === "confirm_last_card") {
        return resolveLastCardConfirmation(state, action.playerId);
    }

    if (state.phase !== "playing") {
        return { type: "error", message: "Resolve the last card first" };
    }

    if (state.currentPlayerId !== action.playerId) {
        return { type: "error", message: "Not your turn" };
    }

    if (action.type === "pass") {
        const events: SpicyResult[] = [];
        const drawResult = drawCards(state, action.playerId, 1, "pass", events);
        events.push({
            type: "player_passed",
            playerId: action.playerId,
            drewCount: drawResult.drawnCount,
        });

        if (drawResult.worldsEndRevealed) {
            events.push(endGame(state, "worlds_end"));
            return { type: "ok", events };
        }

        state.currentPlayerId = getNextPlayerId(state, action.playerId);
        return { type: "ok", events };
    }

    const player = getPlayer(state, action.playerId);
    if (!player) {
        return { type: "error", message: "Player not found" };
    }

    const cardIndex = player.hand.findIndex((card) => card.id === action.cardId);
    if (cardIndex < 0) {
        return { type: "error", message: "Card not found" };
    }

    if (!isValidDeclaration(state, action.declaredNumber, action.declaredSpice)) {
        const events: SpicyResult[] = [];
        const drawResult = drawCards(
            state,
            action.playerId,
            1,
            "invalid_declaration",
            events,
        );
        events.push({
            type: "invalid_declaration",
            playerId: action.playerId,
            declaredNumber: action.declaredNumber,
            declaredSpice: action.declaredSpice,
            drewCount: drawResult.drawnCount,
        });

        if (drawResult.worldsEndRevealed) {
            events.push(endGame(state, "worlds_end"));
            return { type: "ok", events };
        }

        state.currentPlayerId = getNextPlayerId(state, action.playerId);
        return { type: "ok", events };
    }

    const [card] = player.hand.splice(cardIndex, 1);
    state.stack = [
        ...state.stack,
        {
            playerId: action.playerId,
            card,
            declaredNumber: action.declaredNumber,
            declaredSpice: action.declaredSpice,
        },
    ];

    const events: SpicyResult[] = [
        {
            type: "card_played",
            playerId: action.playerId,
            declaredNumber: action.declaredNumber,
            declaredSpice: action.declaredSpice,
            stackSize: state.stack.length,
            handCount: player.hand.length,
            lastCard: player.hand.length === 0,
        },
    ];

    const nextPlayerId = getNextPlayerId(state, action.playerId);
    state.currentPlayerId = nextPlayerId;

    if (player.hand.length === 0) {
        state.phase = "last_card_window";
        state.pendingLastCardPlayerId = action.playerId;
        state.safePassPlayerIds = [];
        return { type: "ok", events };
    }

    return { type: "ok", events };
}

export function removePlayer(
    state: SpicyState,
    playerId: string,
): SpicyResult | null {
    if (!state.players.some((player) => player.id === playerId)) {
        return null;
    }

    const previousPlayerId = getPreviousPlayerId(state, playerId);
    state.players = state.players.filter((player) => player.id !== playerId);
    state.safePassPlayerIds = state.safePassPlayerIds.filter((id) => id !== playerId);

    if (state.players.length === 0 || state.players.length < SPICY_MIN_PLAYERS) {
        return endGame(state, "not_enough_players");
    }

    if (state.pendingLastCardPlayerId === playerId) {
        state.pendingLastCardPlayerId = null;
        state.phase = "playing";
        state.stack = state.stack.filter((entry) => entry.playerId !== playerId);
    }

    if (state.stack[state.stack.length - 1]?.playerId === playerId) {
        state.stack = [];
    }

    if (state.currentPlayerId === playerId || !getPlayer(state, state.currentPlayerId)) {
        state.currentPlayerId = getNextPlayerId(state, previousPlayerId);
    }

    return null;
}

export function endGameByHost(state: SpicyState): SpicyResult {
    return endGame(state, "host_ended");
}
