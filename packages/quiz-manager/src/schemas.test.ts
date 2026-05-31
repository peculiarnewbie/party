import { describe, it, expect } from "vitest";
import { Schema } from "effect";
import {
    QuestionType,
    MatchType,
    AnswerOption,
    AcceptedAnswer,
    Question,
    QuizSummary,
    QuizWithQuestions,
    TagWithCount,
} from "./schemas";

describe("QuestionType", () => {
    it("accepts valid question types", () => {
        expect(Schema.decodeUnknownSync(QuestionType)("multiple_choice")).toBe("multiple_choice");
        expect(Schema.decodeUnknownSync(QuestionType)("fill_in")).toBe("fill_in");
        expect(Schema.decodeUnknownSync(QuestionType)("open")).toBe("open");
        expect(Schema.decodeUnknownSync(QuestionType)("placeholder")).toBe("placeholder");
    });

    it("rejects invalid question types", () => {
        expect(() => Schema.decodeUnknownSync(QuestionType)("invalid")).toThrow();
    });
});

describe("MatchType", () => {
    it("accepts valid match types", () => {
        expect(Schema.decodeUnknownSync(MatchType)("exact")).toBe("exact");
        expect(Schema.decodeUnknownSync(MatchType)("contains")).toBe("contains");
        expect(Schema.decodeUnknownSync(MatchType)("any")).toBe("any");
    });

    it("rejects invalid match types", () => {
        expect(() => Schema.decodeUnknownSync(MatchType)("fuzzy")).toThrow();
    });
});

describe("AnswerOption", () => {
    const valid = {
        id: "opt-1",
        questionId: "q-1",
        text: "Paris",
        isCorrect: true,
        sortOrder: 0,
    };

    it("decodes a valid answer option", () => {
        const result = Schema.decodeUnknownSync(AnswerOption)(valid);
        expect(result.id).toBe("opt-1");
        expect(result.isCorrect).toBe(true);
    });

    it("rejects missing fields", () => {
        expect(() => Schema.decodeUnknownSync(AnswerOption)({ id: "opt-1" })).toThrow();
    });

    it("rejects wrong types", () => {
        expect(() => Schema.decodeUnknownSync(AnswerOption)({ ...valid, isCorrect: "yes" })).toThrow();
    });
});

describe("AcceptedAnswer", () => {
    const valid = {
        id: "aa-1",
        questionId: "q-1",
        pattern: "paris",
        matchType: "exact",
        caseInsensitive: true,
        sortOrder: 0,
    };

    it("decodes a valid accepted answer", () => {
        const result = Schema.decodeUnknownSync(AcceptedAnswer)(valid);
        expect(result.matchType).toBe("exact");
        expect(result.caseInsensitive).toBe(true);
    });

    it("rejects invalid matchType", () => {
        expect(() => Schema.decodeUnknownSync(AcceptedAnswer)({ ...valid, matchType: "fuzzy" })).toThrow();
    });
});

describe("Question", () => {
    const valid = {
        id: "q-1",
        quizId: "quiz-1",
        type: "multiple_choice",
        text: "What is the capital of France?",
        sortOrder: 0,
        options: [
            { id: "o-1", questionId: "q-1", text: "Paris", isCorrect: true, sortOrder: 0 },
            { id: "o-2", questionId: "q-1", text: "London", isCorrect: false, sortOrder: 1 },
        ],
        acceptedAnswers: [],
    };

    it("decodes a valid question with options", () => {
        const result = Schema.decodeUnknownSync(Question)(valid);
        expect(result.type).toBe("multiple_choice");
        expect(result.options).toHaveLength(2);
    });

    it("decodes a fill-in question with accepted answers", () => {
        const fillIn = {
            ...valid,
            type: "fill_in",
            options: [],
            acceptedAnswers: [
                { id: "aa-1", questionId: "q-1", pattern: "paris", matchType: "exact", caseInsensitive: true, sortOrder: 0 },
            ],
        };
        const result = Schema.decodeUnknownSync(Question)(fillIn);
        expect(result.acceptedAnswers).toHaveLength(1);
    });

    it("rejects invalid question type", () => {
        expect(() => Schema.decodeUnknownSync(Question)({ ...valid, type: "bogus" })).toThrow();
    });
});

describe("QuizSummary", () => {
    const valid = {
        id: "quiz-1",
        title: "Geography",
        description: "Test your geography knowledge",
        questionCount: 5,
        tags: [{ name: "Education", slug: "education" }],
        typeBreakdown: { multipleChoice: 3, fillIn: 1, open: 1, placeholder: 0 },
    };

    it("decodes a valid quiz summary", () => {
        const result = Schema.decodeUnknownSync(QuizSummary)(valid);
        expect(result.title).toBe("Geography");
        expect(result.tags).toHaveLength(1);
    });

    it("allows null description", () => {
        const result = Schema.decodeUnknownSync(QuizSummary)({ ...valid, description: null });
        expect(result.description).toBeNull();
    });

    it("rejects missing typeBreakdown", () => {
        const { typeBreakdown, ...noBreakdown } = valid;
        expect(() => Schema.decodeUnknownSync(QuizSummary)(noBreakdown)).toThrow();
    });
});

describe("QuizWithQuestions", () => {
    const valid = {
        id: "quiz-1",
        title: "Geography",
        description: null,
        questions: [
            {
                id: "q-1",
                quizId: "quiz-1",
                type: "open",
                text: "Name a country",
                sortOrder: 0,
                options: [],
                acceptedAnswers: [],
            },
        ],
    };

    it("decodes a quiz with nested questions", () => {
        const result = Schema.decodeUnknownSync(QuizWithQuestions)(valid);
        expect(result.questions).toHaveLength(1);
        expect(result.questions[0].type).toBe("open");
    });

    it("decodes with empty questions array", () => {
        const result = Schema.decodeUnknownSync(QuizWithQuestions)({ ...valid, questions: [] });
        expect(result.questions).toHaveLength(0);
    });
});

describe("TagWithCount", () => {
    it("decodes a valid tag", () => {
        const result = Schema.decodeUnknownSync(TagWithCount)({
            id: "t-1",
            name: "Science",
            slug: "science",
            quizCount: 12,
        });
        expect(result.name).toBe("Science");
        expect(result.quizCount).toBe(12);
    });

    it("rejects missing quizCount", () => {
        expect(() =>
            Schema.decodeUnknownSync(TagWithCount)({ id: "t-1", name: "Science", slug: "science" }),
        ).toThrow();
    });
});
