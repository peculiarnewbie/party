import type {
    DiscType,
    SkullAction,
    SkullEngineResult,
    SkullPlayer,
    SkullResult,
    SkullState,
} from "./types";
import { SKULL_STARTING_HAND } from "./types";

export type ChooseStartingPlayer = (
    players: readonly { id: string; name: string }[],
) => string;

function defaultChooseStartingPlayer(
    players: readonly { id: string; name: string }[],
) {
    return players[Math.floor(Math.random() * players.length)]!.id;
}

function cloneStartingHand(): DiscType[] {
    return [...SKULL_STARTING_HAND];
}

export function getActivePlayers(state: SkullState): SkullPlayer[] {
    return state.players.filter((player) => !player.eliminated);
}

export function getPlayer(state: SkullState, playerId: string) {
    return state.players.find((player) => player.id === playerId) ?? null;
}

function getPlayerIndex(state: SkullState, playerId: string) {
    return state.players.findIndex((player) => player.id === playerId);
}

function getActivePlayerIds(state: SkullState) {
    return getActivePlayers(state).map((player) => player.id);
}

function isActivePlayer(state: SkullState, playerId: string) {
    return getPlayer(state, playerId)?.eliminated === false;
}

function getNextPlayerId(
    state: SkullState,
    currentPlayerId: string,
    eligibleIds?: readonly string[],
) {
    const allowed = new Set(eligibleIds ?? getActivePlayerIds(state));
    if (allowed.size === 0) return null;

    const startIndex = getPlayerIndex(state, currentPlayerId);
    if (startIndex < 0) {
        return state.players.find((player) => allowed.has(player.id))?.id ?? null;
    }

    for (let offset = 1; offset <= state.players.length; offset++) {
        const index = (startIndex + offset) % state.players.length;
        const player = state.players[index]!;
        if (allowed.has(player.id)) {
            return player.id;
        }
    }

    return null;
}

function getTotalDiscsOnMats(state: SkullState) {
    return state.players.reduce((total, player) => total + player.mat.length, 0);
}

function getRevealedCountForOwner(state: SkullState, ownerId: string) {
    return (
        state.attempt?.revealedSteps.filter((step) => step.ownerId === ownerId)
            .length ?? 0
    );
}

function getHiddenDiscCountForOwner(state: SkullState, ownerId: string) {
    const player = getPlayer(state, ownerId);
    if (!player) return 0;
    return player.mat.length - getRevealedCountForOwner(state, ownerId);
}

function getEligibleAuctionPlayerIds(state: SkullState) {
    const passedIds = new Set(state.passedBidderIds);
    return getActivePlayers(state)
        .filter((player) => !passedIds.has(player.id))
        .map((player) => player.id);
}

function clearRoundTransientState(state: SkullState) {
    state.playersWhoPlacedOpeningDisc = [];
    state.highestBid = null;
    state.highestBidderId = null;
    state.passedBidderIds = [];
    state.attempt = null;
    state.penaltyPlayerId = null;
    state.pendingNextStarterChooserId = null;
}

function collectMatsBackToHands(state: SkullState) {
    for (const player of state.players) {
        if (player.mat.length > 0) {
            player.hand.push(...player.mat);
            player.mat = [];
        }
    }
}

function resolvePreferredStarterId(state: SkullState, preferredId: string) {
    if (isActivePlayer(state, preferredId)) {
        return preferredId;
    }

    return getNextPlayerId(state, preferredId) ?? getActivePlayers(state)[0]?.id ?? "";
}

function startNextRound(
    state: SkullState,
    starterPlayerId: string,
    events: SkullResult[],
) {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 0) {
        state.phase = "game_over";
        state.winnerId = null;
        events.push({
            type: "game_over",
            winnerId: null,
            reason: "not_enough_players",
        });
        return;
    }

    const resolvedStarter = resolvePreferredStarterId(state, starterPlayerId);
    clearRoundTransientState(state);
    state.roundNumber += 1;
    state.phase = "turn_prep";
    state.starterPlayerId = resolvedStarter;
    state.currentPlayerId = resolvedStarter;

    events.push({
        type: "round_started",
        roundNumber: state.roundNumber,
        starterPlayerId: resolvedStarter,
    });
}

function endWithWinner(
    state: SkullState,
    winnerId: string | null,
    reason:
        | "two_challenges"
        | "last_player_standing"
        | "host_ended"
        | "not_enough_players",
    events: SkullResult[],
) {
    state.phase = "game_over";
    state.winnerId = winnerId;
    state.currentPlayerId = winnerId ?? state.currentPlayerId;
    state.attempt = null;
    state.penaltyPlayerId = null;
    state.pendingNextStarterChooserId = null;
    events.push({
        type: "game_over",
        winnerId,
        reason,
    });
}

function maybeEndForLastPlayerStanding(state: SkullState, events: SkullResult[]) {
    const activePlayers = getActivePlayers(state);
    if (activePlayers.length === 1) {
        endWithWinner(
            state,
            activePlayers[0]!.id,
            "last_player_standing",
            events,
        );
        return true;
    }

    if (activePlayers.length === 0) {
        endWithWinner(state, null, "not_enough_players", events);
        return true;
    }

    return false;
}

function getNextAttemptDisc(state: SkullState, ownerId: string) {
    const player = getPlayer(state, ownerId);
    if (!player) return null;

    const revealedCount = getRevealedCountForOwner(state, ownerId);
    const hiddenIndex = player.mat.length - revealedCount - 1;
    if (hiddenIndex < 0) return null;

    return player.mat[hiddenIndex] ?? null;
}

function resolveAttemptFailure(
    state: SkullState,
    ownerId: string,
    events: SkullResult[],
) {
    const attempt = state.attempt!;
    const ownSkull = ownerId === attempt.challengerId;

    state.phase = "penalty";
    state.penaltyPlayerId = ownerId;
    state.pendingNextStarterChooserId = ownSkull ? attempt.challengerId : null;
    state.starterPlayerId = ownSkull
        ? state.starterPlayerId
        : resolvePreferredStarterId(state, ownerId);
    state.currentPlayerId = ownerId;
    state.highestBid = null;
    state.highestBidderId = null;
    state.passedBidderIds = [];
    events.push({
        type: "attempt_failed",
        challengerId: attempt.challengerId,
        ownerId,
        target: attempt.target,
        revealedCount: attempt.revealedCount,
        ownSkull,
    });
    state.attempt = null;
    collectMatsBackToHands(state);
    events.push({
        type: "discard_required",
        playerId: ownerId,
    });
}

function resolveAttemptSuccess(state: SkullState, events: SkullResult[]) {
    const attempt = state.attempt!;
    const challenger = getPlayer(state, attempt.challengerId)!;

    challenger.successfulChallenges += 1;
    events.push({
        type: "attempt_succeeded",
        challengerId: challenger.id,
        successfulChallenges: challenger.successfulChallenges,
        target: attempt.target,
    });

    collectMatsBackToHands(state);
    state.attempt = null;
    state.highestBid = null;
    state.highestBidderId = null;
    state.passedBidderIds = [];

    if (challenger.successfulChallenges >= 2) {
        endWithWinner(state, challenger.id, "two_challenges", events);
        return;
    }

    startNextRound(state, challenger.id, events);
}

function revealDisc(
    state: SkullState,
    ownerId: string,
    automatic: boolean,
    events: SkullResult[],
) {
    const attempt = state.attempt;
    if (!attempt) {
        return;
    }

    const disc = getNextAttemptDisc(state, ownerId);
    if (!disc) {
        return;
    }

    attempt.revealedSteps.push({
        ownerId,
        disc,
        automatic,
    });
    attempt.revealedCount += 1;
    events.push({
        type: "disc_revealed",
        ownerId,
        disc,
        revealedCount: attempt.revealedCount,
        target: attempt.target,
        automatic,
    });

    if (disc === "skull") {
        resolveAttemptFailure(state, ownerId, events);
        return;
    }

    if (attempt.revealedCount >= attempt.target) {
        resolveAttemptSuccess(state, events);
    }
}

function runAutoReveal(state: SkullState, events: SkullResult[]) {
    const attempt = state.attempt;
    if (!attempt) return;

    while (state.phase === "attempt" && state.attempt && !state.attempt.autoRevealDone) {
        const hiddenCount = getHiddenDiscCountForOwner(state, attempt.challengerId);
        if (hiddenCount <= 0) {
            break;
        }

        revealDisc(state, attempt.challengerId, true, events);
        if (state.phase !== "attempt") {
            return;
        }

        if (state.attempt.revealedCount >= state.attempt.target) {
            return;
        }
    }

    if (state.phase === "attempt" && state.attempt) {
        state.attempt.autoRevealDone = true;
        state.currentPlayerId = state.attempt.challengerId;
    }
}

function beginAttempt(state: SkullState, events: SkullResult[]) {
    if (!state.highestBid || !state.highestBidderId) {
        return;
    }

    state.phase = "attempt";
    state.currentPlayerId = state.highestBidderId;
    state.attempt = {
        challengerId: state.highestBidderId,
        target: state.highestBid,
        revealedCount: 0,
        autoRevealDone: false,
        revealedSteps: [],
    };

    events.push({
        type: "attempt_started",
        challengerId: state.highestBidderId,
        target: state.highestBid,
    });

    runAutoReveal(state, events);
}

function finalizeAuctionIfNeeded(
    state: SkullState,
    currentPlayerId: string,
    events: SkullResult[],
) {
    const eligibleIds = getEligibleAuctionPlayerIds(state);
    if (eligibleIds.length <= 1) {
        beginAttempt(state, events);
        return;
    }

    const nextPlayerId = getNextPlayerId(state, currentPlayerId, eligibleIds);
    if (nextPlayerId) {
        state.currentPlayerId = nextPlayerId;
    }
}

export function initGame(
    inputPlayers: { id: string; name: string }[],
    chooseStartingPlayer: ChooseStartingPlayer = defaultChooseStartingPlayer,
): SkullState {
    const starterPlayerId = chooseStartingPlayer(inputPlayers);
    const players = inputPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        hand: cloneStartingHand(),
        mat: [],
        successfulChallenges: 0,
        eliminated: false,
    }));

    return {
        players,
        phase: "turn_prep",
        roundNumber: 1,
        starterPlayerId,
        currentPlayerId: starterPlayerId,
        playersWhoPlacedOpeningDisc: [],
        highestBid: null,
        highestBidderId: null,
        passedBidderIds: [],
        attempt: null,
        penaltyPlayerId: null,
        pendingNextStarterChooserId: null,
        winnerId: null,
    };
}

export function processAction(
    state: SkullState,
    action: SkullAction,
): SkullEngineResult {
    if (state.phase === "game_over") {
        return { type: "error", message: "Game is over" };
    }

    const player = getPlayer(state, action.playerId);
    if (!player) {
        return { type: "error", message: "Player not found" };
    }

    const events: SkullResult[] = [];

    if (action.type === "play_disc") {
        if (state.phase !== "turn_prep" && state.phase !== "building") {
            return { type: "error", message: "Cannot play a disc right now" };
        }
        if (state.currentPlayerId !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (player.hand.length === 0) {
            return { type: "error", message: "No discs left in hand" };
        }

        const handIndex = player.hand.indexOf(action.disc);
        if (handIndex < 0) {
            return { type: "error", message: "That disc is not in your hand" };
        }

        const [disc] = player.hand.splice(handIndex, 1);
        player.mat.push(disc!);

        if (
            state.phase === "turn_prep" &&
            !state.playersWhoPlacedOpeningDisc.includes(player.id)
        ) {
            state.playersWhoPlacedOpeningDisc.push(player.id);
        }

        events.push({
            type: "disc_played",
            playerId: player.id,
            matCount: player.mat.length,
            handCount: player.hand.length,
        });

        const activeIds = getActivePlayerIds(state);
        const everyoneOpened = activeIds.every((id) =>
            state.playersWhoPlacedOpeningDisc.includes(id),
        );

        if (state.phase === "turn_prep" && everyoneOpened) {
            state.phase = "building";
            state.currentPlayerId = state.starterPlayerId;
            return { type: "ok", events };
        }

        const nextPlayerId = getNextPlayerId(state, player.id);
        if (nextPlayerId) {
            state.currentPlayerId = nextPlayerId;
        }

        return { type: "ok", events };
    }

    if (action.type === "start_challenge") {
        if (state.phase !== "building") {
            return { type: "error", message: "Cannot start a challenge right now" };
        }
        if (state.currentPlayerId !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }

        const maxBid = getTotalDiscsOnMats(state);
        if (action.bid < 1 || action.bid > maxBid) {
            return { type: "error", message: "Bid is out of range" };
        }

        state.phase = "auction";
        state.highestBid = action.bid;
        state.highestBidderId = action.playerId;
        state.passedBidderIds = [];
        events.push({
            type: "challenge_started",
            playerId: action.playerId,
            bid: action.bid,
        });

        finalizeAuctionIfNeeded(state, action.playerId, events);
        return { type: "ok", events };
    }

    if (action.type === "raise_bid") {
        if (state.phase !== "auction") {
            return { type: "error", message: "Auction is not active" };
        }
        if (state.currentPlayerId !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (state.highestBid === null) {
            return { type: "error", message: "No active bid" };
        }

        const maxBid = getTotalDiscsOnMats(state);
        if (action.bid <= state.highestBid || action.bid > maxBid) {
            return { type: "error", message: "Bid must be higher and within range" };
        }

        state.highestBid = action.bid;
        state.highestBidderId = action.playerId;
        events.push({
            type: "bid_raised",
            playerId: action.playerId,
            bid: action.bid,
        });

        finalizeAuctionIfNeeded(state, action.playerId, events);
        return { type: "ok", events };
    }

    if (action.type === "pass_bid") {
        if (state.phase !== "auction") {
            return { type: "error", message: "Auction is not active" };
        }
        if (state.currentPlayerId !== action.playerId) {
            return { type: "error", message: "Not your turn" };
        }
        if (!state.highestBidderId) {
            return { type: "error", message: "No active bidder" };
        }
        if (action.playerId === state.highestBidderId) {
            return { type: "error", message: "Highest bidder cannot pass" };
        }
        if (state.passedBidderIds.includes(action.playerId)) {
            return { type: "error", message: "Player already passed" };
        }

        state.passedBidderIds.push(action.playerId);
        events.push({
            type: "bid_passed",
            playerId: action.playerId,
        });

        finalizeAuctionIfNeeded(state, action.playerId, events);
        return { type: "ok", events };
    }

    if (action.type === "flip_disc") {
        if (state.phase !== "attempt" || !state.attempt) {
            return { type: "error", message: "No attempt is active" };
        }
        if (action.playerId !== state.attempt.challengerId) {
            return { type: "error", message: "Only the challenger can flip discs" };
        }
        if (!state.attempt.autoRevealDone) {
            return { type: "error", message: "Your mat must finish auto-revealing first" };
        }
        if (action.ownerId === action.playerId) {
            return { type: "error", message: "Your own mat is already being handled automatically" };
        }
        if (!isActivePlayer(state, action.ownerId)) {
            return { type: "error", message: "Target player is not active" };
        }
        if (getHiddenDiscCountForOwner(state, action.ownerId) <= 0) {
            return { type: "error", message: "That mat has no hidden discs left" };
        }

        revealDisc(state, action.ownerId, false, events);
        return { type: "ok", events };
    }

    if (action.type === "discard_lost_disc") {
        if (state.phase !== "penalty" || state.penaltyPlayerId !== action.playerId) {
            return { type: "error", message: "Only the penalized player can discard now" };
        }

        if (action.discIndex < 0 || action.discIndex >= player.hand.length) {
            return { type: "error", message: "Invalid disc choice" };
        }

        player.hand.splice(action.discIndex, 1);
        if (player.hand.length === 0) {
            player.eliminated = true;
        }

        state.penaltyPlayerId = null;
        events.push({
            type: "disc_lost",
            playerId: player.id,
            remainingHandCount: player.hand.length,
            eliminated: player.eliminated,
        });

        if (maybeEndForLastPlayerStanding(state, events)) {
            return { type: "ok", events };
        }

        if (state.pendingNextStarterChooserId) {
            state.phase = "next_starter";
            state.currentPlayerId = state.pendingNextStarterChooserId;
            events.push({
                type: "next_starter_required",
                chooserId: state.pendingNextStarterChooserId,
            });
            return { type: "ok", events };
        }

        startNextRound(state, state.starterPlayerId, events);
        return { type: "ok", events };
    }

    if (action.type === "choose_next_starter") {
        if (
            state.phase !== "next_starter" ||
            state.pendingNextStarterChooserId !== action.playerId
        ) {
            return { type: "error", message: "Starter choice is not available" };
        }
        if (!isActivePlayer(state, action.nextStarterId)) {
            return { type: "error", message: "Chosen starter must still be active" };
        }

        events.push({
            type: "next_starter_chosen",
            chooserId: action.playerId,
            starterPlayerId: action.nextStarterId,
        });
        state.pendingNextStarterChooserId = null;
        startNextRound(state, action.nextStarterId, events);
        return { type: "ok", events };
    }

    return { type: "error", message: "Unknown action" };
}

export function removePlayer(state: SkullState, playerId: string) {
    const removedIndex = getPlayerIndex(state, playerId);
    if (removedIndex < 0) {
        return null;
    }

    const removedPlayer = state.players[removedIndex]!;
    state.players.splice(removedIndex, 1);
    state.playersWhoPlacedOpeningDisc = state.playersWhoPlacedOpeningDisc.filter(
        (id) => id !== playerId,
    );
    state.passedBidderIds = state.passedBidderIds.filter((id) => id !== playerId);

    if (state.players.length === 0) {
        state.phase = "game_over";
        state.winnerId = null;
        return {
            type: "game_over",
            winnerId: null,
            reason: "not_enough_players",
        } satisfies SkullResult;
    }

    const events: SkullResult[] = [];
    if (maybeEndForLastPlayerStanding(state, events)) {
        return events[0] ?? null;
    }

    if (
        state.phase === "auction" ||
        state.phase === "attempt" ||
        state.phase === "penalty" ||
        state.phase === "next_starter"
    ) {
        startNextRound(
            state,
            getNextPlayerId(state, removedPlayer.id) ?? state.players[0]!.id,
            events,
        );
        return events[0] ?? null;
    }

    if (
        state.currentPlayerId === playerId ||
        state.starterPlayerId === playerId ||
        state.highestBidderId === playerId
    ) {
        const fallbackId =
            getNextPlayerId(state, removedPlayer.id) ?? state.players[0]!.id;
        state.currentPlayerId = fallbackId;
        state.starterPlayerId = resolvePreferredStarterId(state, state.starterPlayerId);
        state.highestBidderId =
            state.highestBidderId === playerId ? null : state.highestBidderId;
        if (state.highestBidderId === null) {
            state.highestBid = null;
            state.passedBidderIds = [];
            if (state.phase === "building" || state.phase === "turn_prep") {
                state.currentPlayerId = fallbackId;
            }
        }
    }

    return null;
}

export function endGameByHost(state: SkullState): SkullResult {
    state.phase = "game_over";
    state.attempt = null;
    state.penaltyPlayerId = null;
    state.pendingNextStarterChooserId = null;
    return {
        type: "game_over",
        winnerId: state.winnerId,
        reason: "host_ended",
    };
}
