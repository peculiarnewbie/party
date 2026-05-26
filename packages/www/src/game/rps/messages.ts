import { Schema } from "effect";

import { decodeGameClientMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";
import { emptyDataSchema } from "~/game/shared/wire-schemas";

import { rpsBestOfValues, rpsChoices } from "./schemas";

export { rpsChoices, rpsBestOfValues } from "./schemas";

export const rpsClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rps:throw")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                choice: Schema.mutableKey(Schema.Literals(rpsChoices)),
            }),
        ),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rps:next_round")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(emptyDataSchema),
    }),
    Schema.Struct({
        type: Schema.mutableKey(Schema.Literal("rps:set_best_of")),
        playerId: Schema.mutableKey(Schema.String),
        playerName: Schema.mutableKey(Schema.String),
        data: Schema.mutableKey(
            Schema.Struct({
                bestOf: Schema.mutableKey(Schema.Literals(rpsBestOfValues)),
            }),
        ),
    }),
]);

export type RpsClientMessage = SchemaType<typeof rpsClientMessageSchema>;

export {
    decodeRpsPlayerView,
    decodeRpsSideMessage,
    encodeRpsServerMessage,
    rpsServerMessageSchema,
    type RpsServerMessage,
} from "./schemas";

export function decodeRpsClientMessage(raw: unknown) {
    return decodeGameClientMessage("rps", rpsClientMessageSchema, raw);
}
