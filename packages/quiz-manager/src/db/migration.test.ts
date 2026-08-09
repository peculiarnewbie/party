import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

import { describe, expect, it } from "vitest";

const migrationsUrl = new URL("../../drizzle/", import.meta.url);
const migrationFilenames = readdirSync(migrationsUrl)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();
const migrations = migrationFilenames.map((filename) =>
    readFileSync(new URL(filename, migrationsUrl), "utf8").replaceAll(
        "--> statement-breakpoint",
        "",
    ),
);
const migrationJournal = readFileSync(
    new URL("meta/_journal.json", migrationsUrl),
    "utf8",
);

function withMigratedDatabase(run: (database: DatabaseSync) => void) {
    const database = new DatabaseSync(":memory:");
    try {
        database.exec("PRAGMA foreign_keys = ON");
        for (const migration of migrations) {
            database.exec(migration);
        }
        run(database);
    } finally {
        database.close();
    }
}

function seedQuizGraph(database: DatabaseSync) {
    database.exec(`
        INSERT INTO quizzes (id, title, created_at, updated_at)
        VALUES ('quiz-1', 'Trivia', '2026-01-01', '2026-01-01');
        INSERT INTO questions (id, quiz_id, type, text)
        VALUES ('question-1', 'quiz-1', 'multiple_choice', 'Question?');
        INSERT INTO answer_options (id, question_id, text)
        VALUES ('option-1', 'question-1', 'Answer');
        INSERT INTO accepted_answers (id, question_id, pattern)
        VALUES ('accepted-1', 'question-1', 'answer');
        INSERT INTO tags (id, name, slug)
        VALUES ('tag-1', 'General', 'general');
        INSERT INTO quiz_tags (quiz_id, tag_id)
        VALUES ('quiz-1', 'tag-1');
    `);
}

describe("quiz database migration", () => {
    it("registers every SQL migration in the Drizzle journal", () => {
        expect(migrationJournal.match(/"tag":/g)?.length ?? 0).toBe(
            migrationFilenames.length,
        );
        for (const filename of migrationFilenames) {
            expect(migrationJournal).toContain(
                `"tag": "${filename.slice(0, -".sql".length)}"`,
            );
        }
    });

    it("applies every migration and creates the complete schema", () => {
        withMigratedDatabase((database) => {
            expect(
                database
                    .prepare(
                        `
                            SELECT name
                            FROM sqlite_schema
                            WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
                            ORDER BY name
                        `,
                    )
                    .all(),
            ).toEqual([
                { name: "accepted_answers" },
                { name: "answer_options" },
                { name: "questions" },
                { name: "quiz_tags" },
                { name: "quizzes" },
                { name: "tags" },
            ]);
            expect(
                database
                    .prepare(
                        `
                            SELECT name
                            FROM sqlite_schema
                            WHERE type = 'index' AND sql IS NOT NULL
                            ORDER BY name
                        `,
                    )
                    .all(),
            ).toEqual([
                { name: "accepted_answers_question_sort_idx" },
                { name: "answer_options_question_sort_idx" },
                { name: "questions_quiz_sort_idx" },
                { name: "quiz_tags_quiz_id_idx" },
                { name: "quiz_tags_tag_id_idx" },
                { name: "quizzes_created_at_idx" },
                { name: "tags_name_unique" },
                { name: "tags_slug_unique" },
            ]);
        });
    });

    it("uses covering indexes for ordered child lookups", () => {
        withMigratedDatabase((database) => {
            expect(
                database
                    .prepare(
                        `
                            EXPLAIN QUERY PLAN
                            SELECT * FROM questions
                            WHERE quiz_id = 'quiz-1'
                            ORDER BY sort_order
                        `,
                    )
                    .get(),
            ).toEqual(
                expect.objectContaining({
                    detail: expect.stringContaining(
                        "USING INDEX questions_quiz_sort_idx",
                    ),
                }),
            );
            expect(
                database
                    .prepare(
                        `
                            EXPLAIN QUERY PLAN
                            SELECT * FROM answer_options
                            WHERE question_id = 'question-1'
                            ORDER BY sort_order
                        `,
                    )
                    .get(),
            ).toEqual(
                expect.objectContaining({
                    detail: expect.stringContaining(
                        "USING INDEX answer_options_question_sort_idx",
                    ),
                }),
            );
            expect(
                database
                    .prepare(
                        `
                            EXPLAIN QUERY PLAN
                            SELECT * FROM accepted_answers
                            WHERE question_id = 'question-1'
                            ORDER BY sort_order
                        `,
                    )
                    .get(),
            ).toEqual(
                expect.objectContaining({
                    detail: expect.stringContaining(
                        "USING INDEX accepted_answers_question_sort_idx",
                    ),
                }),
            );
        });
    });

    it("upgrades a populated initial schema without changing data", () => {
        const database = new DatabaseSync(":memory:");
        try {
            database.exec("PRAGMA foreign_keys = ON");
            database.exec(migrations[0]);
            seedQuizGraph(database);
            for (const migration of migrations.slice(1)) {
                database.exec(migration);
            }

            expect(
                database
                    .prepare(
                        `
                            SELECT q.title, question.text, option.text AS answer
                            FROM quizzes q
                            JOIN questions question ON question.quiz_id = q.id
                            JOIN answer_options option
                                ON option.question_id = question.id
                        `,
                    )
                    .get(),
            ).toEqual({
                title: "Trivia",
                text: "Question?",
                answer: "Answer",
            });
            expect(database.prepare("PRAGMA foreign_key_check").all()).toEqual(
                [],
            );
        } finally {
            database.close();
        }
    });

    it("applies database defaults for newly inserted answer data", () => {
        withMigratedDatabase((database) => {
            seedQuizGraph(database);

            expect(
                database
                    .prepare(
                        `
                            SELECT sort_order
                            FROM questions
                            WHERE id = 'question-1'
                        `,
                    )
                    .get(),
            ).toEqual({ sort_order: 0 });
            expect(
                database
                    .prepare(
                        `
                            SELECT is_correct, sort_order
                            FROM answer_options
                            WHERE id = 'option-1'
                        `,
                    )
                    .get(),
            ).toEqual({ is_correct: 0, sort_order: 0 });
            expect(
                database
                    .prepare(
                        `
                            SELECT match_type, case_insensitive, sort_order
                            FROM accepted_answers
                            WHERE id = 'accepted-1'
                        `,
                    )
                    .get(),
            ).toEqual({
                match_type: "exact",
                case_insensitive: 1,
                sort_order: 0,
            });
        });
    });

    it("enforces foreign keys and unique tag identities", () => {
        withMigratedDatabase((database) => {
            seedQuizGraph(database);

            expect(() =>
                database
                    .prepare(
                        `
                            INSERT INTO questions (id, quiz_id, type, text)
                            VALUES (?, ?, ?, ?)
                        `,
                    )
                    .run(
                        "orphan-question",
                        "missing-quiz",
                        "open",
                        "Question?",
                    ),
            ).toThrow(/FOREIGN KEY constraint failed/);
            expect(() =>
                database
                    .prepare(
                        "INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)",
                    )
                    .run("tag-2", "General", "other-slug"),
            ).toThrow(/UNIQUE constraint failed: tags.name/);
            expect(() =>
                database
                    .prepare(
                        "INSERT INTO tags (id, name, slug) VALUES (?, ?, ?)",
                    )
                    .run("tag-3", "Other", "general"),
            ).toThrow(/UNIQUE constraint failed: tags.slug/);
        });
    });

    it("cascades quiz deletion through the complete question graph", () => {
        withMigratedDatabase((database) => {
            seedQuizGraph(database);
            database.exec("DELETE FROM quizzes WHERE id = 'quiz-1'");

            for (const table of [
                "quizzes",
                "questions",
                "answer_options",
                "accepted_answers",
                "quiz_tags",
            ]) {
                expect(
                    database
                        .prepare(`SELECT COUNT(*) AS count FROM ${table}`)
                        .get(),
                ).toEqual({ count: 0 });
            }
            expect(
                database.prepare("SELECT COUNT(*) AS count FROM tags").get(),
            ).toEqual({ count: 1 });
        });
    });
});
