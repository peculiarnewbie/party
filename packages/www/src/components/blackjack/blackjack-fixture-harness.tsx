import { onMount } from "solid-js";
import { BlackjackRoom } from "~/components/blackjack/blackjack-room";
import type { BlackjackPlayerView } from "~/game/blackjack/views";
import type {
    BlackjackClientOutgoing,
    BlackjackSideEvent,
} from "~/game/blackjack/connection";
import type { BlackjackFixtureId } from "~/game/blackjack/fixtures";
import { getBlackjackFixture } from "~/game/blackjack/fixtures";
import { createFakeGameConnection } from "~/test/fake-game-connection";

interface BlackjackFixtureHarnessProps {
    fixtureId: BlackjackFixtureId;
    playerId: string;
    step?: number;
}

interface FixtureWindowState {
    fixtureId: BlackjackFixtureId;
    playerId: string;
    sentMessages: BlackjackClientOutgoing[];
    hostActions: string[];
}

declare global {
    interface Window {
        __BLACKJACK_FIXTURE__?: FixtureWindowState;
    }
}

export function BlackjackFixtureHarness(props: BlackjackFixtureHarnessProps) {
    const fixture = getBlackjackFixture(props.fixtureId);
    const fixtureState: FixtureWindowState = {
        fixtureId: props.fixtureId,
        playerId: props.playerId,
        sentMessages: [],
        hostActions: [],
    };

    const connection = createFakeGameConnection<
        BlackjackPlayerView,
        BlackjackClientOutgoing,
        BlackjackSideEvent
    >({
        initialView: fixture.view,
        onSend: (message) => {
            fixtureState.sentMessages.push(message);
            window.__BLACKJACK_FIXTURE__ = fixtureState;
        },
    });

    const isHost = fixture.hostPlayerId === props.playerId;

    onMount(() => {
        window.__BLACKJACK_FIXTURE__ = fixtureState;
    });

    return (
        <BlackjackRoom
            roomId={fixture.roomId}
            playerId={props.playerId}
            isHost={isHost}
            connection={connection}
            onEndGame={() => {
                fixtureState.hostActions.push("end_game");
                window.__BLACKJACK_FIXTURE__ = fixtureState;
            }}
            onReturnToLobby={() => {
                fixtureState.hostActions.push("return_to_lobby");
                window.__BLACKJACK_FIXTURE__ = fixtureState;
            }}
        />
    );
}
