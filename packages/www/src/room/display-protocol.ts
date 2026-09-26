import { Schema } from "effect";
import { roomPhaseSchema, gameTypeSchema } from "~/game";
import { pokerTableViewSchema } from "~/game/poker/table-view";

export const displayStateSchema = Schema.Struct({
    phase: roomPhaseSchema,
    selectedGameType: gameTypeSchema,
    activeGameType: Schema.NullOr(gameTypeSchema),
    players: Schema.Array(
        Schema.Struct({ id: Schema.String, name: Schema.String }),
    ),
    poker: Schema.NullOr(pokerTableViewSchema),
});

export const displayMessageSchema = Schema.Struct({
    type: Schema.Literal("display:state"),
    data: displayStateSchema,
});

export type DisplayState = typeof displayStateSchema.Type;
