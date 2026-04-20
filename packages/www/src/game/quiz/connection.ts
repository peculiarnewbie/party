import type { Player } from "~/game";
import type { GameConnection } from "../connection";

export type QuizPlayerView = null;

export type QuizClientOutgoing = {
    type: "answer";
    data: { answer: string };
};

export type QuizSideEvent = {
    type: "player_answered";
    data: {
        players: Player[];
        answers: Record<string, string>;
    };
};

export type QuizConnection = GameConnection<
    QuizPlayerView,
    QuizClientOutgoing,
    QuizSideEvent
>;
