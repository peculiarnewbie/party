import { Schema } from "effect";

export class QuizNotFoundError extends Schema.TaggedErrorClass<QuizNotFoundError>()(
    "QuizNotFoundError",
    { id: Schema.String },
) {}
export class QuestionNotFoundError extends Schema.TaggedErrorClass<QuestionNotFoundError>()(
    "QuestionNotFoundError",
    { id: Schema.String },
) {}
export class TagNotFoundError extends Schema.TaggedErrorClass<TagNotFoundError>()(
    "TagNotFoundError",
    { id: Schema.String },
) {}
export class DuplicateTagError extends Schema.TaggedErrorClass<DuplicateTagError>()(
    "DuplicateTagError",
    { name: Schema.String },
) {}
export class AuthenticationError extends Schema.TaggedErrorClass<AuthenticationError>()(
    "AuthenticationError",
    { message: Schema.String },
) {}
export class ServiceUnavailableError extends Schema.TaggedErrorClass<ServiceUnavailableError>()(
    "ServiceUnavailableError",
    {},
) {}
export class DatabaseError extends Schema.TaggedErrorClass<DatabaseError>()(
    "DatabaseError",
    { operation: Schema.String, cause: Schema.Defect() },
) {}
