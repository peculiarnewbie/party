import type {
    PerudoState,
    PerudoPlayer,
    PerudoAction,
    PerudoResult,
    Bid,
    FaceValue,
    ChallengeResult,
} from "./types";

export const STARTING_DICE = 5;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 8;

export type RollFn = () => number;

function defaultRoll(): number {
    return Math.floor(Math.random() * 6) + 1;
}

export function rollDice(
    count: number,
    rollFn: RollFn = defaultRoll,
): FaceValue[] {
    return Array.from({ length: count }, () => rollFn() as FaceValue);
}

export function initGame(
    players: { id: string; name: string }[],
    rollFn: RollFn = defaultRoll,
): PerudoState {
    const perudoPlayers: PerudoPlayer[] = players.map((p) => ({
        id: p.id,
        name: p.name,
        dice: rollDice(STARTING_DICE, rollFn),
        eliminated: false,
    }));

    const totalDiceInPlay = perudoPlayers.reduce(
        (sum, p) => sum + p.dice.length,
        0,
    );

    return {
        players: perudoPlayers,
        currentPlayerIndex: 0,
        startingPlayerIndex: 0,
        phase: "round_start",
        currentBid: null,
        bidHistory: [],
        roundNumber: 1,
        palificoRound: false,
        lastChallengeResult: null,
        winners: null,
        totalDiceInPlay,
        revealTimerActive: false,
    };
}

export function countDiceWithValue(
    state: PerudoState,
    faceValue: FaceValue,
): number {
    let count = 0;
    for (const player of state.players) {
        if (player.eliminated) continue;
        for (const die of player.dice) {
            if (die === faceValue || (!state.palificoRound && die === 1)) {
                count++;
            }
        }
    }
    return count;
}

export function getActivePlayers(state: PerudoState): PerudoPlayer[] {
    return state.players.filter((p) => !p.eliminated);
}

export function getCurrentPlayer(state: PerudoState): PerudoPlayer | null {
    const active = getActivePlayers(state);
    if (active.length === 0) return null;
    return active[state.currentPlayerIndex % active.length] ?? null;
}

export function getStartingPlayer(state: PerudoState): PerudoPlayer | null {
    const active = getActivePlayers(state);
    if (active.length === 0) return null;
    return active[state.startingPlayerIndex % active.length] ?? null;
}

export function isValidBid(
    newBid: { quantity: number; faceValue: FaceValue },
    currentBid: Bid | null,
    totalDiceInPlay: number,
): { valid: boolean; reason?: string } {
    if (newBid.quantity < 1) {
        return { valid: false, reason: "Quantity must be at least 1" };
    }

    if (newBid.quantity > totalDiceInPlay) {
        return {
            valid: false,
            reason: `Cannot bid more dice than are in play (${totalDiceInPlay})`,
        };
    }

    if (!currentBid) {
        return { valid: true };
    }

    if (newBid.quantity > currentBid.quantity) {
        return { valid: true };
    }

    if (newBid.quantity === currentBid.quantity) {
        if (newBid.faceValue > currentBid.faceValue) {
            return { valid: true };
        }
        return {
            valid: false,
            reason: "Must increase face value when keeping same quantity",
        };
    }

    return { valid: false, reason: "Must increase quantity or face value" };
}

function resolveChallenge(
    state: PerudoState,
    challengerId: string,
): PerudoResult {
    const currentBid = state.currentBid;
    if (!currentBid) {
        return { type: "error", message: "No bid to challenge" };
    }

    const bidder = state.players.find((p) => p.id === currentBid.playerId);
    if (!bidder) {
        return { type: "error", message: "Bidder not found" };
    }

    const challenger = state.players.find((p) => p.id === challengerId);
    if (!challenger) {
        return { type: "error", message: "Challenger not found" };
    }

    const actualCount = countDiceWithValue(state, currentBid.faceValue);
    const wasCorrect = actualCount >= currentBid.quantity;

    let loserId: string;
    let loserNewCount: number;

    if (wasCorrect) {
        loserId = challengerId;
        challenger.dice.pop();
        if (challenger.dice.length === 0) {
            challenger.eliminated = true;
        }
        loserNewCount = challenger.dice.length;
    } else {
        loserId = currentBid.playerId;
        bidder.dice.pop();
        if (bidder.dice.length === 0) {
            bidder.eliminated = true;
        }
        loserNewCount = bidder.dice.length;
    }

    const activePlayers = getActivePlayers(state);

    if (activePlayers.length === 1) {
        state.phase = "game_over";
        state.winners = [activePlayers[0].id];
        state.revealTimerActive = false;
        const result: ChallengeResult = {
            challengerId,
            bidderId: currentBid.playerId,
            bid: currentBid,
            wasCorrect,
            actualCount,
            loserId,
            loserNewCount,
        };
        state.lastChallengeResult = result;
        return { type: "game_over", winners: state.winners };
    }

    const wasPalifico = state.palificoRound;
    const palificoNext = loserNewCount === 1;

    const nextStartingPlayerIndex = activePlayers.findIndex(
        (p) => p.id === loserId,
    );

    state.lastChallengeResult = {
        challengerId,
        bidderId: currentBid.playerId,
        bid: currentBid,
        wasCorrect,
        actualCount,
        loserId,
        loserNewCount,
    };

    state.phase = "revealing";
    state.revealTimerActive = true;
    state.palificoRound = palificoNext;

    return {
        type: "player_eliminated",
        playerId: loserId,
        loserId,
        loserNewCount,
        nextPlayerIndex: nextStartingPlayerIndex,
        nextStartingPlayerIndex,
        palificoRound: state.palificoRound,
        wasCorrect,
    };
}

function startNextRound(
    state: PerudoState,
    rollFn: RollFn = defaultRoll,
): PerudoResult {
    const activePlayers = getActivePlayers(state);

    for (const player of activePlayers) {
        if (player.dice.length === 0) {
            player.dice = rollDice(1, rollFn);
        } else {
            player.dice = rollDice(player.dice.length, rollFn);
        }
    }

    state.totalDiceInPlay = activePlayers.reduce(
        (sum, p) => sum + p.dice.length,
        0,
    );

    state.currentBid = null;
    state.bidHistory = [];
    state.roundNumber++;
    state.lastChallengeResult = null;
    state.phase = "round_start";
    state.revealTimerActive = false;

    const diceRolls: Record<string, FaceValue[]> = {};
    for (const player of state.players) {
        if (!player.eliminated) {
            diceRolls[player.id] = [...player.dice];
        }
    }

    return {
        type: "round_started",
        roundNumber: state.roundNumber,
        palificoRound: state.palificoRound,
        diceRolls,
    };
}

function advanceToNextPlayer(state: PerudoState): number {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 0) return 0;
    const currentPlayer = getCurrentPlayer(state);
    if (!currentPlayer) return 0;
    const currentIdx = activePlayers.findIndex(
        (p) => p.id === currentPlayer.id,
    );
    return (currentIdx + 1) % activePlayers.length;
}

export function processAction(
    state: PerudoState,
    action: PerudoAction,
    rollFn: RollFn = defaultRoll,
): PerudoResult {
    if (state.phase === "game_over") {
        return { type: "error", message: "Game is over" };
    }

    const currentPlayer = getCurrentPlayer(state);
    if (!currentPlayer) {
        return { type: "error", message: "No active player" };
    }

    if (action.type === "bid") {
        if (state.phase === "revealing") {
            return { type: "error", message: "Waiting for reveal to complete" };
        }

        if (currentPlayer.id !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }

        if (state.phase === "round_start") {
            state.phase = "bidding";
        }

        const validation = isValidBid(
            { quantity: action.quantity, faceValue: action.faceValue },
            state.currentBid,
            state.totalDiceInPlay,
        );

        if (!validation.valid) {
            return {
                type: "error",
                message: validation.reason ?? "Invalid bid",
            };
        }

        const bid: Bid = {
            playerId: action.playerId,
            quantity: action.quantity,
            faceValue: action.faceValue,
        };

        state.currentBid = bid;
        state.bidHistory.push(bid);
        state.currentPlayerIndex = advanceToNextPlayer(state);

        return {
            type: "bid_placed",
            bid,
            totalDiceInPlay: state.totalDiceInPlay,
        };
    }

    if (action.type === "challenge") {
        if (state.phase !== "bidding") {
            return { type: "error", message: "Cannot challenge right now" };
        }

        if (!state.currentBid) {
            return { type: "error", message: "No bid to challenge" };
        }

        const challenger = state.players.find((p) => p.id === action.playerId);
        if (!challenger) {
            return { type: "error", message: "Player not found" };
        }

        const activePlayers = getActivePlayers(state);
        const challengerIndex = activePlayers.findIndex(
            (p) => p.id === action.playerId,
        );
        const currentIndex = activePlayers.findIndex(
            (p) => p.id === currentPlayer.id,
        );

        if (challengerIndex !== currentIndex) {
            const expectedNext = (currentIndex + 1) % activePlayers.length;
            if (challengerIndex !== expectedNext) {
                return {
                    type: "error",
                    message: "Must wait your turn to challenge",
                };
            }
        }

        const challengeResult = resolveChallenge(state, action.playerId);

        if (challengeResult.type === "player_eliminated") {
            state.startingPlayerIndex = challengeResult.nextStartingPlayerIndex;
            state.currentPlayerIndex = challengeResult.nextPlayerIndex;
        }

        return challengeResult;
    }

    return { type: "error", message: "Unknown action" };
}

export function startNewRound(
    state: PerudoState,
    rollFn: RollFn = defaultRoll,
): PerudoResult {
    if (state.phase === "game_over") {
        return { type: "error", message: "Game is over" };
    }

    const activePlayers = getActivePlayers(state);
    if (activePlayers.length < 2) {
        return { type: "error", message: "Need at least 2 players" };
    }

    return startNextRound(state, rollFn);
}

export function removePlayer(
    state: PerudoState,
    playerId: string,
): PerudoResult | null {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex < 0) return null;

    state.players[playerIndex].eliminated = true;
    state.players[playerIndex].dice = [];

    const activePlayers = getActivePlayers(state);

    if (activePlayers.length === 0) {
        state.phase = "game_over";
        state.winners = [];
        return { type: "game_over", winners: [] };
    }

    if (activePlayers.length === 1) {
        state.phase = "game_over";
        state.winners = [activePlayers[0].id];
        return { type: "game_over", winners: state.winners };
    }

    const playerWasCurrent =
        state.players[playerIndex].id === getCurrentPlayer(state)?.id;
    const playerWasStarting =
        state.players[playerIndex].id === getStartingPlayer(state)?.id;

    if (playerWasStarting) {
        state.startingPlayerIndex = 0;
    }

    if (playerWasCurrent) {
        const nextIdx = advanceToNextPlayer(state);
        const active = getActivePlayers(state);
        state.currentPlayerIndex = nextIdx % active.length;
    }

    if (playerIndex < state.currentPlayerIndex) {
        state.currentPlayerIndex--;
    }
    if (playerIndex < state.startingPlayerIndex) {
        state.startingPlayerIndex--;
    }

    state.totalDiceInPlay = activePlayers.reduce(
        (sum, p) => sum + p.dice.length,
        0,
    );

    state.currentBid = null;
    state.phase = "round_start";

    return null;
}

export function endGameByHost(state: PerudoState): PerudoResult {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 0) {
        state.phase = "game_over";
        state.winners = [];
        return { type: "game_over", winners: [] };
    }

    if (activePlayers.length === 1) {
        state.phase = "game_over";
        state.winners = [activePlayers[0].id];
        return { type: "game_over", winners: state.winners };
    }

    const maxDice = Math.max(...activePlayers.map((p) => p.dice.length));
    const leaders = activePlayers.filter((p) => p.dice.length === maxDice);
    state.phase = "game_over";
    state.winners = leaders.map((p) => p.id);

    return { type: "game_over", winners: state.winners };
}

export function finishReveal(state: PerudoState): PerudoResult {
    if (state.phase !== "revealing") {
        return { type: "error", message: "Not in reveal phase" };
    }

    state.revealTimerActive = false;

    const result = startNextRound(state);

    if (result.type === "round_started") {
        state.currentPlayerIndex = state.startingPlayerIndex;
    }

    return result;
}
