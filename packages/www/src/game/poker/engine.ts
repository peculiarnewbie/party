import { RANKS, SUITS } from "~/assets/card-deck/types";
import type { Card } from "~/assets/card-deck/types";
import type {
    PokerAction,
    PokerActionResult,
    PokerEvent,
    PokerHandValue,
    PokerPlayer,
    PokerPlayerStatus,
    PokerPot,
    PokerState,
    PokerStreet,
} from "./types";

export const POKER_STARTING_STACK = 1000;
export const POKER_SMALL_BLIND = 10;
export const POKER_BIG_BLIND = 20;

const MAX_LOG_LENGTH = 24;

export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

function defaultShuffle<T>(arr: T[]): T[] {
    const next = [...arr];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

function pushEvent(
    state: PokerState,
    event: Omit<PokerEvent, "id">,
) {
    state.eventSeq += 1;
    state.eventLog = [
        ...state.eventLog,
        {
            ...event,
            id: state.eventSeq,
        },
    ].slice(-MAX_LOG_LENGTH);
}

function seatHasChips(player: PokerPlayer): boolean {
    return player.stack > 0;
}

function isContestantStatus(status: PokerPlayerStatus): boolean {
    return status === "active" || status === "all_in";
}

function isPubliclyInHand(status: PokerPlayerStatus): boolean {
    return status === "active" || status === "all_in" || status === "folded";
}

function getOccupiedSeatIndexes(state: PokerState): number[] {
    return state.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => seatHasChips(player))
        .map(({ index }) => index);
}

function findNextIndex(
    state: PokerState,
    fromIndex: number,
    predicate: (player: PokerPlayer) => boolean,
): number | null {
    if (state.players.length === 0) return null;

    for (let offset = 1; offset <= state.players.length; offset += 1) {
        const index = (fromIndex + offset) % state.players.length;
        if (predicate(state.players[index])) {
            return index;
        }
    }

    return null;
}

function findPreviousOrSelfOccupiedIndex(state: PokerState): number {
    const occupied = getOccupiedSeatIndexes(state);
    if (occupied.length === 0) return -1;

    if (state.dealerIndex >= 0 && occupied.includes(state.dealerIndex)) {
        const next = findNextIndex(
            state,
            state.dealerIndex,
            (player) => seatHasChips(player),
        );
        return next ?? occupied[0];
    }

    return occupied[0];
}

function getActiveIndexes(state: PokerState): number[] {
    return state.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => player.status === "active")
        .map(({ index }) => index);
}

function getContestantIndexes(state: PokerState): number[] {
    return state.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => isContestantStatus(player.status))
        .map(({ index }) => index);
}

function dealHoleCards(state: PokerState) {
    for (let round = 0; round < 2; round += 1) {
        for (const player of state.players) {
            if (player.status === "active") {
                const card = state.deck.pop();
                if (card) {
                    player.holeCards.push(card);
                }
            }
        }
    }
}

function postBlind(
    state: PokerState,
    index: number,
    blindAmount: number,
) {
    const player = state.players[index];
    const paid = Math.min(blindAmount, player.stack);
    player.stack -= paid;
    player.committedThisStreet += paid;
    player.committedThisHand += paid;

    if (player.status === "active" && player.stack === 0) {
        player.status = "all_in";
    }

    pushEvent(state, {
        type: "blinds_posted",
        playerId: player.id,
        amount: paid,
        street: state.street,
        message: `${player.name} posted ${blindAmount === POKER_SMALL_BLIND ? "the small blind" : "the big blind"} (${paid})`,
    });
}

function resetStreet(state: PokerState) {
    for (const player of state.players) {
        player.committedThisStreet = 0;
        player.hasActedThisStreet = player.status !== "active";
        player.raiseLocked = false;
    }
    state.currentBet = 0;
    state.minRaise = POKER_BIG_BLIND;
    state.lastAggressorIndex = null;
}

function buildPots(players: PokerPlayer[]): PokerPot[] {
    const thresholds = [...new Set(players.map((player) => player.committedThisHand))]
        .filter((amount) => amount > 0)
        .sort((a, b) => a - b);

    const pots: PokerPot[] = [];
    let previous = 0;

    for (const threshold of thresholds) {
        const contributors = players.filter(
            (player) => player.committedThisHand >= threshold,
        );
        const amount = (threshold - previous) * contributors.length;
        if (amount <= 0) {
            previous = threshold;
            continue;
        }

        pots.push({
            amount,
            eligiblePlayerIds: contributors
                .filter((player) => isContestantStatus(player.status))
                .map((player) => player.id),
        });
        previous = threshold;
    }

    return pots;
}

function refreshPots(state: PokerState) {
    state.pots = buildPots(state.players);
}

function normalizeRank(rank: number): number {
    return rank === 1 ? 14 : rank;
}

function getStraightHigh(ranks: number[]): number | null {
    const unique = [...new Set(ranks.map(normalizeRank))].sort((a, b) => b - a);
    if (unique.includes(14)) {
        unique.push(1);
    }

    let run = 1;
    for (let i = 1; i < unique.length; i += 1) {
        if (unique[i - 1] - unique[i] === 1) {
            run += 1;
            if (run >= 5) {
                return unique[i - 4];
            }
        } else {
            run = 1;
        }
    }

    return null;
}

export function evaluateFiveCardHand(cards: Card[]): PokerHandValue {
    const ranks = cards
        .map((card) => normalizeRank(card.rank))
        .sort((a, b) => b - a);
    const counts = new Map<number, number>();
    for (const rank of ranks) {
        counts.set(rank, (counts.get(rank) ?? 0) + 1);
    }

    const groups = [...counts.entries()].sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return b[0] - a[0];
    });
    const isFlush = cards.every((card) => card.suit === cards[0].suit);
    const straightHigh = getStraightHigh(cards.map((card) => card.rank));

    if (isFlush && straightHigh !== null) {
        return {
            category: 8,
            label: "Straight Flush",
            values: [straightHigh],
        };
    }

    if (groups[0]?.[1] === 4) {
        return {
            category: 7,
            label: "Four of a Kind",
            values: [groups[0][0], groups[1][0]],
        };
    }

    if (groups[0]?.[1] === 3 && groups[1]?.[1] === 2) {
        return {
            category: 6,
            label: "Full House",
            values: [groups[0][0], groups[1][0]],
        };
    }

    if (isFlush) {
        return {
            category: 5,
            label: "Flush",
            values: ranks,
        };
    }

    if (straightHigh !== null) {
        return {
            category: 4,
            label: "Straight",
            values: [straightHigh],
        };
    }

    if (groups[0]?.[1] === 3) {
        const kickers = groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a);
        return {
            category: 3,
            label: "Three of a Kind",
            values: [groups[0][0], ...kickers],
        };
    }

    if (groups[0]?.[1] === 2 && groups[1]?.[1] === 2) {
        const pairs = [groups[0][0], groups[1][0]].sort((a, b) => b - a);
        const kicker = groups[2][0];
        return {
            category: 2,
            label: "Two Pair",
            values: [...pairs, kicker],
        };
    }

    if (groups[0]?.[1] === 2) {
        const kickers = groups.slice(1).map(([rank]) => rank).sort((a, b) => b - a);
        return {
            category: 1,
            label: "One Pair",
            values: [groups[0][0], ...kickers],
        };
    }

    return {
        category: 0,
        label: "High Card",
        values: ranks,
    };
}

function compareHandValues(a: PokerHandValue, b: PokerHandValue): number {
    if (a.category !== b.category) {
        return a.category - b.category;
    }

    const length = Math.max(a.values.length, b.values.length);
    for (let i = 0; i < length; i += 1) {
        const av = a.values[i] ?? 0;
        const bv = b.values[i] ?? 0;
        if (av !== bv) {
            return av - bv;
        }
    }

    return 0;
}

export function evaluateBestHand(cards: Card[]): PokerHandValue {
    let best: PokerHandValue | null = null;

    for (let a = 0; a < cards.length - 4; a += 1) {
        for (let b = a + 1; b < cards.length - 3; b += 1) {
            for (let c = b + 1; c < cards.length - 2; c += 1) {
                for (let d = c + 1; d < cards.length - 1; d += 1) {
                    for (let e = d + 1; e < cards.length; e += 1) {
                        const value = evaluateFiveCardHand([
                            cards[a],
                            cards[b],
                            cards[c],
                            cards[d],
                            cards[e],
                        ]);
                        if (!best || compareHandValues(value, best) > 0) {
                            best = value;
                        }
                    }
                }
            }
        }
    }

    return best ?? {
        category: 0,
        label: "High Card",
        values: [],
    };
}

function getLegalActionContext(state: PokerState, playerId: string) {
    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex < 0 || state.actingPlayerIndex !== playerIndex) {
        return null;
    }

    const player = state.players[playerIndex];
    if (player.status !== "active") {
        return null;
    }

    const callAmount = Math.max(0, state.currentBet - player.committedThisStreet);
    const maxBet = player.stack;

    return {
        playerIndex,
        player,
        callAmount,
        maxBet,
        minBetOrRaise:
            state.currentBet === 0
                ? Math.min(player.stack, POKER_BIG_BLIND)
                : Math.min(
                      player.stack,
                      callAmount + state.minRaise,
                  ),
    };
}

export function getLegalActions(
    state: PokerState,
    playerId: string,
): {
    legalActions: PokerAction["type"][];
    callAmount: number;
    minBetOrRaise: number | null;
    maxBet: number;
} {
    const context = getLegalActionContext(state, playerId);
    if (!context) {
        return {
            legalActions: [],
            callAmount: 0,
            minBetOrRaise: null,
            maxBet: 0,
        };
    }

    const { player, callAmount, maxBet, minBetOrRaise } = context;
    const legal = new Set<PokerAction["type"]>();

    legal.add("fold");
    legal.add("all_in");

    if (callAmount === 0) {
        legal.add("check");
        if (player.stack > 0) {
            legal.add("bet");
        }
    } else {
        legal.add("call");
    }

    const canMakeFullRaise =
        state.currentBet > 0 &&
        player.stack > callAmount &&
        !player.raiseLocked &&
        player.stack >= callAmount + state.minRaise;

    if (canMakeFullRaise) {
        legal.add("raise");
    }

    return {
        legalActions: [...legal],
        callAmount,
        minBetOrRaise: legal.has("bet") || legal.has("raise") ? minBetOrRaise : null,
        maxBet,
    };
}

function updateActingPlayer(state: PokerState, fromIndex: number) {
    state.actingPlayerIndex =
        findNextIndex(state, fromIndex, (player) => player.status === "active");
}

function allActivePlayersHaveMatched(state: PokerState): boolean {
    const activePlayers = state.players.filter((player) => player.status === "active");
    if (activePlayers.length === 0) {
        return true;
    }

    return activePlayers.every(
        (player) =>
            player.hasActedThisStreet &&
            player.committedThisStreet === state.currentBet,
    );
}

function closeHand(state: PokerState, winnerIds?: string[]) {
    for (const player of state.players) {
        if (player.stack === 0) {
            player.status = "busted";
        } else if (!player.connected) {
            player.status = "disconnected";
        }
    }

    for (const player of state.players) {
        player.committedThisHand = 0;
        player.committedThisStreet = 0;
        player.hasActedThisStreet = true;
        player.raiseLocked = false;
    }

    state.pots = [];
    state.currentBet = 0;
    state.lastAggressorIndex = null;
    state.actingPlayerIndex = null;

    const remaining = state.players.filter((player) => player.stack > 0);
    if (remaining.length <= 1) {
        state.street = "tournament_over";
        state.winnerIds = winnerIds ?? remaining.map((player) => player.id);
        return;
    }

    state.street = "hand_over";
    state.winnerIds = null;
}

function awardUncontestedPot(state: PokerState, winnerId: string) {
    const total = state.players.reduce(
        (sum, player) => sum + player.committedThisHand,
        0,
    );
    const winner = state.players.find((player) => player.id === winnerId);
    if (!winner) return;

    winner.stack += total;
    pushEvent(state, {
        type: "pot_awarded",
        playerId: winner.id,
        amount: total,
        street: state.street,
        message: `${winner.name} won ${total} chips uncontested`,
    });
    closeHand(state, [winner.id]);
}

function awardOddChip(
    state: PokerState,
    winnerIndexes: number[],
): number {
    if (winnerIndexes.length === 0) return -1;
    let index = state.dealerIndex;
    for (let offset = 1; offset <= state.players.length; offset += 1) {
        index = (index + 1) % state.players.length;
        if (winnerIndexes.includes(index)) {
            return index;
        }
    }
    return winnerIndexes[0];
}

function resolveShowdown(state: PokerState) {
    state.street = "showdown";
    refreshPots(state);

    const contenders = state.players
        .map((player, index) => ({ player, index }))
        .filter(({ player }) => isContestantStatus(player.status));

    const handValues = new Map<string, PokerHandValue>();
    for (const { player } of contenders) {
        handValues.set(
            player.id,
            evaluateBestHand([...player.holeCards, ...state.board]),
        );
    }

    const revealed = contenders
        .map(({ player }) => {
            const value = handValues.get(player.id);
            return `${player.name} showed ${value?.label ?? "High Card"}`;
        })
        .join(" · ");

    pushEvent(state, {
        type: "showdown",
        street: state.street,
        message: revealed || "Showdown",
    });

    for (const pot of state.pots) {
        const eligible = contenders.filter(({ player }) =>
            pot.eligiblePlayerIds.includes(player.id),
        );

        if (eligible.length === 0) continue;

        let bestValue = handValues.get(eligible[0].player.id)!;
        let winnerIndexes = [eligible[0].index];

        for (let i = 1; i < eligible.length; i += 1) {
            const contender = eligible[i];
            const contenderValue = handValues.get(contender.player.id)!;
            const comparison = compareHandValues(contenderValue, bestValue);
            if (comparison > 0) {
                bestValue = contenderValue;
                winnerIndexes = [contender.index];
            } else if (comparison === 0) {
                winnerIndexes.push(contender.index);
            }
        }

        const share = Math.floor(pot.amount / winnerIndexes.length);
        const oddChip = pot.amount % winnerIndexes.length;

        for (const winnerIndex of winnerIndexes) {
            state.players[winnerIndex].stack += share;
        }

        if (oddChip > 0) {
            const oddChipIndex = awardOddChip(state, winnerIndexes);
            if (oddChipIndex >= 0) {
                state.players[oddChipIndex].stack += oddChip;
            }
        }

        const winnerNames = winnerIndexes
            .map((index) => state.players[index].name)
            .join(" & ");
        pushEvent(state, {
            type: "pot_awarded",
            amount: pot.amount,
            street: state.street,
            message: `${winnerNames} won ${pot.amount} chips with ${bestValue.label}`,
        });
    }

    const leaders = state.players
        .filter((player) => player.stack > 0)
        .sort((a, b) => b.stack - a.stack);
    closeHand(state, leaders.length === 1 ? [leaders[0].id] : undefined);
}

function advanceStreet(state: PokerState) {
    if (state.street === "river") {
        resolveShowdown(state);
        return;
    }

    resetStreet(state);

    if (state.street === "preflop") {
        state.street = "flop";
        const cards = [state.deck.pop(), state.deck.pop(), state.deck.pop()].filter(
            Boolean,
        ) as Card[];
        state.board.push(...cards);
        pushEvent(state, {
            type: "board_dealt",
            street: state.street,
            message: "Flop dealt",
        });
    } else if (state.street === "flop") {
        state.street = "turn";
        const card = state.deck.pop();
        if (card) state.board.push(card);
        pushEvent(state, {
            type: "board_dealt",
            street: state.street,
            message: "Turn dealt",
        });
    } else if (state.street === "turn") {
        state.street = "river";
        const card = state.deck.pop();
        if (card) state.board.push(card);
        pushEvent(state, {
            type: "board_dealt",
            street: state.street,
            message: "River dealt",
        });
    }

    const nextIndex = findNextIndex(
        state,
        state.dealerIndex,
        (player) => player.status === "active",
    );
    state.actingPlayerIndex = nextIndex;

    if (state.actingPlayerIndex === null) {
        resolveShowdown(state);
    }
}

function resolveActionEnd(state: PokerState, actionIndex: number) {
    refreshPots(state);

    const contestants = getContestantIndexes(state);
    if (contestants.length === 1) {
        awardUncontestedPot(state, state.players[contestants[0]].id);
        return;
    }

    if (contestants.length === 0) {
        for (const player of state.players) {
            player.stack += player.committedThisHand;
            player.committedThisHand = 0;
            player.committedThisStreet = 0;
        }
        pushEvent(state, {
            type: "info",
            street: state.street,
            message: "Hand reset while waiting for a connected player",
        });
        closeHand(state);
        return;
    }

    if (allActivePlayersHaveMatched(state)) {
        advanceStreet(state);
        return;
    }

    updateActingPlayer(state, actionIndex);
}

function markAllOthersPending(state: PokerState, actorIndex: number) {
    for (let i = 0; i < state.players.length; i += 1) {
        const player = state.players[i];
        if (i === actorIndex || player.status !== "active") continue;
        player.hasActedThisStreet = false;
    }
}

function commitChips(player: PokerPlayer, amount: number) {
    const paid = Math.min(player.stack, amount);
    player.stack -= paid;
    player.committedThisStreet += paid;
    player.committedThisHand += paid;
    if (player.stack === 0) {
        player.status = "all_in";
    }
    return paid;
}

function validateNumericAmount(amount: number): number | null {
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
        return null;
    }
    return amount;
}

function applyFold(
    state: PokerState,
    index: number,
    disconnected = false,
) {
    const player = state.players[index];
    player.status = disconnected ? "disconnected" : "folded";
    player.hasActedThisStreet = true;
    pushEvent(state, {
        type: disconnected ? "player_disconnected" : "player_action",
        playerId: player.id,
        street: state.street,
        message: disconnected
            ? `${player.name} disconnected and folded`
            : `${player.name} folded`,
    });
    resolveActionEnd(state, index);
}

export function initGame(
    players: { id: string; name: string }[],
    shuffle: <T>(arr: T[]) => T[] = defaultShuffle,
): PokerState {
    const state: PokerState = {
        players: players.map((player) => ({
            id: player.id,
            name: player.name,
            stack: POKER_STARTING_STACK,
            holeCards: [],
            status: "active",
            connected: true,
            committedThisStreet: 0,
            committedThisHand: 0,
            hasActedThisStreet: false,
            raiseLocked: false,
        })),
        spectators: [],
        deck: [],
        board: [],
        dealerIndex: -1,
        smallBlindIndex: -1,
        bigBlindIndex: -1,
        actingPlayerIndex: null,
        street: "hand_over",
        pots: [],
        currentBet: 0,
        minRaise: POKER_BIG_BLIND,
        handNumber: 0,
        lastAggressorIndex: null,
        endedByHost: false,
        winnerIds: null,
        eventLog: [],
        eventSeq: 0,
    };

    startNextHand(state, shuffle);
    return state;
}

export function startNextHand(
    state: PokerState,
    shuffle: <T>(arr: T[]) => T[] = defaultShuffle,
): boolean {
    if (state.endedByHost || state.street === "tournament_over") {
        return false;
    }

    const remaining = state.players.filter((player) => player.stack > 0);
    if (remaining.length <= 1) {
        state.street = "tournament_over";
        state.winnerIds = remaining.map((player) => player.id);
        return false;
    }

    state.handNumber += 1;
    state.board = [];
    state.deck = shuffle(createDeck());
    state.pots = [];
    state.currentBet = 0;
    state.minRaise = POKER_BIG_BLIND;
    state.lastAggressorIndex = null;
    state.winnerIds = null;
    state.street = "preflop";

    for (const player of state.players) {
        player.holeCards = [];
        player.committedThisStreet = 0;
        player.committedThisHand = 0;
        player.hasActedThisStreet = false;
        player.raiseLocked = false;
        if (player.stack <= 0) {
            player.status = "busted";
        } else if (!player.connected) {
            player.status = "disconnected";
        } else {
            player.status = "active";
        }
    }

    state.dealerIndex = findPreviousOrSelfOccupiedIndex(state);
    const occupied = getOccupiedSeatIndexes(state);
    if (occupied.length === 0) {
        state.street = "tournament_over";
        state.winnerIds = [];
        return false;
    }

    if (occupied.length === 2) {
        state.smallBlindIndex = state.dealerIndex;
        state.bigBlindIndex =
            findNextIndex(state, state.dealerIndex, seatHasChips) ?? state.dealerIndex;
    } else {
        state.smallBlindIndex =
            findNextIndex(state, state.dealerIndex, seatHasChips) ?? state.dealerIndex;
        state.bigBlindIndex =
            findNextIndex(state, state.smallBlindIndex, seatHasChips) ??
            state.smallBlindIndex;
    }

    dealHoleCards(state);
    postBlind(state, state.smallBlindIndex, POKER_SMALL_BLIND);
    postBlind(state, state.bigBlindIndex, POKER_BIG_BLIND);

    state.currentBet = Math.max(
        state.players[state.smallBlindIndex]?.committedThisStreet ?? 0,
        state.players[state.bigBlindIndex]?.committedThisStreet ?? 0,
    );

    if (occupied.length === 2) {
        state.actingPlayerIndex =
            findNextIndex(state, state.bigBlindIndex, (player) => player.status === "active");
    } else {
        state.actingPlayerIndex =
            findNextIndex(state, state.bigBlindIndex, (player) => player.status === "active");
    }

    pushEvent(state, {
        type: "hand_started",
        street: state.street,
        message: `Hand ${state.handNumber} started`,
    });

    refreshPots(state);
    const contestants = getContestantIndexes(state);
    if (contestants.length <= 1 && contestants[0] !== undefined) {
        awardUncontestedPot(state, state.players[contestants[0]].id);
    } else if (contestants.length === 0) {
        closeHand(state);
    }

    return true;
}

export function addSpectator(
    state: PokerState,
    spectator: { id: string; name: string },
) {
    const existing = state.spectators.find((item) => item.id === spectator.id);
    if (existing) {
        existing.name = spectator.name;
        return;
    }

    state.spectators.push({
        id: spectator.id,
        name: spectator.name,
    });
}

export function removeSpectator(state: PokerState, spectatorId: string) {
    state.spectators = state.spectators.filter((spectator) => spectator.id !== spectatorId);
}

export function reconnectPlayer(
    state: PokerState,
    playerId: string,
    playerName: string,
) {
    const player = state.players.find((item) => item.id === playerId);
    if (!player) {
        addSpectator(state, { id: playerId, name: playerName });
        return;
    }

    player.name = playerName;
    player.connected = true;
    removeSpectator(state, playerId);

    pushEvent(state, {
        type: "player_reconnected",
        playerId,
        street: state.street,
        message: `${player.name} reconnected`,
    });
}

export function disconnectPlayer(state: PokerState, playerId: string) {
    const playerIndex = state.players.findIndex((player) => player.id === playerId);
    if (playerIndex < 0) {
        removeSpectator(state, playerId);
        return;
    }

    const player = state.players[playerIndex];
    player.connected = false;

    if (player.status === "active") {
        applyFold(state, playerIndex, true);
        return;
    }

    if (player.stack <= 0) {
        player.status = "busted";
    } else if (player.status !== "all_in") {
        player.status = "disconnected";
    }

    pushEvent(state, {
        type: "player_disconnected",
        playerId: player.id,
        street: state.street,
        message: `${player.name} disconnected`,
    });
}

export function endGameByHost(state: PokerState) {
    if (state.street === "tournament_over") return;

    for (const player of state.players) {
        player.stack += player.committedThisHand;
        player.committedThisHand = 0;
        player.committedThisStreet = 0;
        if (player.stack <= 0) {
            player.status = "busted";
        } else if (!player.connected) {
            player.status = "disconnected";
        }
    }

    state.pots = [];
    state.currentBet = 0;
    state.actingPlayerIndex = null;
    state.lastAggressorIndex = null;
    state.endedByHost = true;
    state.street = "tournament_over";

    const highestStack = Math.max(
        ...state.players.map((player) => player.stack),
        0,
    );
    state.winnerIds = state.players
        .filter((player) => player.stack === highestStack)
        .map((player) => player.id);

    pushEvent(state, {
        type: "game_ended",
        street: state.street,
        message: "The host ended the poker game",
    });
}

export function processAction(
    state: PokerState,
    playerId: string,
    action: PokerAction,
): PokerActionResult {
    if (state.street === "tournament_over" || state.street === "hand_over") {
        return {
            type: "error",
            message: "This hand is not accepting actions",
        };
    }

    const context = getLegalActionContext(state, playerId);
    if (!context) {
        return {
            type: "error",
            message: "It is not your turn",
        };
    }

    const { playerIndex, player, callAmount } = context;
    const legal = getLegalActions(state, playerId);
    if (!legal.legalActions.includes(action.type)) {
        return {
            type: "error",
            message: "That action is not legal right now",
        };
    }

    if (action.type === "fold") {
        applyFold(state, playerIndex);
        return { type: "ok", stateChanged: true };
    }

    if (action.type === "check") {
        player.hasActedThisStreet = true;
        pushEvent(state, {
            type: "player_action",
            playerId: player.id,
            street: state.street,
            message: `${player.name} checked`,
        });
        resolveActionEnd(state, playerIndex);
        return { type: "ok", stateChanged: true };
    }

    if (action.type === "call") {
        const paid = commitChips(player, callAmount);
        player.hasActedThisStreet = true;
        pushEvent(state, {
            type: "player_action",
            playerId: player.id,
            amount: paid,
            street: state.street,
            message: `${player.name} called ${paid}`,
        });
        resolveActionEnd(state, playerIndex);
        return { type: "ok", stateChanged: true };
    }

    if (action.type === "all_in") {
        const paid = commitChips(player, player.stack);
        const newTotal = player.committedThisStreet;
        const raiseSize = newTotal - state.currentBet;
        const isOpeningBet = state.currentBet === 0;
        const isFullRaise = isOpeningBet
            ? newTotal >= POKER_BIG_BLIND
            : newTotal >= state.currentBet + state.minRaise;

        if (newTotal > state.currentBet) {
            state.currentBet = newTotal;
            if (isFullRaise) {
                state.minRaise = isOpeningBet ? newTotal : raiseSize;
                state.lastAggressorIndex = playerIndex;
                markAllOthersPending(state, playerIndex);
                for (const other of state.players) {
                    if (other.status === "active") {
                        other.raiseLocked = false;
                    }
                }
            } else {
                for (let i = 0; i < state.players.length; i += 1) {
                    if (i === playerIndex) continue;
                    const other = state.players[i];
                    if (other.status !== "active") continue;
                    if (other.hasActedThisStreet) {
                        other.raiseLocked = true;
                    }
                    other.hasActedThisStreet = false;
                }
            }
        }

        player.hasActedThisStreet = true;
        pushEvent(state, {
            type: "player_action",
            playerId: player.id,
            amount: paid,
            street: state.street,
            message: `${player.name} went all-in for ${player.committedThisStreet}`,
        });
        resolveActionEnd(state, playerIndex);
        return { type: "ok", stateChanged: true };
    }

    if (action.type === "bet") {
        const amount = validateNumericAmount(action.amount);
        if (!amount) {
            return {
                type: "error",
                message: "Bet amount must be a positive whole number",
            };
        }
        if (state.currentBet !== 0) {
            return {
                type: "error",
                message: "You cannot bet after chips are already in front",
            };
        }
        if (amount < POKER_BIG_BLIND || amount > player.stack) {
            return {
                type: "error",
                message: "Bet amount is out of range",
            };
        }

        const paid = commitChips(player, amount);
        state.currentBet = player.committedThisStreet;
        state.minRaise = amount;
        state.lastAggressorIndex = playerIndex;
        player.hasActedThisStreet = true;
        markAllOthersPending(state, playerIndex);
        pushEvent(state, {
            type: "player_action",
            playerId: player.id,
            amount: paid,
            street: state.street,
            message: `${player.name} bet ${paid}`,
        });
        resolveActionEnd(state, playerIndex);
        return { type: "ok", stateChanged: true };
    }

    if (action.type === "raise") {
        const amount = validateNumericAmount(action.amount);
        if (!amount) {
            return {
                type: "error",
                message: "Raise amount must be a positive whole number",
            };
        }
        if (state.currentBet === 0) {
            return {
                type: "error",
                message: "You cannot raise before a bet exists",
            };
        }
        if (player.raiseLocked) {
            return {
                type: "error",
                message: "Betting has not been reopened to you",
            };
        }

        const total = amount;
        const minimumTotal = state.currentBet + state.minRaise;
        if (total < minimumTotal) {
            return {
                type: "error",
                message: `Minimum raise total is ${minimumTotal}`,
            };
        }

        const additional = total - player.committedThisStreet;
        if (additional > player.stack) {
            return {
                type: "error",
                message: "You do not have enough chips for that raise",
            };
        }

        const paid = commitChips(player, additional);
        const previousBet = state.currentBet;
        state.currentBet = player.committedThisStreet;
        state.minRaise = state.currentBet - previousBet;
        state.lastAggressorIndex = playerIndex;
        player.hasActedThisStreet = true;
        markAllOthersPending(state, playerIndex);
        for (const other of state.players) {
            if (other.status === "active") {
                other.raiseLocked = false;
            }
        }
        pushEvent(state, {
            type: "player_action",
            playerId: player.id,
            amount: paid,
            street: state.street,
            message: `${player.name} raised to ${player.committedThisStreet}`,
        });
        resolveActionEnd(state, playerIndex);
        return { type: "ok", stateChanged: true };
    }

    return {
        type: "error",
        message: "Unknown action",
    };
}
