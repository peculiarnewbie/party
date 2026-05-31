import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    createdAt: text("created_at")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
        .notNull()
        .$defaultFn(() => new Date().toISOString()),
});

export const questions = sqliteTable("questions", {
    id: text("id").primaryKey(),
    quizId: text("quiz_id")
        .notNull()
        .references(() => quizzes.id, { onDelete: "cascade" }),
    type: text("type", {
        enum: ["multiple_choice", "fill_in", "open", "placeholder"],
    }).notNull(),
    text: text("text").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
});

export const answerOptions = sqliteTable("answer_options", {
    id: text("id").primaryKey(),
    questionId: text("question_id")
        .notNull()
        .references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
});

export const acceptedAnswers = sqliteTable("accepted_answers", {
    id: text("id").primaryKey(),
    questionId: text("question_id")
        .notNull()
        .references(() => questions.id, { onDelete: "cascade" }),
    pattern: text("pattern").notNull(),
    matchType: text("match_type", {
        enum: ["exact", "contains", "any"],
    })
        .notNull()
        .default("exact"),
    caseInsensitive: integer("case_insensitive", { mode: "boolean" })
        .notNull()
        .default(true),
    sortOrder: integer("sort_order").notNull().default(0),
});

export const tags = sqliteTable("tags", {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    slug: text("slug").notNull().unique(),
});

export const quizTags = sqliteTable("quiz_tags", {
    quizId: text("quiz_id")
        .notNull()
        .references(() => quizzes.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
        .notNull()
        .references(() => tags.id, { onDelete: "cascade" }),
});
