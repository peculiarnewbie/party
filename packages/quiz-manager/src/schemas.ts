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

export const AnswerOption = Schema.Struct({
    id: Schema.String,
    questionId: Schema.String,
    text: Schema.String,
    isCorrect: Schema.Boolean,
    sortOrder: Schema.Number,
});
export type AnswerOption = typeof AnswerOption.Type;

export const AcceptedAnswer = Schema.Struct({
    id: Schema.String,
    questionId: Schema.String,
    pattern: Schema.String,
    matchType: MatchType,
    caseInsensitive: Schema.Boolean,
    sortOrder: Schema.Number,
});
export type AcceptedAnswer = typeof AcceptedAnswer.Type;

export const Question = Schema.Struct({
    id: Schema.String,
    quizId: Schema.String,
    type: QuestionType,
    text: Schema.String,
    sortOrder: Schema.Number,
    options: Schema.Array(AnswerOption),
    acceptedAnswers: Schema.Array(AcceptedAnswer),
});
export type Question = typeof Question.Type;

export const QuizSummary = Schema.Struct({
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
});
export type QuizSummary = typeof QuizSummary.Type;

export const QuizWithQuestions = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    description: Schema.NullOr(Schema.String),
    questions: Schema.Array(Question),
    tags: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            slug: Schema.String,
        }),
    ),
});
export type QuizWithQuestions = typeof QuizWithQuestions.Type;

export const TagWithCount = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    slug: Schema.String,
    quizCount: Schema.Number,
});
export type TagWithCount = typeof TagWithCount.Type;

const EntityId = Schema.String.check(
    Schema.isLengthBetween(1, 64),
    Schema.isPattern(/^[A-Za-z0-9_-]+$/),
);
const QuizTitle = Schema.Trim.check(Schema.isLengthBetween(1, 200));
const Description = Schema.Trim.check(Schema.isMaxLength(2_000));
const QuestionText = Schema.Trim.check(Schema.isLengthBetween(1, 1_000));
const AnswerText = Schema.Trim.check(Schema.isLengthBetween(1, 500));
const TagName = Schema.Trim.check(Schema.isLengthBetween(1, 80));

const optionInputSchema = Schema.Struct({
    text: AnswerText,
    isCorrect: Schema.Boolean,
});

const acceptedAnswerInputSchema = Schema.Struct({
    pattern: AnswerText,
    matchType: MatchType,
    caseInsensitive: Schema.Boolean,
});

export const questionInputSchema = Schema.Struct({
    type: QuestionType,
    text: QuestionText,
    options: Schema.optional(
        Schema.Array(optionInputSchema).check(Schema.isMaxLength(12)),
    ),
    acceptedAnswers: Schema.optional(
        Schema.Array(acceptedAnswerInputSchema).check(Schema.isMaxLength(50)),
    ),
});

export type QuestionInput = typeof questionInputSchema.Type;

export const entityIdInputSchema = EntityId;
export const tagNameInputSchema = TagName;

export const createQuizInputSchema = Schema.Struct({
    title: QuizTitle,
    description: Schema.optional(Description),
});

export const updateQuizInputSchema = Schema.Struct({
    id: EntityId,
    title: Schema.optional(QuizTitle),
    description: Schema.optional(Description),
});

export const createQuestionInputSchema = Schema.Struct({
    quizId: EntityId,
    ...questionInputSchema.fields,
});

export const updateQuestionInputSchema = Schema.Struct({
    questionId: EntityId,
    ...questionInputSchema.fields,
});

export const reorderQuestionsInputSchema = Schema.Struct({
    quizId: EntityId,
    orderedIds: Schema.Array(EntityId).check(Schema.isMaxLength(500)),
});

export const setQuizTagsInputSchema = Schema.Struct({
    quizId: EntityId,
    tagIds: Schema.Array(EntityId).check(Schema.isMaxLength(100)),
});
