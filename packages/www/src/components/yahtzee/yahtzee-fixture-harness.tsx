import { onMount } from "solid-js";
import { YahtzeeRoom } from "~/components/yahtzee/yahtzee-room";
import { buildFixtureTranscript } from "~/game/yahtzee/fixture-transcripts";
import type { YahtzeeFixtureEnvelope } from "~/game/yahtzee/fixture-transcripts";
import type { YahtzeeFixtureId } from "~/game/yahtzee/fixtures";
import {
    FakeFixtureWebSocket,
    type FakeFixtureWebSocketState,
} from "~/test/fake-fixture-websocket";

interface YahtzeeFixtureHarnessProps {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState extends FakeFixtureWebSocketState<YahtzeeFixtureEnvelope> {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
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
    const initialMessages = transcript.initialMessages.slice(0, initialMessageCount);
    const fixtureState: FixtureWindowState = {
        fixtureId: props.fixtureId,
        playerId: props.playerId,
        sentMessages: [],
        deliveredMessages: [],
        hostActions: [],
    };
    const socket = new FakeFixtureWebSocket<YahtzeeFixtureEnvelope>({
        initialMessages,
        afterSend: transcript.afterSend,
        state: fixtureState,
        onStateChange: () => {
            window.__YAHTZEE_FIXTURE__ = fixtureState;
        },
    });
    const isHost = transcript.hostPlayerId === props.playerId;

    onMount(() => {
        window.__YAHTZEE_FIXTURE__ = fixtureState;
        queueMicrotask(() => socket.start());
    });

    return (
        <YahtzeeRoom
            roomId={transcript.roomId}
            playerId={props.playerId}
            isHost={isHost}
            ws={socket as unknown as WebSocket}
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
