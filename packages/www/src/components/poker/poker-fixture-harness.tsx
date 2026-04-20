import { onMount } from "solid-js";
import { PokerRoom } from "~/components/poker/poker-room";
import type { PokerPlayerView } from "~/game/poker";
import type {
    PokerClientOutgoing,
    PokerSideEvent,
} from "~/game/poker/connection";
import type { PokerFixtureId } from "~/game/poker/fixtures";
import { getPokerFixture } from "~/game/poker/fixtures";
import { createFakeGameConnection } from "~/test/fake-game-connection";

interface PokerFixtureHarnessProps {
    fixtureId: PokerFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState {
    fixtureId: PokerFixtureId;
    playerId: string;
    sentMessages: PokerClientOutgoing[];
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
        hostActions: [],
    };

    const connection = createFakeGameConnection<
        PokerPlayerView,
        PokerClientOutgoing,
        PokerSideEvent
    >({
        initialView: fixture.view,
        onSend: (message) => {
            fixtureState.sentMessages.push(message);
            window.__POKER_FIXTURE__ = fixtureState;
        },
    });

    const isHost = fixture.hostPlayerId === props.playerId;

    onMount(() => {
        window.__POKER_FIXTURE__ = fixtureState;
    });

    return (
        <PokerRoom
            roomId={fixture.roomId}
            playerId={props.playerId}
            isHost={isHost}
            connection={connection}
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
