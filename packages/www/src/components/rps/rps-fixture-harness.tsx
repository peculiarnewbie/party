import { onMount } from "solid-js";
import { RpsRoom } from "~/components/rps/rps-room";
import type { RpsPlayerView } from "~/game/rps/views";
import type {
    RpsClientOutgoing,
    RpsSideEvent,
} from "~/game/rps/connection";
import type { RpsFixtureId } from "~/game/rps/fixtures";
import { getRpsFixture } from "~/game/rps/fixtures";
import { createFakeGameConnection } from "~/test/fake-game-connection";

interface RpsFixtureHarnessProps {
    fixtureId: RpsFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState {
    fixtureId: RpsFixtureId;
    playerId: string;
    sentMessages: RpsClientOutgoing[];
    hostActions: string[];
}

declare global {
    interface Window {
        __RPS_FIXTURE__?: FixtureWindowState;
    }
}

export function RpsFixtureHarness(props: RpsFixtureHarnessProps) {
    const fixture = getRpsFixture(props.fixtureId);
    const fixtureState: FixtureWindowState = {
        fixtureId: props.fixtureId,
        playerId: props.playerId,
        sentMessages: [],
        hostActions: [],
    };

    const connection = createFakeGameConnection<
        RpsPlayerView,
        RpsClientOutgoing,
        RpsSideEvent
    >({
        initialView: fixture.view,
        onSend: (message) => {
            fixtureState.sentMessages.push(message);
            window.__RPS_FIXTURE__ = fixtureState;
        },
    });

    const isHost = fixture.hostPlayerId === props.playerId;

    onMount(() => {
        window.__RPS_FIXTURE__ = fixtureState;
    });

    return (
        <RpsRoom
            roomId={fixture.roomId}
            playerId={props.playerId}
            isHost={isHost}
            connection={connection}
            onEndGame={() => {
                fixtureState.hostActions.push("end_game");
                window.__RPS_FIXTURE__ = fixtureState;
            }}
            onReturnToLobby={() => {
                fixtureState.hostActions.push("return_to_lobby");
                window.__RPS_FIXTURE__ = fixtureState;
            }}
        />
    );
}
