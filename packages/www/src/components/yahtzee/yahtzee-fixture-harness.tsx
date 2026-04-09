import { onMount } from "solid-js";
import { YahtzeeRoom } from "~/components/yahtzee/yahtzee-room";
import { buildFixtureTranscript } from "~/game/yahtzee/fixture-transcripts";
import type { YahtzeeFixtureEnvelope } from "~/game/yahtzee/fixture-transcripts";
import type { YahtzeeFixtureId } from "~/game/yahtzee/fixtures";

interface YahtzeeFixtureHarnessProps {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
    sentMessages: unknown[];
    deliveredMessages: YahtzeeFixtureEnvelope[];
    hostActions: string[];
}

declare global {
    interface Window {
        __YAHTZEE_FIXTURE__?: FixtureWindowState;
    }
}

type MessageHandler = (event: { data: string }) => void;

class FakeFixtureWebSocket {
    private readonly listeners = new Set<MessageHandler>();
    private readonly state: FixtureWindowState;

    constructor(
        private readonly initialMessages: YahtzeeFixtureEnvelope[],
        private readonly afterSend: Partial<Record<string, YahtzeeFixtureEnvelope[]>>,
        state: FixtureWindowState,
    ) {
        this.state = state;
    }

    addEventListener(type: string, handler: MessageHandler) {
        if (type !== "message") return;
        this.listeners.add(handler);
    }

    removeEventListener(type: string, handler: MessageHandler) {
        if (type !== "message") return;
        this.listeners.delete(handler);
    }

    send(rawMessage: string) {
        let parsedMessage: unknown = rawMessage;
        try {
            parsedMessage = JSON.parse(rawMessage);
        } catch {
            parsedMessage = rawMessage;
        }

        this.state.sentMessages.push(parsedMessage);
        window.__YAHTZEE_FIXTURE__ = this.state;

        const messageType =
            typeof parsedMessage === "object" &&
            parsedMessage !== null &&
            "type" in parsedMessage &&
            typeof parsedMessage.type === "string"
                ? parsedMessage.type
                : null;

        if (!messageType) return;

        const nextMessages = this.afterSend[messageType] ?? [];
        for (const message of nextMessages) {
            this.emit(message);
        }
    }

    start() {
        for (const message of this.initialMessages) {
            this.emit(message);
        }
    }

    private emit(message: YahtzeeFixtureEnvelope) {
        this.state.deliveredMessages.push(message);
        window.__YAHTZEE_FIXTURE__ = this.state;

        const event = { data: JSON.stringify(message) };
        for (const listener of this.listeners) {
            listener(event);
        }
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
    const socket = new FakeFixtureWebSocket(
        initialMessages,
        transcript.afterSend,
        fixtureState,
    );
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
