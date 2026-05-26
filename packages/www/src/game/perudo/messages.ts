import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { emptyDataSchema, positiveIntSchema } from "~/game/shared/wire-schemas";

import { perudoFaceValues } from "./schemas";

const faceValueSchema = Schema.Literals(perudoFaceValues);

export { perudoFaceValues };

export const perudoClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("perudo:bid")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                quantity: Schema.mutableKey(positiveIntSchema),
                faceValue: Schema.mutableKey(faceValueSchema),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("perudo:challenge")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("perudo:start_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
]);

export type PerudoClientMessage = SchemaType<typeof perudoClientMessageSchema>;

export {
    encodePerudoServerMessage,
    perudoServerMessageSchema,
    type PerudoServerMessage,
} from "./schemas";

export function decodePerudoClientMessage(raw: unknown) {
    return decodeGameClientMessage("perudo", perudoClientMessageSchema, raw);
}
