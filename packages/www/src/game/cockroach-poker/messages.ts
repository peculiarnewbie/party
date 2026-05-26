import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { CREATURE_TYPES } from "./schemas";
import {
    emptyDataSchema,
    nonNegativeIntSchema,
} from "~/game/shared/wire-schemas";

const creatureTypeSchema = Schema.Literals(CREATURE_TYPES);

export const cockroachPokerClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cockroach_poker:offer_card")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                targetId: Schema.mutableKey(Schema.String),
                cardIndex: Schema.mutableKey(nonNegativeIntSchema),
                claim: Schema.mutableKey(creatureTypeSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cockroach_poker:call_true")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cockroach_poker:call_false")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("cockroach_poker:peek_and_pass")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                targetId: Schema.mutableKey(Schema.String),
                newClaim: Schema.mutableKey(creatureTypeSchema),
            }),
        ),
    }),
]);

export type CockroachPokerClientMessage = SchemaType<
    typeof cockroachPokerClientMessageSchema
>;

export {
    cockroachPokerServerMessageSchema,
    encodeCockroachPokerServerMessage,
    type CockroachPokerServerMessage,
} from "./schemas";

export function decodeCockroachPokerClientMessage(raw: unknown) {
    return decodeGameClientMessage(
        "cockroach_poker",
        cockroachPokerClientMessageSchema,
        raw,
    );
}
