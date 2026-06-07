import { onMount } from "solid-js";
import { SampleQuizRoom } from "~/components/sample-quiz-room";
import type { QuizFixtureId } from "~/game/quiz/fixtures";
import { getQuizFixture } from "~/game/quiz/fixtures";
import type {
    QuizClientOutgoing,
    QuizSideEvent,
    QuizPlayerView,
} from "~/game/quiz/connection";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type { Player } from "~/game";
import { parsePlayerId } from "~/game";

interface QuizFixtureHarnessProps {
    fixtureId: QuizFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState {
    fixtureId: QuizFixtureId;
    playerId: string;
    sentMessages: QuizClientOutgoing[];
    hostActions: string[];
}

declare global {
    interface Window {
        __QUIZ_FIXTURE__?: FixtureWindowState;
    }
}

export function QuizFixtureHarness(props: QuizFixtureHarnessProps) {
    const fixture = getQuizFixture(props.fixtureId);
    const fixtureState: FixtureWindowState = {
        fixtureId: props.fixtureId,
        playerId: props.playerId,
        sentMessages: [],
        hostActions: [],
    };

    const connection = createFakeGameConnection<
        QuizPlayerView,
        QuizClientOutgoing,
        QuizSideEvent
    >({
        initialView: null,
        onSend: (message) => {
            fixtureState.sentMessages.push(message);
            window.__QUIZ_FIXTURE__ = fixtureState;

            if (message.type === "answer" && fixture.id === "answered") {
                const mockPlayers: Player[] = [
                    { id: parsePlayerId("p1"), name: "Alice" },
                    { id: parsePlayerId("p2"), name: "Bob" },
                    { id: parsePlayerId("p3"), name: "Cara" },
                ];
                connection.emit({
                    type: "player_answered",
                    data: {
                        players: mockPlayers,
                        answers: {
                            p1: "a",
                            p2: "b",
                            p3: "a",
                        },
                    },
                });
            }
        },
    });

    const isHost = fixture.hostPlayerId === props.playerId;

    onMount(() => {
        window.__QUIZ_FIXTURE__ = fixtureState;
    });

    return (
        <SampleQuizRoom
            roomId={fixture.roomId}
            playerId={props.playerId}
            isHost={isHost}
            connection={connection}
        />
    );
}
