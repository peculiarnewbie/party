import { QuizFixtureHarness } from "~/components/quiz/quiz-fixture-harness";
import type { GameFixtureModule } from "~/game/fixture-module";

export const QUIZ_FIXTURE_IDS = [
    "default",
    "answered",
] as const;

export type QuizFixtureId = (typeof QUIZ_FIXTURE_IDS)[number];

export interface QuizFixture {
    id: QuizFixtureId;
    roomId: string;
    title: string;
    hostPlayerId: string;
    primaryPlayerId: string;
    description: string;
}

const QUIZ_FIXTURES: Record<QuizFixtureId, QuizFixture> = {
    default: {
        id: "default",
        roomId: "fixture-quiz-default",
        title: "Quiz",
        hostPlayerId: "p1",
        primaryPlayerId: "p2",
        description: "Guest player sees answer buttons and can submit an answer.",
    },
    answered: {
        id: "answered",
        roomId: "fixture-quiz-answered",
        title: "Quiz",
        hostPlayerId: "p1",
        primaryPlayerId: "p1",
        description: "Host view showing player answers after submission.",
    },
};

const FIXTURE_PLAYER_IDS = ["p1", "p2", "p3"] as const;

export function getQuizFixture(fixtureId: QuizFixtureId) {
    return QUIZ_FIXTURES[fixtureId];
}

export function getDefaultFixturePlayerId(fixtureId: QuizFixtureId) {
    return QUIZ_FIXTURES[fixtureId].primaryPlayerId;
}

export function getFixturePlayerIds(): string[] {
    return [...FIXTURE_PLAYER_IDS];
}

export const gameFixtureModule: GameFixtureModule<QuizFixtureId> = {
    game: "quiz",
    title: "Quiz",
    fixtures: QUIZ_FIXTURES,
    defaultFixtureId: "default",
    playerIds: FIXTURE_PLAYER_IDS,
    Harness: QuizFixtureHarness,
};
