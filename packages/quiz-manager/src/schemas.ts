import { Schema } from "effect";

export const QuestionType = Schema.Literals([
    "multiple_choice",
    "fill_in",
    "open",
    "placeholder",
]);
export type QuestionType = typeof QuestionType.Type;

export const MatchType = Schema.Literals(["exact", "contains", "any"]);
export type MatchType = typeof MatchType.Type;

export class AnswerOption extends Schema.Class<AnswerOption>("AnswerOption")({
    id: Schema.String,
    questionId: Schema.String,
    text: Schema.String,
    isCorrect: Schema.Boolean,
    sortOrder: Schema.Number,
}) {}

export class AcceptedAnswer extends Schema.Class<AcceptedAnswer>("AcceptedAnswer")({
    id: Schema.String,
    questionId: Schema.String,
    pattern: Schema.String,
    matchType: MatchType,
    caseInsensitive: Schema.Boolean,
    sortOrder: Schema.Number,
}) {}

export class Question extends Schema.Class<Question>("Question")({
    id: Schema.String,
    quizId: Schema.String,
    type: QuestionType,
    text: Schema.String,
    sortOrder: Schema.Number,
    options: Schema.Array(AnswerOption),
    acceptedAnswers: Schema.Array(AcceptedAnswer),
}) {}

export class QuizSummary extends Schema.Class<QuizSummary>("QuizSummary")({
    id: Schema.String,
    title: Schema.String,
    description: Schema.NullOr(Schema.String),
    questionCount: Schema.Number,
    tags: Schema.Array(
        Schema.Struct({
            name: Schema.String,
            slug: Schema.String,
        }),
    ),
    typeBreakdown: Schema.Struct({
        multipleChoice: Schema.Number,
        fillIn: Schema.Number,
        open: Schema.Number,
        placeholder: Schema.Number,
    }),
}) {}

export class QuizWithQuestions extends Schema.Class<QuizWithQuestions>("QuizWithQuestions")({
    id: Schema.String,
    title: Schema.String,
    description: Schema.NullOr(Schema.String),
    questions: Schema.Array(Question),
}) {}

export class TagWithCount extends Schema.Class<TagWithCount>("TagWithCount")({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    quizCount: Schema.Number,
}) {}

const optionInputSchema = Schema.Struct({
    text: Schema.String,
    isCorrect: Schema.Boolean,
});

const acceptedAnswerInputSchema = Schema.Struct({
    pattern: Schema.String,
    matchType: MatchType,
    caseInsensitive: Schema.Boolean,
});

export const questionInputSchema = Schema.Struct({
    type: QuestionType,
    text: Schema.String,
    options: Schema.optional(Schema.Array(optionInputSchema)),
    acceptedAnswers: Schema.optional(Schema.Array(acceptedAnswerInputSchema)),
});

export type QuestionInput = typeof questionInputSchema.Type;
