import { Data } from "effect";

export class QuizNotFoundError extends Data.TaggedError("QuizNotFoundError")<{
    readonly id: string;
}> {}

export class QuestionNotFoundError extends Data.TaggedError("QuestionNotFoundError")<{
    readonly id: string;
}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
    readonly operation: string;
    readonly cause: unknown;
}> {}

export class TagNotFoundError extends Data.TaggedError("TagNotFoundError")<{
    readonly id: string;
}> {}

export class DuplicateTagError extends Data.TaggedError("DuplicateTagError")<{
    readonly name: string;
}> {}

export class AuthenticationError extends Data.TaggedError("AuthenticationError")<{
    readonly message: string;
}> {}
