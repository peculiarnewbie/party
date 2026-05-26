import { Schema } from "effect";
import { playerSchema } from "~/game";

export const quizPlayerViewSchema = Schema.Null;

export const quizServerMessageSchema = Schema.Struct({
    type: Schema.Literal("player_answered"),
    data: Schema.Struct({
        players: Schema.Array(playerSchema),
        answers: Schema.Record(Schema.String, Schema.String),
    }),
});
