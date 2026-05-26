import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import {
    buildGameServerMessageSchemaWithoutGameOver,
    createPlayerViewDecoder,
    createServerMessageDecoder,
    encodeGameServerMessage,
} from "~/game/shared/game-wire";

export const CREATURE_TYPES = [
    "bat",
    "fly",
    "cockroach",
    "toad",
    "rat",
    "scorpion",
    "spider",
    "stink_bug",
] as const;

const creatureTypeSchema = Schema.Literals(CREATURE_TYPES);
const cockroachPokerPhases = ["offering", "awaiting_response", "game_over"] as const;
const loseReasons = ["four_of_a_kind", "empty_hand"] as const;

const cockroachPokerPhaseSchema = Schema.Literals(cockroachPokerPhases);
const loseReasonSchema = Schema.Literals(loseReasons);

const cockroachPokerPlayerStateSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    hand: Schema.mutableKey(Schema.mutable(Schema.Array(creatureTypeSchema))),
    faceUpCards: Schema.mutableKey(
        Schema.mutable(Schema.Array(creatureTypeSchema)),
    ),
});

const offerChainSchema = Schema.Struct({
    originalOffererId: Schema.mutableKey(Schema.String),
    cardValue: Schema.mutableKey(creatureTypeSchema),
    currentClaim: Schema.mutableKey(creatureTypeSchema),
    currentOffererId: Schema.mutableKey(Schema.String),
    currentReceiverId: Schema.mutableKey(Schema.String),
    seenByPlayerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
});

export const cockroachPokerResultSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("error")),
        message: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("card_offered")),
        offererId: Schema.mutableKey(Schema.String),
        receiverId: Schema.mutableKey(Schema.String),
        claim: Schema.mutableKey(creatureTypeSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("call_resolved")),
        callerId: Schema.mutableKey(Schema.String),
        calledTrue: Schema.mutableKey(Schema.Boolean),
        wasCorrect: Schema.mutableKey(Schema.Boolean),
        actualCard: Schema.mutableKey(creatureTypeSchema),
        cardTakerId: Schema.mutableKey(Schema.String),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("card_passed")),
        passerId: Schema.mutableKey(Schema.String),
        newReceiverId: Schema.mutableKey(Schema.String),
        newClaim: Schema.mutableKey(creatureTypeSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("game_over")),
        loserId: Schema.mutableKey(Schema.String),
        reason: Schema.mutableKey(loseReasonSchema),
    }),
]);

export const cockroachPokerStateSchema = Schema.Struct({
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(cockroachPokerPlayerStateSchema)),
    ),
    phase: Schema.mutableKey(cockroachPokerPhaseSchema),
    activePlayerId: Schema.mutableKey(Schema.String),
    offerChain: Schema.mutableKey(Schema.NullOr(offerChainSchema)),
    loserId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    loseReason: Schema.mutableKey(Schema.NullOr(loseReasonSchema)),
    lastResult: Schema.mutableKey(Schema.NullOr(cockroachPokerResultSchema)),
});

const cockroachPokerPlayerInfoSchema = Schema.Struct({
    id: Schema.mutableKey(Schema.String),
    name: Schema.mutableKey(Schema.String),
    handCount: Schema.mutableKey(Schema.Number),
    faceUpCards: Schema.mutableKey(
        Schema.mutable(Schema.Array(creatureTypeSchema)),
    ),
});

const offerChainViewSchema = Schema.Struct({
    originalOffererId: Schema.mutableKey(Schema.String),
    currentOffererId: Schema.mutableKey(Schema.String),
    currentReceiverId: Schema.mutableKey(Schema.String),
    currentClaim: Schema.mutableKey(creatureTypeSchema),
    seenByPlayerIds: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    peekedCard: Schema.mutableKey(Schema.NullOr(creatureTypeSchema)),
    mustAccept: Schema.mutableKey(Schema.Boolean),
});

export const cockroachPokerPlayerViewSchema = Schema.Struct({
    myId: Schema.mutableKey(Schema.String),
    phase: Schema.mutableKey(cockroachPokerPhaseSchema),
    activePlayerId: Schema.mutableKey(Schema.String),
    isMyTurn: Schema.mutableKey(Schema.Boolean),
    players: Schema.mutableKey(
        Schema.mutable(Schema.Array(cockroachPokerPlayerInfoSchema)),
    ),
    myHand: Schema.mutableKey(Schema.mutable(Schema.Array(creatureTypeSchema))),
    offerChain: Schema.mutableKey(Schema.NullOr(offerChainViewSchema)),
    loserId: Schema.mutableKey(Schema.NullOr(Schema.String)),
    loseReason: Schema.mutableKey(Schema.NullOr(loseReasonSchema)),
    lastResult: Schema.mutableKey(Schema.NullOr(cockroachPokerResultSchema)),
    validPassTargets: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
    validOfferTargets: Schema.mutableKey(
        Schema.mutable(Schema.Array(Schema.String)),
    ),
});

export const cockroachPokerServerMessageSchema =
    buildGameServerMessageSchemaWithoutGameOver({
        prefix: "cockroach_poker",
        playerViewSchema: cockroachPokerPlayerViewSchema,
        actionSchema: cockroachPokerResultSchema,
    });

export type CreatureType = SchemaType<typeof creatureTypeSchema>;
export type CockroachPokerPhase = SchemaType<typeof cockroachPokerPhaseSchema>;
export type CockroachPokerPlayer = SchemaType<
    typeof cockroachPokerPlayerStateSchema
>;
export type OfferChain = SchemaType<typeof offerChainSchema>;
export type CockroachPokerState = SchemaType<typeof cockroachPokerStateSchema>;
export type CockroachPokerPlayerInfo = SchemaType<
    typeof cockroachPokerPlayerInfoSchema
>;
export type OfferChainView = SchemaType<typeof offerChainViewSchema>;
export type CockroachPokerPlayerView = SchemaType<
    typeof cockroachPokerPlayerViewSchema
>;
export type CockroachPokerResult = SchemaType<typeof cockroachPokerResultSchema>;
export type CockroachPokerServerMessage = SchemaType<
    typeof cockroachPokerServerMessageSchema
>;

export type CockroachPokerSideMessage = Exclude<
    CockroachPokerServerMessage,
    { type: "cockroach_poker:state" }
>;

export const decodeCockroachPokerPlayerView = createPlayerViewDecoder(
    cockroachPokerPlayerViewSchema,
);
export const decodeCockroachPokerSideMessage = createServerMessageDecoder(
    "cockroach_poker:state",
    cockroachPokerServerMessageSchema,
);
export const encodeCockroachPokerServerMessage = (
    message: CockroachPokerServerMessage,
) => encodeGameServerMessage(cockroachPokerServerMessageSchema, message);
