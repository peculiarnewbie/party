import { onMount } from "solid-js";
import { PokerRoom } from "~/components/poker/poker-room";
import type { PokerServerMessage } from "~/game/poker";
import type { PokerFixtureId } from "~/game/poker/fixtures";
import { getPokerFixture } from "~/game/poker/fixtures";
import {
    FakeFixtureWebSocket,
    type FakeFixtureWebSocketState,
} from "~/test/fake-fixture-websocket";

interface PokerFixtureHarnessProps {
    fixtureId: PokerFixtureId;
    playerId: string;
}

interface FixtureWindowState extends FakeFixtureWebSocketState<PokerServerMessage> {
    fixtureId: PokerFixtureId;
    playerId: string;
    hostActions: string[];
}

declare global {
    interface Window {
        __POKER_FIXTURE__?: FixtureWindowState;
    }
}

export function PokerFixtureHarness(props: PokerFixtureHarnessProps) {
    const fixture = getPokerFixture(props.fixtureId);
    const fixtureState: FixtureWindowState = {
        fixtureId: props.fixtureId,
        playerId: props.playerId,
        sentMessages: [],
        deliveredMessages: [],
        hostActions: [],
    };
    const socket = new FakeFixtureWebSocket<PokerServerMessage>({
        initialMessages: [
            {
                type: "poker:state",
                data: fixture.view as unknown as Record<string, unknown>,
            },
        ],
        state: fixtureState,
        onStateChange: () => {
            window.__POKER_FIXTURE__ = fixtureState;
        },
    });
    const isHost = fixture.hostPlayerId === props.playerId;

    onMount(() => {
        window.__POKER_FIXTURE__ = fixtureState;
        queueMicrotask(() => socket.start());
    });

    return (
        <PokerRoom
            roomId={fixture.roomId}
            playerId={props.playerId}
            isHost={isHost}
            ws={socket as unknown as WebSocket}
            title={fixture.title}
            onEndGame={() => {
                fixtureState.hostActions.push("end_game");
                window.__POKER_FIXTURE__ = fixtureState;
            }}
            onReturnToLobby={() => {
                fixtureState.hostActions.push("return_to_lobby");
                window.__POKER_FIXTURE__ = fixtureState;
            }}
        />
    );
}
