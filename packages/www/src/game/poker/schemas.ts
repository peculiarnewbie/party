import { Schema } from "effect";

import { RANKS, SUITS } from "~/assets/card-deck/types";

import type { PokerPlayerView } from "./views";

export const pokerStreets = [
    "preflop",
    "flop",
    "turn",
    "river",
    "showdown",
    "hand_over",
    "tournament_over",
] as const;

export const pokerPlayerStatuses = [
    "active",
    "folded",
    "all_in",
    "busted",
    "disconnected",
] as const;

export const pokerActionTypes = [
    "fold",
    "check",
    "call",
    "bet",
    "raise",
    "all_in",
] as const;

const suitSchema = Schema.Literals(SUITS);
const rankSchema = Schema.Literals(RANKS);

export const pokerStreetSchema = Schema.Literals(pokerStreets);
export const pokerPlayerStatusSchema = Schema.Literals(pokerPlayerStatuses);
export const pokerActionTypeSchema = Schema.Literals(pokerActionTypes);

export const cardSchema = Schema.Struct({
    suit: Schema.mutableKey(suitSchema),
    rank: Schema.mutableKey(rankSchema),
});

export const pokerPotSchema = Schema.Struct({
    amount: Schema.mutableKey(Schema.Number),
    eligiblePlayerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
});

export const pokerSpectatorSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
});

export const pokerEventSchema = Schema.Union([
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("hand_started")),
        message: Schema.mutableKey(Schema.String),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("blinds_posted")),
        message: Schema.mutableKey(Schema.String),
        playerId: Schema.mutableKey(Schema.String),
        amount: Schema.mutableKey(Schema.Number),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("player_action")),
        message: Schema.mutableKey(Schema.String),
        playerId: Schema.mutableKey(Schema.String),
        amount: Schema.optionalKey(Schema.mutableKey(Schema.Number)),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("board_dealt")),
        message: Schema.mutableKey(Schema.String),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("showdown")),
        message: Schema.mutableKey(Schema.String),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("pot_awarded")),
        message: Schema.mutableKey(Schema.String),
        amount: Schema.optionalKey(Schema.mutableKey(Schema.Number)),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("player_disconnected")),
        message: Schema.mutableKey(Schema.String),
        playerId: Schema.mutableKey(Schema.String),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("player_reconnected")),
        message: Schema.mutableKey(Schema.String),
        playerId: Schema.mutableKey(Schema.String),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("game_ended")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        id: Schema.mutableKey(Schema.Number),
        type: Schema.mutableKey(Schema.Literal("info")),
        message: Schema.mutableKey(Schema.String),
        street: Schema.mutableKey(pokerStreetSchema),
    }),
]);

const pokerPlayerPublicViewSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    stack: Schema.mutableKey(Schema.Number),
    status: Schema.mutableKey(pokerPlayerStatusSchema),
    connected: Schema.mutableKey(Schema.Boolean),
    committedThisStreet: Schema.mutableKey(Schema.Number),
    committedThisHand: Schema.mutableKey(Schema.Number),
    holeCardCount: Schema.mutableKey(Schema.Number),
    visibleHoleCards: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    isDealer: Schema.mutableKey(Schema.Boolean),
    isSmallBlind: Schema.mutableKey(Schema.Boolean),
    isBigBlind: Schema.mutableKey(Schema.Boolean),
    isActing: Schema.mutableKey(Schema.Boolean),
});

const pokerViewStatusSchema = Schema.NullOr(
    Schema.Literals([...pokerPlayerStatuses, "spectator"] as const),
);

export const pokerPlayerViewSchema = Schema.Struct({
    myHoleCards: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    myHoleCardCount: Schema.mutableKey(Schema.Number),
    myStack: Schema.mutableKey(Schema.Number),
    myStatus: Schema.mutableKey(pokerViewStatusSchema),
    isSpectator: Schema.mutableKey(Schema.Boolean),
    legalActions: Schema.mutableKey(
        Schema.mutable(Schema.Array(pokerActionTypeSchema)),
    ),
    callAmount: Schema.mutableKey(Schema.Number),
    minBetOrRaise: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    maxBet: Schema.mutableKey(Schema.Number),
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(pokerPlayerPublicViewSchema)),
    ),
    board: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    pots: Schema.mutableKey(Schema.mutable(Schema.Array(pokerPotSchema))),
    actingPlayerId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    street: Schema.mutableKey(pokerStreetSchema),
    handNumber: Schema.mutableKey(Schema.Number),
    eventLog: Schema.mutableKey(Schema.mutable(Schema.Array(pokerEventSchema))),
    spectators: Schema.mutableKey(
        Schema.mutable(Schema.Array(pokerSpectatorSchema)),
    ),
    endedByHost: Schema.mutableKey(Schema.Boolean),
    winnerIds: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
});

export const pokerActionResultPayloadSchema = Schema.Struct({
    error: Schema.mutableKey(Schema.String),
});

export const pokerGameOverPayloadSchema = Schema.Struct({
    winnerIds: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
    endedByHost: Schema.mutableKey(Schema.Boolean),
});

const pokerPlayerSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    stack: Schema.mutableKey(Schema.Number),
    holeCards: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    status: Schema.mutableKey(pokerPlayerStatusSchema),
    connected: Schema.mutableKey(Schema.Boolean),
    committedThisStreet: Schema.mutableKey(Schema.Number),
    committedThisHand: Schema.mutableKey(Schema.Number),
    hasActedThisStreet: Schema.mutableKey(Schema.Boolean),
    raiseLocked: Schema.mutableKey(Schema.Boolean),
});

export const pokerStateSchema = Schema.Struct({
    players: Schema.mutableKey(Schema.mutable(Schema.Array(pokerPlayerSchema))),
    spectators: Schema.mutableKey(
        Schema.mutable(Schema.Array(pokerSpectatorSchema)),
    ),
    deck: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    board: Schema.mutableKey(Schema.mutable(Schema.Array(cardSchema))),
    dealerIndex: Schema.mutableKey(Schema.Number),
    smallBlindIndex: Schema.mutableKey(Schema.Number),
    bigBlindIndex: Schema.mutableKey(Schema.Number),
    actingPlayerIndex: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    street: Schema.mutableKey(pokerStreetSchema),
    pots: Schema.mutableKey(Schema.mutable(Schema.Array(pokerPotSchema))),
    currentBet: Schema.mutableKey(Schema.Number),
    minRaise: Schema.mutableKey(Schema.Number),
    handNumber: Schema.mutableKey(Schema.Number),
    lastAggressorIndex: Schema.mutableKey(Schema.NullOr(Schema.Number)),
    endedByHost: Schema.mutableKey(Schema.Boolean),
    winnerIds: Schema.mutableKey(
        Schema.NullOr(Schema.mutable(Schema.Array(Schema.String))),
    ),
    eventLog: Schema.mutableKey(Schema.mutable(Schema.Array(pokerEventSchema))),
    eventSeq: Schema.mutableKey(Schema.Number),
});

export function decodePokerPlayerView(raw: unknown): PokerPlayerView | null {
    try {
        return Schema.decodeUnknownSync(pokerPlayerViewSchema)(raw) as PokerPlayerView;
    } catch {
        return null;
    }
}
