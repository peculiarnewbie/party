import { Schema } from "effect";
import { Rpc, RpcGroup, RpcMiddleware } from "effect/unstable/rpc";
import {
    AuthenticationError,
    DuplicateTagError,
    QuestionNotFoundError,
    QuizNotFoundError,
    ServiceUnavailableError,
    TagNotFoundError,
} from "~/errors";
import {
    QuizSummary,
    QuizWithQuestions,
    TagWithCount,
    createQuestionInputSchema,
    createQuizInputSchema,
    entityIdInputSchema,
    reorderQuestionsInputSchema,
    setQuizTagsInputSchema,
    tagNameInputSchema,
    updateQuestionInputSchema,
    updateQuizInputSchema,
} from "~/schemas";

export class AdminOnly extends RpcMiddleware.Service<AdminOnly>()(
    "Quiz.AdminOnly",
    { error: AuthenticationError },
) {}

export const QuizApi = RpcGroup.make(
    Rpc.make("listQuizzes", {
        success: Schema.Array(QuizSummary),
        error: ServiceUnavailableError,
    }),
    Rpc.make("getQuiz", {
        payload: entityIdInputSchema,
        success: QuizWithQuestions,
        error: Schema.Union([QuizNotFoundError, ServiceUnavailableError]),
    }),
    Rpc.make("createQuiz", {
        payload: createQuizInputSchema,
        success: entityIdInputSchema,
        error: ServiceUnavailableError,
    }),
    Rpc.make("updateQuiz", {
        payload: updateQuizInputSchema,
        error: Schema.Union([QuizNotFoundError, ServiceUnavailableError]),
    }),
    Rpc.make("deleteQuiz", {
        payload: entityIdInputSchema,
        error: Schema.Union([QuizNotFoundError, ServiceUnavailableError]),
    }),
    Rpc.make("createQuestion", {
        payload: createQuestionInputSchema,
        success: entityIdInputSchema,
        error: ServiceUnavailableError,
    }),
    Rpc.make("updateQuestion", {
        payload: updateQuestionInputSchema,
        error: Schema.Union([QuestionNotFoundError, ServiceUnavailableError]),
    }),
    Rpc.make("deleteQuestion", {
        payload: entityIdInputSchema,
        error: Schema.Union([QuestionNotFoundError, ServiceUnavailableError]),
    }),
    Rpc.make("reorderQuestions", {
        payload: reorderQuestionsInputSchema,
        error: ServiceUnavailableError,
    }),
    Rpc.make("listTags", {
        success: Schema.Array(TagWithCount),
        error: ServiceUnavailableError,
    }),
    Rpc.make("createTag", {
        payload: tagNameInputSchema,
        success: entityIdInputSchema,
        error: Schema.Union([DuplicateTagError, ServiceUnavailableError]),
    }),
    Rpc.make("deleteTag", {
        payload: entityIdInputSchema,
        error: Schema.Union([TagNotFoundError, ServiceUnavailableError]),
    }),
    Rpc.make("setQuizTags", {
        payload: setQuizTagsInputSchema,
        error: ServiceUnavailableError,
    }),
)
    .middleware(AdminOnly)
    .add(Rpc.make("getAdminSession", { success: Schema.Boolean }));
