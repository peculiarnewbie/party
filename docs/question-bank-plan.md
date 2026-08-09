# Question Bank Service — Architecture Plan

## Overview

A separate Cloudflare Worker (`packages/quiz-manager`) that serves as a **question bank CMS**. It:

- Stores quizzes, questions, tags in D1 via Drizzle ORM
- Exposes RPC methods (`getQuiz`, `listQuizzes`) for the party worker
- Serves a full admin frontend (SolidJS + TanStack Start) for managing content
- Uses Effect for service composition, error handling, and validation
- Is accessed by the party worker only at game setup time — no runtime dependency during play

The question bank is a **content library**, not a runtime service. When a host picks a quiz, the party worker downloads all questions upfront and stores them in the Durable Object. The game runs entirely from local state.

## Design Decisions

| Decision | Answer |
|----------|--------|
| Storage | Separate D1 database, Drizzle ORM, SQL-style queries |
| Effect depth | ServiceMap.Service + Layer, TaggedError, Schema |
| Auth | Password + HMAC session cookie (7-day expiry), Alchemy secret bindings |
| Admin UI | Full CRUD, server route handlers, matches party app styling (Bebas Neue, Karla) |
| Tags | Separate /tags page + inline autocomplete on quiz edit |
| Question reorder | Drag-to-reorder (dnd-kit) |
| Migrations | drizzle-kit generate |
| Tests | Unit only (answer matcher, schema validation) |
| RPC surface | `getQuiz(id)` + `listQuizzes(opts)` — full summary shape |
| Filtering | Server-side by tags/search. Game type compatibility validation is a future concern |
| Quiz picker | New component in party app, always fetches fresh list |
| Herd migration | Host must always pick from bank. Seed script for existing 162 questions |
| Quiz selection flow | Host picks game type → quiz picker appears → host picks quiz → start |
| Service failure | Retry 2-3 times with backoff, then fail with error |
| Domain | Default `quiz-manager.workers.dev` |

## Data Model

### Drizzle Schema

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const quizzes = sqliteTable("quizzes", {
  id: text("id").primaryKey(),           // nanoid
  title: text("title").notNull(),
  description: text("description"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["multiple_choice", "fill_in", "open", "placeholder"] }).notNull(),
  text: text("text").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const answerOptions = sqliteTable("answer_options", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  isCorrect: integer("is_correct", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const acceptedAnswers = sqliteTable("accepted_answers", {
  id: text("id").primaryKey(),
  questionId: text("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  pattern: text("pattern").notNull(),
  matchType: text("match_type", { enum: ["exact", "contains", "any"] }).notNull().default("exact"),
  caseInsensitive: integer("case_insensitive", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const tags = sqliteTable("tags", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

export const quizTags = sqliteTable("quiz_tags", {
  quizId: text("quiz_id").notNull().references(() => quizzes.id, { onDelete: "cascade" }),
  tagId: text("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});
```

### Question Types

| Type | answer_options | accepted_answers | Use Case |
|------|---------------|-----------------|----------|
| `multiple_choice` | Rows present, one `isCorrect = true` | None | Quiz game |
| `fill_in` | None | Rows with match rules | Quiz game |
| `open` | None | None | Herd, surveys |
| `placeholder` | Optional | None | Future games |

### Fill-in Answer Matching

The `accepted_answers` table defines flexible matching rules:

- `exact` — normalized input must equal pattern
- `contains` — normalized input must contain pattern
- `any` — any non-empty answer is accepted (wildcard)
- `caseInsensitive` flag applies lowercase + trim before matching

```typescript
// src/answer-matcher.ts
export function checkFillIn(userInput: string, rules: AcceptedAnswer[]): boolean {
  return rules.some((rule) => {
    const normalized = rule.caseInsensitive ? userInput.toLowerCase().trim() : userInput.trim();
    switch (rule.matchType) {
      case "exact": return normalized === rule.pattern;
      case "contains": return normalized.includes(rule.pattern);
      case "any": return normalized.length > 0;
    }
  });
}
```

## Effect Layer

### Schemas

```typescript
// src/schemas.ts
import { Schema } from "effect";

export const QuizId = Schema.String.pipe(Schema.brand("QuizId"));
export const QuestionId = Schema.String.pipe(Schema.brand("QuestionId"));
export const AnswerOptionId = Schema.String.pipe(Schema.brand("AnswerOptionId"));
export const AcceptedAnswerId = Schema.String.pipe(Schema.brand("AcceptedAnswerId"));

export const QuestionType = Schema.Literals(["multiple_choice", "fill_in", "open", "placeholder"]);
export const MatchType = Schema.Literals(["exact", "contains", "any"]);

export class AnswerOption extends Schema.Class("AnswerOption")({
  id: AnswerOptionId,
  questionId: QuestionId,
  text: Schema.String,
  isCorrect: Schema.Boolean,
  sortOrder: Schema.Number,
}) {}

export class AcceptedAnswer extends Schema.Class("AcceptedAnswer")({
  id: AcceptedAnswerId,
  questionId: QuestionId,
  pattern: Schema.String,
  matchType: MatchType,
  caseInsensitive: Schema.Boolean,
  sortOrder: Schema.Number,
}) {}

export class Question extends Schema.Class("Question")({
  id: QuestionId,
  quizId: QuizId,
  type: QuestionType,
  text: Schema.String,
  sortOrder: Schema.Number,
  options: Schema.Array(AnswerOption),
  acceptedAnswers: Schema.Array(AcceptedAnswer),
}) {}

export class QuizSummary extends Schema.Class("QuizSummary")({
  id: QuizId,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  questionCount: Schema.Number,
  tags: Schema.Array(Schema.Struct({ name: Schema.String, slug: Schema.String })),
  typeBreakdown: Schema.Struct({
    multipleChoice: Schema.Number,
    fillIn: Schema.Number,
    open: Schema.Number,
    placeholder: Schema.Number,
  }),
}) {}

export class QuizWithQuestions extends Schema.Class("QuizWithQuestions")({
  id: QuizId,
  title: Schema.String,
  description: Schema.NullOr(Schema.String),
  questions: Schema.Array(Question),
}) {}
```

### Errors

```typescript
// src/errors.ts
import { Schema } from "effect";

export class QuizNotFoundError extends Schema.TaggedErrorClass("QuizNotFoundError")(
  "QuizNotFoundError", { id: Schema.String }
) {}

export class QuestionNotFoundError extends Schema.TaggedErrorClass("QuestionNotFoundError")(
  "QuestionNotFoundError", { id: Schema.String }
) {}

export class DatabaseError extends Schema.TaggedErrorClass("DatabaseError")(
  "DatabaseError", { operation: Schema.String, cause: Schema.Defect }
) {}
```

### Service

```typescript
// src/services/quiz-db.ts
import { Effect, Layer, ServiceMap } from "effect";
import { drizzle } from "drizzle-orm/d1";
import { eq, asc, sql, and, inArray } from "drizzle-orm";
import * as schema from "../db/schema";

class QuizDb extends ServiceMap.Service<QuizDb, {
  readonly getQuiz: (id: string) => Effect.Effect<QuizWithQuestions | null, DatabaseError>;
  readonly listQuizzes: (opts?: { tags?: string[]; search?: string }) => Effect.Effect<QuizSummary[], DatabaseError>;
  readonly createQuiz: (data: { title: string; description?: string }) => Effect.Effect<string, DatabaseError>;
  readonly updateQuiz: (id: string, data: { title?: string; description?: string }) => Effect.Effect<void, DatabaseError | QuizNotFoundError>;
  readonly deleteQuiz: (id: string) => Effect.Effect<void, DatabaseError | QuizNotFoundError>;
  readonly createQuestion: (quizId: string, data: QuestionInput) => Effect.Effect<string, DatabaseError>;
  readonly updateQuestion: (id: string, data: QuestionInput) => Effect.Effect<void, DatabaseError | QuestionNotFoundError>;
  readonly deleteQuestion: (id: string) => Effect.Effect<void, DatabaseError | QuestionNotFoundError>;
  readonly reorderQuestions: (quizId: string, orderedIds: string[]) => Effect.Effect<void, DatabaseError>;
  readonly listTags: () => Effect.Effect<TagWithCount[], DatabaseError>;
  readonly createTag: (name: string) => Effect.Effect<string, DatabaseError>;
  readonly deleteTag: (id: string) => Effect.Effect<void, DatabaseError>;
}>("@app/QuizDb") {
  static readonly layer = (d1: D1Database) => Layer.sync(QuizDb, () => {
    const db = drizzle(d1, { schema });

    const wrapDb = <A>(op: string, fn: () => Promise<A>) =>
      Effect.tryPromise({ try: fn, catch: (cause) => new DatabaseError({ operation: op, cause }) });

    // Implementation of all methods using db.select(), db.insert(), etc.
    // ...
  });
}
```

### Runtime

Same pattern as the party app:

```typescript
// src/effect/runtime.ts
export function runObservedPromiseExit<A, E>(program, operation, context) { ... }
export function runObservedSync<A, E>(program, operation, context) { ... }
```

## RPC Interface

```typescript
// src/worker/rpc.ts
import { WorkerEntrypoint } from "cloudflare:workers";
import { Effect } from "effect";
import { QuizDb } from "../services/quiz-db";

export class QuizManager extends WorkerEntrypoint<Env> {
  private run<A, E>(effect: Effect.Effect<A, E>): Promise<A> {
    return Effect.runPromise(effect.pipe(
      Effect.catchTag("DatabaseError", (e) => Effect.die(e)),
    ));
  }

  async getQuiz(id: string): Promise<QuizWithQuestions | null> {
    const svc = QuizDb.layer(this.env.DB);
    const program = Effect.gen(function* () {
      const db = yield* QuizDb;
      return yield* db.getQuiz(id);
    }).pipe(Effect.provide(svc));
    return this.run(program);
  }

  async listQuizzes(opts?: { tags?: string[]; search?: string }): Promise<QuizSummary[]> {
    const svc = QuizDb.layer(this.env.DB);
    const program = Effect.gen(function* () {
      const db = yield* QuizDb;
      return yield* db.listQuizzes(opts);
    }).pipe(Effect.provide(svc));
    return this.run(program);
  }
}
```

## Worker Entry

```typescript
// src/worker/index.ts
import handler from "@tanstack/solid-start/server-entry";
import { QuizManager } from "./rpc";

export default {
  async fetch(request, env, ctx) {
    return handler.fetch(request, env, ctx);
  },
} as ExportedHandler<Env>;
export { QuizManager };
```

## Admin UI

### Routes

| Route | Purpose |
|-------|---------|
| `/login` | Password form, set HMAC session cookie |
| `/` | Dashboard — quiz list with tag/type breakdowns |
| `/quiz/new` | Create quiz (title, description) |
| `/quiz/$quizId` | Edit quiz — questions list with drag-to-reorder |
| `/quiz/$quizId/question/new` | Add question (type-specific form) |
| `/quiz/$quizId/question/$questionId` | Edit question |
| `/tags` | Tag management (create, rename, delete) |

### Server Handler Pattern

Matches the party app's pattern:

```typescript
export const Route = createFileRoute("/quiz/$quizId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        // Load quiz via Effect service, return data
      },
      POST: async ({ request, params }) => {
        // Update quiz via Effect service
      },
    },
  },
});
```

### Components

- **Question form** — adapts based on question type:
  - `multiple_choice` → text input + dynamic option list (mark correct one)
  - `fill_in` → text input + dynamic accepted answer list (pattern + match type)
  - `open` → text input only
  - `placeholder` → text input only
- **Tag input** — autocomplete from existing tags, inline create new
- **Sortable questions** — drag-to-reorder using @dnd-kit/solid

### Auth

- Password validated against the `ADMIN_PASSWORD` secret binding
- Session cookie: HMAC-signed with the `SESSION_SECRET` secret binding, 7-day expiry
- `httpOnly`, `secure`, `sameSite: strict`
- Middleware check on all non-login routes

## Alchemy Configuration

```typescript
// packages/quiz-manager/alchemy.run.ts
const db = yield* Cloudflare.D1.Database("DB", {
  name: isProduction ? "quiz-manager" : undefined,
  migrationsDir: "./drizzle",
});

const app = yield* Cloudflare.Website.Vite("QuizManagerApp", {
  name: isProduction ? "quiz-manager" : undefined,
  main: "./src/worker/index.ts",
  env: {
    DB: db,
    ADMIN_PASSWORD: Config.redacted("ADMIN_PASSWORD"),
    SESSION_SECRET: Config.redacted("SESSION_SECRET"),
  },
});
```

Secrets are supplied to the deploy environment and uploaded as redacted Worker bindings:

```bash
pnpm --filter quiz-manager deploy
```

## Party App Integration

### GAME_RULES Change

```typescript
// src/game/index.ts
export const GAME_RULES: Record<GameType, {
  label: string;
  minPlayers: number;
  maxPlayers: number | null;
  requiresQuestions?: boolean;
}> = {
  quiz: { label: "Quiz", minPlayers: 2, maxPlayers: null, requiresQuestions: true },
  herd: { label: "Herd", minPlayers: 3, maxPlayers: null, requiresQuestions: true },
  // ... others don't have requiresQuestions
};
```

### Service Binding

Party's `alchemy.run.ts`:
```typescript
env: {
  QUIZ_MANAGER: quizManager,
}
```

Party's `src/env.d.ts`:
```typescript
QUIZ_MANAGER: Service<import("../quiz-manager/src/worker/rpc").QuizManager>;
```

### Quiz Picker Component

New `src/components/quiz-picker.tsx`:
- Shown in room lobby when selected game has `requiresQuestions: true`
- Calls party worker server route that proxies to `env.QUIZ_MANAGER.listQuizzes()`
- Displays quiz cards: title, tags, question count, type breakdown
- Host clicks a quiz to select it, then clicks Start

### Game Start Flow

In `ws.ts` when host sends "start" and game requires questions:

```typescript
const quiz = await retryWithBackoff(
  () => this.env.QUIZ_MANAGER.getQuiz(quizId),
  { retries: 3, backoff: "exponential" },
);
if (!quiz) {
  sendError("Could not load quiz. Please try again.");
  return;
}
this.state.downloadedQuestions = quiz.questions;
// proceed with game init
```

### Herd Migration

- Remove hardcoded `QUESTION_BANK` from `src/game/herd/questions.ts`
- Herd engine reads questions from `state.downloadedQuestions` instead
- Seed script creates a "Herd Questions" quiz with all 162 existing questions as `open` type

## Package Structure

```
packages/quiz-manager/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── alchemy.run.ts
├── drizzle.config.ts
├── drizzle/
│   └── 0000_init.sql
├── scripts/
│   └── seed-herd.ts
├── public/
├── src/
│   ├── db/
│   │   └── schema.ts
│   ├── services/
│   │   └── quiz-db.ts
│   ├── schemas.ts
│   ├── errors.ts
│   ├── env.d.ts
│   ├── answer-matcher.ts
│   ├── effect/
│   │   ├── runtime.ts
│   │   └── logger.ts
│   ├── worker/
│   │   ├── index.ts
│   │   ├── rpc.ts
│   │   └── session.ts
│   ├── components/
│   │   ├── question-form.tsx
│   │   ├── answer-option-editor.tsx
│   │   ├── tag-input.tsx
│   │   └── sortable-questions.tsx
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── login.tsx
│   │   ├── index.tsx
│   │   ├── tags.tsx
│   │   └── quiz/
│   │       ├── $quizId/
│   │       │   ├── index.tsx
│   │       │   └── question/
│   │       │       ├── new.tsx
│   │       │       └── $questionId.tsx
│   │       └── new.tsx
│   ├── router.tsx
│   ├── routeTree.gen.ts
│   └── styles/
│       └── app.css
```

## Dependencies

```json
{
  "dependencies": {
    "@tanstack/solid-router": "^1.141.8",
    "@tanstack/solid-start": "^1.142.5",
    "drizzle-orm": "^0.38.0",
    "effect": "4.0.0-beta.50",
    "nanoid": "^5.1.6",
    "solid-js": "^1.9.10",
    "@dnd-kit/solid": "^0.0.1"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "5.20260809.1",
    "@tailwindcss/vite": "^4.1.18",
    "drizzle-kit": "^0.31.0",
    "tailwindcss": "^4.1.18",
    "typescript": "^5.7.2",
    "alchemy": "2.0.0-beta.70",
    "vite": "^8.0.7",
    "vite-plugin-solid": "^2.11.10"
  }
}
```

## Implementation Order

1. **Package scaffolding** — `packages/quiz-manager/` with package.json, tsconfig, vite.config, alchemy.run.ts, src/env.d.ts
2. **Drizzle schema + migrations** — schema.ts, drizzle.config.ts, generate initial migration, declare D1 through Alchemy
3. **Effect foundation** — schemas.ts, errors.ts, effect/runtime.ts, effect/logger.ts
4. **QuizDb service** — services/quiz-db.ts with all Drizzle queries wrapped in Effect
5. **Answer matcher** — answer-matcher.ts (pure logic for fill-in matching)
6. **RPC** — worker/rpc.ts (QuizManager WorkerEntrypoint), worker/index.ts
7. **Auth** — worker/session.ts (password validation, HMAC cookie), login route
8. **Admin routes** — Dashboard, quiz CRUD, question CRUD, tag management
9. **Admin components** — Question form (type-adaptive), tag input with autocomplete, sortable questions
10. **Seed script** — scripts/seed-herd.ts (162 questions as open type, in a "Herd Questions" quiz)
11. **Deploy** — Create D1, apply secrets, deploy worker
12. **Party app integration** — Service binding, GAME_RULES change, quiz picker component, game start flow with retry
13. **Herd migration** — Remove hardcoded QUESTION_BANK, read from downloaded questions
14. **Unit tests** — answer-matcher, schema validation

## RPC Return Shapes

### getQuiz(id)

```typescript
{
  id: "abc123",
  title: "General Knowledge",
  description: "A mix of everything",
  questions: [
    {
      id: "q1",
      quizId: "abc123",
      type: "multiple_choice",
      text: "What is the capital of France?",
      sortOrder: 0,
      options: [
        { id: "o1", questionId: "q1", text: "Paris", isCorrect: true, sortOrder: 0 },
        { id: "o2", questionId: "q1", text: "London", isCorrect: false, sortOrder: 1 },
        { id: "o3", questionId: "q1", text: "Berlin", isCorrect: false, sortOrder: 2 },
        { id: "o4", questionId: "q1", text: "Madrid", isCorrect: false, sortOrder: 3 }
      ],
      acceptedAnswers: []
    },
    {
      id: "q2",
      quizId: "abc123",
      type: "fill_in",
      text: "Name the largest ocean on Earth",
      sortOrder: 1,
      options: [],
      acceptedAnswers: [
        { id: "a1", questionId: "q2", pattern: "pacific", matchType: "exact", caseInsensitive: true, sortOrder: 0 },
        { id: "a2", questionId: "q2", pattern: "pacific ocean", matchType: "contains", caseInsensitive: true, sortOrder: 1 }
      ]
    },
    {
      id: "q3",
      quizId: "abc123",
      type: "open",
      text: "Name something you would find in a kitchen",
      sortOrder: 2,
      options: [],
      acceptedAnswers: []
    }
  ]
}
```

### listQuizzes(opts?)

```typescript
[
  {
    id: "abc123",
    title: "General Knowledge",
    description: "A mix of everything",
    questionCount: 25,
    tags: [
      { name: "Trivia", slug: "trivia" },
      { name: "Mixed", slug: "mixed" }
    ],
    typeBreakdown: {
      multipleChoice: 15,
      fillIn: 5,
      open: 5,
      placeholder: 0
    }
  },
  {
    id: "def456",
    title: "Herd Questions",
    description: "Survey-style questions for Herd game",
    questionCount: 162,
    tags: [{ name: "Survey", slug: "survey" }],
    typeBreakdown: {
      multipleChoice: 0,
      fillIn: 0,
      open: 162,
      placeholder: 0
    }
  }
]
```
