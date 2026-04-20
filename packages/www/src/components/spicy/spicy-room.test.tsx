import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { SpicyRoom } from "./spicy-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    SpicyClientOutgoing,
    SpicySideEvent,
} from "~/game/spicy/connection";
import {
    makeFinalScore,
    makeStackTop,
    makeView,
    standardCard,
} from "~/game/spicy/test-helpers";
import type { SpicyPlayerView } from "~/game/spicy";

function renderRoom(
    options: {
        view?: SpicyPlayerView;
        playerId?: string | null;
        isHost?: boolean;
    } = {},
) {
    const {
        view = makeView(),
        playerId = "p1",
        isHost = false,
    } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();

    const connection = createFakeGameConnection<
        SpicyPlayerView,
        SpicyClientOutgoing,
        SpicySideEvent
    >({ initialView: view });

    const result = render(() => (
        <SpicyRoom
            roomId="room1"
            playerId={playerId}
            isHost={isHost}
            connection={connection}
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("SpicyRoom", () => {
    it("renders header and fresh stack state", () => {
        const view = makeView({ stackTop: null });
        const { getByText } = renderRoom({ view });

        expect(getByText(/ROOM ROOM1/i)).toBeInTheDocument();
        expect(getByText(/FRESH STACK/i)).toBeInTheDocument();
        expect(getByText(/In Play/i)).toBeInTheDocument();
    });

    it("shows stack top declaration when there is a top card", () => {
        const view = makeView({
            stackTop: makeStackTop({
                ownerId: "p2",
                declaredNumber: 4,
                declaredSpice: "wasabi",
                stackSize: 2,
            }),
        });
        const { getByText } = renderRoom({ view });

        expect(getByText(/4 Wasabi/i)).toBeInTheDocument();
        expect(getByText("TOP CARD OWNER")).toBeInTheDocument();
    });

    it("sends spicy:play_card with selected card and declaration", () => {
        const view = makeView({
            isMyTurn: true,
            canPlayCard: true,
            myHand: [standardCard(1, "chili", "card-a")],
            allowedDeclarationNumbers: [1, 2, 3],
            allowedDeclarationSpices: ["chili", "wasabi", "pepper"],
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /play face down/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "spicy:play_card",
                data: {
                    cardId: "card-a",
                    declaredNumber: 1,
                    declaredSpice: "chili",
                },
            },
        ]);
    });

    it("sends spicy:pass when PASS + DRAW is clicked", () => {
        const view = makeView({ isMyTurn: true, canPass: true });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /pass \+ draw/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "spicy:pass",
                data: {},
            },
        ]);
    });

    it("sends spicy:challenge with trait number when CHALLENGE NUMBER is clicked", () => {
        const view = makeView({
            currentPlayerId: "p2",
            isMyTurn: false,
            canPlayCard: false,
            canPass: false,
            canChallenge: true,
            stackTop: makeStackTop(),
        });
        const { getByRole, connection } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /challenge number/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "spicy:challenge",
                data: { trait: "number" },
            },
        ]);
    });

    it("shows END GAME button only for host", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByRole("button", { name: /end game/i })).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByRole("button", { name: /end game/i }));
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("renders game over panel with winners and RETURN TO LOBBY for host", () => {
        const view = makeView({
            phase: "game_over",
            endReason: "two_trophies",
            winners: ["p2"],
            finalScores: [
                makeFinalScore({ playerId: "p2", points: 14, trophies: 2 }),
                makeFinalScore({ playerId: "p1", points: 3 }),
            ],
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("FINAL SCORES")).toBeInTheDocument();
        expect(getByText("BOB")).toBeInTheDocument();
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("reactively updates UI when a new spicy:state message arrives", () => {
        const { getByText, connection } = renderRoom({
            view: makeView({ stackTop: null }),
        });
        expect(getByText(/FRESH STACK/i)).toBeInTheDocument();

        connection.setView(
            makeView({
                stackTop: makeStackTop({
                    declaredNumber: 5,
                    declaredSpice: "pepper",
                }),
            }),
        );

        expect(getByText(/5 Pepper/i)).toBeInTheDocument();
    });

    it("shows spicy:error message when received", () => {
        const { getByText, connection } = renderRoom();

        connection.emit({
            type: "spicy:error",
            data: { message: "Invalid declaration" },
        });

        expect(getByText(/Invalid declaration/i)).toBeInTheDocument();
    });
});
