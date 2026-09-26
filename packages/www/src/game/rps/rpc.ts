import { Schema } from "effect";
import { Rpc, RpcGroup } from "effect/unstable/rpc";
import {
    rpsBestOfSchema,
    rpsChoiceSchema,
    rpsSyncResponseMessageSchema,
} from "./schemas";

export class RpsRequestError extends Schema.TaggedErrorClass<RpsRequestError>()(
    "RpsRequestError",
    {
        reason: Schema.Literals([
            "unauthorized",
            "stale_session",
            "rejected",
            "unavailable",
        ]),
        message: Schema.String,
    },
) {}

export const rpsCommandSchema = Schema.Union([
    Schema.Struct({
        type: Schema.Literal("rps:throw"),
        data: Schema.Struct({ choice: rpsChoiceSchema }),
    }),
    Schema.Struct({
        type: Schema.Literal("rps:next_round"),
        data: Schema.Struct({}),
    }),
    Schema.Struct({
        type: Schema.Literal("rps:set_best_of"),
        data: Schema.Struct({ bestOf: rpsBestOfSchema }),
    }),
]);

export const RpsApi = RpcGroup.make(
    Rpc.make("command", {
        payload: Schema.Struct({
            gameSessionId: Schema.String,
            commandId: Schema.String.check(
                Schema.isMinLength(1),
                Schema.isMaxLength(100),
            ),
            command: rpsCommandSchema,
        }),
        success: Schema.Void,
        error: RpsRequestError,
    }),
    Rpc.make("sync", {
        payload: Schema.Struct({
            gameSessionId: Schema.String,
            lastSnapshotIndex: Schema.Number,
            lastEventIndex: Schema.Number,
        }),
        success: rpsSyncResponseMessageSchema,
        error: RpsRequestError,
    }),
);
