import { onMount } from "solid-js";
import { YahtzeeRoom } from "~/components/yahtzee/yahtzee-room";
import { buildFixtureTranscript } from "~/game/yahtzee/fixture-transcripts";
import type { YahtzeeFixtureEnvelope } from "~/game/yahtzee/fixture-transcripts";
import type { YahtzeeFixtureId } from "~/game/yahtzee/fixtures";
import type {
    YahtzeeClientOutgoing,
    YahtzeeSideEvent,
} from "~/game/yahtzee/connection";
import type { YahtzeePlayerView } from "~/game/yahtzee/views";
import { createFakeGameConnection } from "~/test/fake-game-connection";

interface YahtzeeFixtureHarnessProps {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
    sentMessages: YahtzeeClientOutgoing[];
    hostActions: string[];
}

declare global {
    interface Window {
        __YAHTZEE_FIXTURE__?: FixtureWindowState;
    }
}

export function YahtzeeFixtureHarness(props: YahtzeeFixtureHarnessProps) {
    const transcript = buildFixtureTranscript(props.fixtureId, props.playerId);
    const initialMessageCount = props.step
        ? Math.max(0, Math.min(props.step, transcript.initialMessages.length))
        : transcript.initialMessages.length;
    const initialMessages = transcript.initialMessages.slice(
        0,
        initialMessageCount,
    );

    const fixtureState: FixtureWindowState = {
        fixtureId: props.fixtureId,
        playerId: props.playerId,
        sentMessages: [],
        hostActions: [],
    };

    const initialView = findInitialView(initialMessages);

    const connection = createFakeGameConnection<
        YahtzeePlayerView,
        YahtzeeClientOutgoing,
        YahtzeeSideEvent
    >({
        initialView,
        onSend: (message) => {
            fixtureState.sentMessages.push(message);
            window.__YAHTZEE_FIXTURE__ = fixtureState;

            const scripted = transcript.afterSend[message.type];
            if (scripted) {
                for (const envelope of scripted) {
                    applyEnvelope(connection, envelope);
                }
            }
        },
    });

    const isHost = transcript.hostPlayerId === props.playerId;

    onMount(() => {
        window.__YAHTZEE_FIXTURE__ = fixtureState;
        queueMicrotask(() => {
            for (const envelope of initialMessages) {
                applyEnvelope(connection, envelope);
            }
        });
    });

    return (
        <YahtzeeRoom
            roomId={transcript.roomId}
            playerId={props.playerId}
            isHost={isHost}
            connection={connection}
            title={transcript.title}
            onEndGame={() => {
                fixtureState.hostActions.push("end_game");
                window.__YAHTZEE_FIXTURE__ = fixtureState;
            }}
            onReturnToLobby={() => {
                fixtureState.hostActions.push("return_to_lobby");
                window.__YAHTZEE_FIXTURE__ = fixtureState;
            }}
            announcementDelayMs={0}
        />
    );
}

function findInitialView(
    messages: readonly YahtzeeFixtureEnvelope[],
): YahtzeePlayerView | null {
    for (const message of messages) {
        if (message.type === "yahtzee:state") {
            return message.data as YahtzeePlayerView;
        }
    }
    return null;
}

function applyEnvelope(
    connection: ReturnType<
        typeof createFakeGameConnection<
            YahtzeePlayerView,
            YahtzeeClientOutgoing,
            YahtzeeSideEvent
        >
    >,
    envelope: YahtzeeFixtureEnvelope,
) {
    if (envelope.type === "yahtzee:state") {
        connection.setView(envelope.data as YahtzeePlayerView);
        return;
    }
    connection.emit(envelope as YahtzeeSideEvent);
}
