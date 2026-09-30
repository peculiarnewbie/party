import { Schema } from "effect";

export const numberCardSchema = Schema.Int.check(
    Schema.isBetween({ minimum: 1, maximum: 104 }),
);
const rowIndexSchema = Schema.Int.check(
    Schema.isBetween({ minimum: 0, maximum: 3 }),
);
const playSchema = Schema.Struct({
    playerId: Schema.String,
    name: Schema.String,
    card: numberCardSchema,
});
const stageSchema = Schema.Union([
    Schema.Struct({ type: Schema.Literal("selecting") }),
    Schema.Struct({ type: Schema.Literal("resolving") }),
    Schema.Struct({
        type: Schema.Literal("choosing"),
        playerId: Schema.String,
        card: numberCardSchema,
    }),
    Schema.Struct({ type: Schema.Literal("round_over") }),
    Schema.Struct({ type: Schema.Literal("game_over") }),
]);
const playerSchema = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    hand: Schema.Array(numberCardSchema),
    selected: Schema.NullOr(numberCardSchema),
    score: Schema.Int,
    roundScore: Schema.Int,
    active: Schema.Boolean,
});
const placementSchema = Schema.Struct({
    ...playSchema.fields,
    row: rowIndexSchema,
    taken: Schema.Array(numberCardSchema),
    penalty: Schema.Int,
});
const sharedFields = {
    round: Schema.Int,
    turn: Schema.Int,
    stage: stageSchema,
    rows: Schema.Array(Schema.Array(numberCardSchema)),
    revealed: Schema.Array(playSchema),
    placements: Schema.Array(placementSchema),
    winners: Schema.Array(Schema.String),
};
export const sixNimmtStateSchema = Schema.Struct({
    ...sharedFields,
    players: Schema.Array(playerSchema),
    queue: Schema.Array(playSchema),
});
export const sixNimmtTableViewSchema = Schema.Struct({
    ...sharedFields,
    players: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            score: Schema.Int,
            roundScore: Schema.Int,
            active: Schema.Boolean,
            ready: Schema.Boolean,
            cardCount: Schema.Int,
        }),
    ),
});
export const sixNimmtPlayerViewSchema = Schema.Struct({
    ...sixNimmtTableViewSchema.fields,
    myHand: Schema.Array(numberCardSchema),
    selected: Schema.NullOr(numberCardSchema),
});
const identity = { playerId: Schema.String, playerName: Schema.String };
const turnFields = { round: Schema.Int, turn: Schema.Int };
export const sixNimmtClientMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.Literal("six_nimmt:lock"),
        ...identity,
        data: Schema.Struct({ ...turnFields, card: numberCardSchema }),
    }),
    Schema.Struct({
        type: Schema.Literal("six_nimmt:choose_row"),
        ...identity,
        data: Schema.Struct({ ...turnFields, row: rowIndexSchema }),
    }),
    Schema.Struct({
        type: Schema.Literal("six_nimmt:next_round"),
        ...identity,
        data: Schema.Struct({ round: Schema.Int }),
    }),
]);
export const sixNimmtServerMessageSchema = Schema.Union([
    Schema.Struct({
        type: Schema.Literal("six_nimmt:state"),
        data: sixNimmtPlayerViewSchema,
    }),
    Schema.Struct({
        type: Schema.Literal("six_nimmt:error"),
        data: Schema.Struct({ message: Schema.String }),
    }),
]);
export type SixNimmtState = typeof sixNimmtStateSchema.Type;
export type SixNimmtTableView = typeof sixNimmtTableViewSchema.Type;
export type SixNimmtPlayerView = typeof sixNimmtPlayerViewSchema.Type;
export type SixNimmtClientMessage = typeof sixNimmtClientMessageSchema.Type;
export type SixNimmtServerMessage = typeof sixNimmtServerMessageSchema.Type;
