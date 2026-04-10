import type {
    Flip7Action,
    Flip7ActionCardType,
    Flip7Card,
    Flip7ForcedDraw,
    Flip7PendingChoice,
    Flip7Player,
    Flip7RoundEndReason,
    Flip7RoundResult,
    Flip7RoundScore,
    Flip7ShuffleMode,
    Flip7State,
    Flip7Result,
} from "./types";

const TARGET_SCORE = 200;

function shuffleCards<T>(cards: T[], mode: Flip7ShuffleMode): T[] {
    if (mode === "none") {
        return [...cards];
    }

    const result = [...cards];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function createDeck(deckCount = 1): Flip7Card[] {
    const deck: Flip7Card[] = [];

    for (let copy = 0; copy < deckCount; copy++) {
        deck.push({ type: "number", value: 0 });

        for (let value = 1; value <= 12; value++) {
            for (let count = 0; count < value; count++) {
                deck.push({ type: "number", value });
            }
        }

        deck.push(
            { type: "bonus", value: 2 },
            { type: "bonus", value: 4 },
            { type: "bonus", value: 6 },
            { type: "bonus", value: 8 },
            { type: "bonus", value: 10 },
            { type: "multiplier", value: 2 },
        );

        for (let count = 0; count < 3; count++) {
            deck.push({ type: "action", action: "freeze" });
            deck.push({ type: "action", action: "flip_three" });
            deck.push({ type: "action", action: "second_chance" });
        }
    }

    return deck;
}

function buildInitialDealOrder(players: Flip7Player[], dealerIndex: number) {
    if (players.length === 0) return [];

    const order: string[] = [];
    for (let offset = 1; offset <= players.length; offset++) {
        const index = (dealerIndex + offset) % players.length;
        order.push(players[index].id);
    }
    return order;
}

function getPlayer(state: Flip7State, playerId: string) {
    return state.players.find((player) => player.id === playerId) ?? null;
}

function getPlayerIndex(state: Flip7State, playerId: string) {
    return state.players.findIndex((player) => player.id === playerId);
}

function getDealerId(state: Flip7State) {
    return state.players[state.dealerIndex]?.id ?? null;
}

function getNumberCards(player: Flip7Player) {
    return player.cards.filter(
        (card): card is Extract<Flip7Card, { type: "number" }> =>
            card.type === "number",
    );
}

function getNumberValues(player: Flip7Player) {
    return getNumberCards(player).map((card) => card.value);
}

function getUniqueNumberCount(player: Flip7Player) {
    return new Set(getNumberValues(player)).size;
}

function hasSecondChance(player: Flip7Player) {
    return player.cards.some(
        (card) => card.type === "action" && card.action === "second_chance",
    );
}

function getFlatModifierTotal(player: Flip7Player) {
    return player.cards.reduce((sum, card) => {
        if (card.type !== "bonus") return sum;
        return sum + card.value;
    }, 0);
}

function usesMultiplier(player: Flip7Player) {
    return player.cards.some((card) => card.type === "multiplier");
}

function getNumberTotal(player: Flip7Player) {
    return getNumberValues(player).reduce((sum, value) => sum + value, 0);
}

export function getRoundScore(
    player: Flip7Player,
    opts?: { flip7Bonus?: number },
) {
    if (player.status === "busted") {
        return 0;
    }

    const numberTotal = getNumberTotal(player);
    const multipliedTotal = usesMultiplier(player) ? numberTotal * 2 : numberTotal;
    return multipliedTotal + getFlatModifierTotal(player) + (opts?.flip7Bonus ?? 0);
}

function buildRoundScore(
    player: Flip7Player,
    opts?: { flip7Bonus?: number },
): Flip7RoundScore {
    const flip7Bonus = opts?.flip7Bonus ?? 0;
    const score = getRoundScore(player, { flip7Bonus });
    return {
        playerId: player.id,
        score,
        totalScore: player.totalScore + score,
        status: player.status,
        numberTotal: getNumberTotal(player),
        flatModifierTotal: getFlatModifierTotal(player),
        usedMultiplier: usesMultiplier(player),
        flip7Bonus,
    };
}

function getActivePlayers(state: Flip7State) {
    return state.players.filter((player) => player.status === "active");
}

function getNextActivePlayerIndex(state: Flip7State, fromIndex: number) {
    if (state.players.length === 0) return null;

    for (let offset = 1; offset <= state.players.length; offset++) {
        const index = (fromIndex + offset) % state.players.length;
        if (state.players[index]?.status === "active") {
            return index;
        }
    }

    return null;
}

function moveCurrentRoundCardsToDiscard(state: Flip7State) {
    for (const player of state.players) {
        if (player.cards.length > 0) {
            state.discardPile.push(...player.cards);
            player.cards = [];
        }
    }
}

function resetRoundPlayers(state: Flip7State) {
    for (const player of state.players) {
        player.status = "active";
        player.cards = [];
    }
}

function drawCard(state: Flip7State): Flip7Card | null {
    if (state.deck.length === 0 && state.discardPile.length > 0) {
        state.deck = shuffleCards(state.discardPile, state.shuffleMode);
        state.discardPile = [];
    }

    if (state.deck.length === 0) {
        return null;
    }

    return state.deck.shift() ?? null;
}

function isRoundFinished(state: Flip7State) {
    return state.phase === "round_over" || state.phase === "game_over";
}

function updatePendingChoiceResult(state: Flip7State) {
    if (!state.pendingChoice) return;

    state.lastResult = {
        type: "target_required",
        chooserPlayerId: state.pendingChoice.chooserPlayerId,
        card: state.pendingChoice.card,
        validTargetIds: [...state.pendingChoice.validTargetIds],
    };
}

function setPendingChoice(
    state: Flip7State,
    pendingChoice: Flip7PendingChoice,
) {
    state.pendingChoice = pendingChoice;
    state.phase = "awaiting_target";
    updatePendingChoiceResult(state);
}

function beginForcedDraw(state: Flip7State, playerId: string) {
    state.forcedDraw = {
        playerId,
        remaining: 3,
        deferredActions: [],
    };
}

function finalizeRound(
    state: Flip7State,
    endReason: Flip7RoundEndReason,
    opts?: { flip7WinnerId?: string | null; forceGameOver?: boolean },
) {
    const flip7WinnerId = opts?.flip7WinnerId ?? null;
    const scores = state.players.map((player) =>
        buildRoundScore(player, {
            flip7Bonus: player.id === flip7WinnerId ? 15 : 0,
        }),
    );

    for (const score of scores) {
        const player = getPlayer(state, score.playerId);
        if (player) {
            player.totalScore = score.totalScore;
        }
    }

    const result: Flip7RoundResult = {
        roundNumber: state.roundNumber,
        dealerId: getDealerId(state),
        endReason,
        flip7WinnerId,
        scores,
    };

    state.lastRoundResult = result;
    state.currentPlayerIndex = null;
    state.initialDealOrder = [];
    state.initialDealCursor = 0;
    state.pendingChoice = null;
    state.forcedDraw = null;
    state.turnActionPlayerId = null;
    state.endedByHost = endReason === "host_ended";

    const reachedTarget = state.players.some(
        (player) => player.totalScore >= state.targetScore,
    );
    const forceGameOver = opts?.forceGameOver ?? false;

    if (reachedTarget || forceGameOver) {
        const highestScore = Math.max(
            ...state.players.map((player) => player.totalScore),
            0,
        );
        state.winners = state.players
            .filter((player) => player.totalScore === highestScore)
            .map((player) => player.id);
        state.phase = "game_over";
        state.lastResult = {
            type: "game_over",
            winners: [...state.winners],
            endedByHost: state.endedByHost,
        };
        return;
    }

    state.winners = null;
    state.phase = "round_over";
    state.lastResult = {
        type: "round_over",
        roundNumber: state.roundNumber,
        endReason,
        flip7WinnerId,
    };
}

function applyFreeze(state: Flip7State, targetId: string) {
    const target = getPlayer(state, targetId);
    if (!target || target.status !== "active") return;
    target.status = "frozen";
}

function applyActionCard(
    state: Flip7State,
    chooserPlayerId: string,
    action: Extract<Flip7ActionCardType, "freeze" | "flip_three">,
) {
    const validTargetIds = getActivePlayers(state).map((player) => player.id);
    if (validTargetIds.length === 0) {
        return;
    }

    state.discardPile.push({ type: "action", action });

    if (validTargetIds.length === 1) {
        const targetId = validTargetIds[0];
        if (action === "freeze") {
            applyFreeze(state, targetId);
            return;
        }

        beginForcedDraw(state, targetId);
        return;
    }

    setPendingChoice(state, {
        chooserPlayerId,
        sourcePlayerId: chooserPlayerId,
        card: action,
        validTargetIds,
    });
}

function handleSecondChanceOverflow(state: Flip7State, playerId: string) {
    const validTargetIds = getActivePlayers(state)
        .filter((player) => player.id !== playerId && !hasSecondChance(player))
        .map((player) => player.id);

    if (validTargetIds.length === 0) {
        state.discardPile.push({ type: "action", action: "second_chance" });
        return;
    }

    setPendingChoice(state, {
        chooserPlayerId: playerId,
        sourcePlayerId: playerId,
        card: "second_chance",
        validTargetIds,
    });
}

function applyNumberCard(state: Flip7State, player: Flip7Player, card: Extract<Flip7Card, { type: "number" }>) {
    const hasDuplicate = getNumberValues(player).includes(card.value);

    if (hasDuplicate) {
        const secondChanceIndex = player.cards.findIndex(
            (item) =>
                item.type === "action" && item.action === "second_chance",
        );

        if (secondChanceIndex >= 0) {
            const [secondChanceCard] = player.cards.splice(secondChanceIndex, 1);
            if (secondChanceCard) {
                state.discardPile.push(secondChanceCard);
            }
            state.discardPile.push(card);
            return;
        }

        player.cards.push(card);
        player.status = "busted";
        return;
    }

    player.cards.push(card);

    if (getUniqueNumberCount(player) >= 7) {
        finalizeRound(state, "flip7", { flip7WinnerId: player.id });
    }
}

function resolveDrawForPlayer(
    state: Flip7State,
    playerId: string,
    opts?: { deferActionCards?: boolean },
) {
    const player = getPlayer(state, playerId);
    if (!player || player.status !== "active") return;

    const card = drawCard(state);
    if (!card) {
        finalizeRound(state, "deck_exhausted");
        return;
    }

    if (card.type === "number") {
        applyNumberCard(state, player, card);
        return;
    }

    if (card.type === "bonus" || card.type === "multiplier") {
        player.cards.push(card);
        return;
    }

    if (card.action === "second_chance") {
        if (hasSecondChance(player)) {
            handleSecondChanceOverflow(state, player.id);
            return;
        }

        player.cards.push(card);
        return;
    }

    if (opts?.deferActionCards && state.forcedDraw) {
        state.discardPile.push(card);
        state.forcedDraw.deferredActions.push(card.action);
        return;
    }

    applyActionCard(state, player.id, card.action);
}

function continueFlow(state: Flip7State) {
    while (true) {
        if (state.phase === "round_over" || state.phase === "game_over") {
            return;
        }

        if (state.pendingChoice) {
            state.phase = "awaiting_target";
            updatePendingChoiceResult(state);
            return;
        }

        if (state.forcedDraw) {
            const forced = state.forcedDraw;
            const forcedPlayer = getPlayer(state, forced.playerId);

            if (!forcedPlayer || forcedPlayer.status !== "active") {
                state.forcedDraw = null;
                continue;
            }

            if (forced.remaining > 0) {
                forced.remaining -= 1;
                const beforePendingChoice = state.pendingChoice;
                const beforePhase = state.phase;
                const beforeResult = state.lastResult;
                resolveDrawForPlayer(state, forced.playerId, {
                    deferActionCards: true,
                });

                if (isRoundFinished(state)) {
                    return;
                }

                if (state.pendingChoice) {
                    return;
                }

                const updatedPlayer = getPlayer(state, forced.playerId);
                if (!updatedPlayer || updatedPlayer.status !== "active") {
                    state.forcedDraw = null;
                    continue;
                }

                if (beforePendingChoice === state.pendingChoice) {
                    state.phase = beforePhase;
                    state.lastResult = beforeResult;
                }

                continue;
            }

            if (forced.deferredActions.length > 0) {
                const action = forced.deferredActions.shift();
                if (!action) {
                    state.forcedDraw = null;
                    continue;
                }

                applyActionCard(state, forced.playerId, action);
                if (state.pendingChoice) {
                    return;
                }

                if (isRoundFinished(state)) {
                    return;
                }

                continue;
            }

            state.forcedDraw = null;
            continue;
        }

        if (state.initialDealCursor < state.initialDealOrder.length) {
            const playerId = state.initialDealOrder[state.initialDealCursor];
            state.initialDealCursor += 1;

            const player = getPlayer(state, playerId);
            if (!player || player.status !== "active") {
                continue;
            }

            resolveDrawForPlayer(state, playerId);
            if (isRoundFinished(state)) {
                return;
            }
            if (state.pendingChoice) {
                return;
            }
            continue;
        }

        if (state.turnActionPlayerId) {
            const playerIndex = getPlayerIndex(state, state.turnActionPlayerId);
            const fromIndex =
                playerIndex >= 0 ? playerIndex : state.dealerIndex;
            state.turnActionPlayerId = null;
            state.currentPlayerIndex = getNextActivePlayerIndex(state, fromIndex);

            if (state.currentPlayerIndex === null) {
                finalizeRound(state, "all_players_inactive");
                return;
            }

            continue;
        }

        if (state.currentPlayerIndex === null) {
            state.currentPlayerIndex = getNextActivePlayerIndex(
                state,
                state.dealerIndex,
            );

            if (state.currentPlayerIndex === null) {
                finalizeRound(state, "all_players_inactive");
                return;
            }
        }

        const currentPlayer = state.players[state.currentPlayerIndex];
        if (!currentPlayer || currentPlayer.status !== "active") {
            const nextIndex = getNextActivePlayerIndex(
                state,
                state.currentPlayerIndex,
            );
            state.currentPlayerIndex = nextIndex;

            if (nextIndex === null) {
                finalizeRound(state, "all_players_inactive");
                return;
            }

            continue;
        }

        state.phase = "turn";
        return;
    }
}

function refreshPendingChoice(state: Flip7State) {
    const pendingChoice = state.pendingChoice;
    if (!pendingChoice) return;

    if (pendingChoice.card === "second_chance") {
        const validTargetIds = getActivePlayers(state)
            .filter(
                (player) =>
                    player.id !== pendingChoice.sourcePlayerId &&
                    !hasSecondChance(player),
            )
            .map((player) => player.id);

        if (
            getPlayer(state, pendingChoice.chooserPlayerId) === null ||
            validTargetIds.length === 0
        ) {
            state.discardPile.push({ type: "action", action: "second_chance" });
            state.pendingChoice = null;
            return;
        }

        if (validTargetIds.length === 1) {
            const targetPlayer = getPlayer(state, validTargetIds[0]);
            if (targetPlayer) {
                targetPlayer.cards.push({
                    type: "action",
                    action: "second_chance",
                });
            } else {
                state.discardPile.push({
                    type: "action",
                    action: "second_chance",
                });
            }
            state.pendingChoice = null;
            return;
        }

        pendingChoice.validTargetIds = validTargetIds;
        updatePendingChoiceResult(state);
        return;
    }

    const validTargetIds = getActivePlayers(state).map((player) => player.id);
    if (validTargetIds.length === 0) {
        state.pendingChoice = null;
        return;
    }

    if (
        getPlayer(state, pendingChoice.chooserPlayerId) === null ||
        validTargetIds.length === 1
    ) {
        const targetId = validTargetIds[0];
        state.pendingChoice = null;
        if (pendingChoice.card === "freeze") {
            applyFreeze(state, targetId);
        } else {
            beginForcedDraw(state, targetId);
        }
        return;
    }

    pendingChoice.validTargetIds = validTargetIds;
    updatePendingChoiceResult(state);
}

function startRound(
    state: Flip7State,
    opts?: { advanceDealer?: boolean; resultType?: "round_started" | "round_advanced" },
) {
    moveCurrentRoundCardsToDiscard(state);
    resetRoundPlayers(state);

    if (state.players.length === 0) {
        state.phase = "game_over";
        state.winners = [];
        state.lastResult = {
            type: "game_over",
            winners: [],
            endedByHost: false,
        };
        return;
    }

    if (opts?.advanceDealer && state.players.length > 0) {
        state.dealerIndex = (state.dealerIndex + 1) % state.players.length;
    } else if (state.dealerIndex >= state.players.length) {
        state.dealerIndex = 0;
    }

    state.roundNumber += 1;
    state.currentPlayerIndex = null;
    state.initialDealOrder = buildInitialDealOrder(state.players, state.dealerIndex);
    state.initialDealCursor = 0;
    state.pendingChoice = null;
    state.forcedDraw = null;
    state.turnActionPlayerId = null;
    state.lastRoundResult = null;
    state.winners = null;
    state.endedByHost = false;
    state.phase = "initial_deal";
    state.lastResult = {
        type:
            opts?.resultType === "round_advanced"
                ? "round_advanced"
                : "round_started",
        roundNumber: state.roundNumber,
        dealerId: getDealerId(state),
    } as Flip7Result;

    continueFlow(state);
}

export function initGame(
    players: { id: string; name: string }[],
    hostId: string,
    opts?: {
        targetScore?: number;
        deck?: Flip7Card[];
        shuffleMode?: Flip7ShuffleMode;
    },
): Flip7State {
    const shuffleMode = opts?.shuffleMode ?? "random";
    const deckCount = Math.max(1, Math.ceil(players.length / 18));

    const state: Flip7State = {
        hostId,
        players: players.map((player) => ({
            id: player.id,
            name: player.name,
            totalScore: 0,
            status: "active",
            cards: [],
        })),
        phase: "initial_deal",
        roundNumber: 0,
        targetScore: opts?.targetScore ?? TARGET_SCORE,
        dealerIndex: 0,
        currentPlayerIndex: null,
        deck: [...(opts?.deck ?? shuffleCards(createDeck(deckCount), shuffleMode))],
        discardPile: [],
        initialDealOrder: [],
        initialDealCursor: 0,
        pendingChoice: null,
        forcedDraw: null,
        turnActionPlayerId: null,
        lastResult: null,
        lastRoundResult: null,
        winners: null,
        endedByHost: false,
        shuffleMode,
    };

    startRound(state, { advanceDealer: false, resultType: "round_started" });
    return state;
}

export function processAction(
    state: Flip7State,
    action: Flip7Action,
): Flip7Result {
    if (action.type === "next_round") {
        if (action.playerId !== state.hostId) {
            return { type: "error", message: "Only the host can start the next round" };
        }
        if (state.phase !== "round_over") {
            return { type: "error", message: "Round is still in progress" };
        }

        startRound(state, { advanceDealer: true, resultType: "round_advanced" });
        return state.lastResult ?? {
            type: "round_advanced",
            roundNumber: state.roundNumber,
        };
    }

    if (isRoundFinished(state)) {
        return { type: "error", message: "The round is not active" };
    }

    if (action.type === "choose_target") {
        const pendingChoice = state.pendingChoice;
        if (!pendingChoice) {
            return { type: "error", message: "No target selection is pending" };
        }
        if (pendingChoice.chooserPlayerId !== action.playerId) {
            return { type: "error", message: "Only the required player may choose the target" };
        }
        if (!pendingChoice.validTargetIds.includes(action.targetId)) {
            return { type: "error", message: "Invalid target" };
        }

        state.pendingChoice = null;

        if (pendingChoice.card === "second_chance") {
            const target = getPlayer(state, action.targetId);
            if (target) {
                target.cards.push({ type: "action", action: "second_chance" });
            } else {
                state.discardPile.push({ type: "action", action: "second_chance" });
            }
        } else if (pendingChoice.card === "freeze") {
            applyFreeze(state, action.targetId);
        } else {
            beginForcedDraw(state, action.targetId);
        }

        state.lastResult = {
            type: "target_chosen",
            chooserPlayerId: action.playerId,
            targetId: action.targetId,
            card: pendingChoice.card,
        };
        continueFlow(state);
        return state.lastResult ?? {
            type: "target_chosen",
            chooserPlayerId: action.playerId,
            targetId: action.targetId,
            card: pendingChoice.card,
        };
    }

    if (state.pendingChoice) {
        return { type: "error", message: "Resolve the pending target selection first" };
    }

    if (state.phase !== "turn") {
        return { type: "error", message: "The round is still resolving" };
    }

    const currentPlayerIndex = state.currentPlayerIndex;
    const currentPlayer =
        currentPlayerIndex === null
            ? null
            : state.players[currentPlayerIndex] ?? null;

    if (!currentPlayer || currentPlayer.id !== action.playerId) {
        return { type: "error", message: "It is not your turn" };
    }

    if (currentPlayerIndex === null) {
        return { type: "error", message: "It is not your turn" };
    }

    if (currentPlayer.status !== "active") {
        return { type: "error", message: "You are no longer active in this round" };
    }

    if (action.type === "stay") {
        if (currentPlayer.cards.length === 0) {
            return {
                type: "error",
                message: "You need at least one card in front of you to stay",
            };
        }

        currentPlayer.status = "stayed";
        state.currentPlayerIndex = getNextActivePlayerIndex(
            state,
            currentPlayerIndex,
        );

        if (state.currentPlayerIndex === null) {
            finalizeRound(state, "all_players_inactive");
            return state.lastResult ?? {
                type: "round_over",
                roundNumber: state.roundNumber,
                endReason: "all_players_inactive",
                flip7WinnerId: null,
            };
        }

        state.lastResult = {
            type: "player_stayed",
            playerId: action.playerId,
        };
        continueFlow(state);
        return state.lastResult ?? {
            type: "player_stayed",
            playerId: action.playerId,
        };
    }

    state.turnActionPlayerId = action.playerId;
    state.lastResult = {
        type: "player_hit",
        playerId: action.playerId,
    };
    resolveDrawForPlayer(state, action.playerId);

    if (isRoundFinished(state) || state.pendingChoice) {
        return state.lastResult ?? {
            type: "player_hit",
            playerId: action.playerId,
        };
    }

    continueFlow(state);
    return state.lastResult ?? {
        type: "player_hit",
        playerId: action.playerId,
    };
}

export function endGameByHost(state: Flip7State): Flip7Result {
    if (state.phase === "game_over") {
        state.endedByHost = true;
        return {
            type: "game_over",
            winners: [...(state.winners ?? [])],
            endedByHost: true,
        };
    }

    if (state.phase === "round_over") {
        state.phase = "game_over";
        state.endedByHost = true;
        const highestScore = Math.max(
            ...state.players.map((player) => player.totalScore),
            0,
        );
        state.winners = state.players
            .filter((player) => player.totalScore === highestScore)
            .map((player) => player.id);
        state.lastResult = {
            type: "game_over",
            winners: [...state.winners],
            endedByHost: true,
        };
        return state.lastResult;
    }

    finalizeRound(state, "host_ended", { forceGameOver: true });
    return state.lastResult ?? {
        type: "game_over",
        winners: [...(state.winners ?? [])],
        endedByHost: true,
    };
}

export function removePlayer(
    state: Flip7State,
    playerId: string,
): Flip7Result | null {
    const playerIndex = getPlayerIndex(state, playerId);
    if (playerIndex < 0) return null;

    const [removedPlayer] = state.players.splice(playerIndex, 1);
    if (removedPlayer?.cards.length) {
        state.discardPile.push(...removedPlayer.cards);
    }

    state.initialDealOrder = state.initialDealOrder.filter((id) => id !== playerId);
    if (state.initialDealCursor > state.initialDealOrder.length) {
        state.initialDealCursor = state.initialDealOrder.length;
    }

    if (state.dealerIndex >= state.players.length) {
        state.dealerIndex = 0;
    } else if (playerIndex < state.dealerIndex) {
        state.dealerIndex = Math.max(0, state.dealerIndex - 1);
    }

    if (state.currentPlayerIndex !== null) {
        if (state.currentPlayerIndex >= state.players.length) {
            state.currentPlayerIndex = state.players.length - 1;
        } else if (playerIndex < state.currentPlayerIndex) {
            state.currentPlayerIndex = Math.max(0, state.currentPlayerIndex - 1);
        } else if (playerIndex === state.currentPlayerIndex) {
            state.currentPlayerIndex = null;
        }
    }

    if (state.turnActionPlayerId === playerId) {
        state.turnActionPlayerId = null;
    }
    if (state.forcedDraw?.playerId === playerId) {
        state.forcedDraw = null;
    }
    if (state.pendingChoice) {
        refreshPendingChoice(state);
    }

    if (state.players.length === 0) {
        state.phase = "game_over";
        state.winners = [];
        state.lastResult = {
            type: "game_over",
            winners: [],
            endedByHost: false,
        };
        return state.lastResult;
    }

    if (state.players.length === 1) {
        state.phase = "game_over";
        state.winners = [state.players[0].id];
        state.lastResult = {
            type: "game_over",
            winners: [...state.winners],
            endedByHost: false,
        };
        return state.lastResult;
    }

    continueFlow(state);

    if (state.phase === "game_over") {
        return state.lastResult;
    }

    return null;
}
