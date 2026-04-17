import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { SpicyRoom } from "./spicy-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makeFinalScore,
    makePlayerInfo,
    makeStackTop,
    makeView,
    standardCard,
} from "~/game/spicy/test-helpers";
import type { SpicyPlayerView } from "~/game/spicy";

type SpicyEnvelope =
    | { type: "spicy:state"; data: SpicyPlayerView }
    | { type: "spicy:action"; data: Record<string, unknown> }
    | { type: "spicy:error"; data: { message: string } };

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
    const initialMessages: SpicyEnvelope[] = [
        { type: "spicy:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<SpicyEnvelope>(
        (ws) => (
            <SpicyRoom
                roomId="room1"
                playerId={playerId}
                isHost={isHost}
                ws={ws}
                onEndGame={onEndGame}
                onReturnToLobby={onReturnToLobby}
            />
        ),
        { initialMessages },
    );

    return { ...rest, socket, onEndGame, onReturnToLobby };
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
        const { getByRole, socket } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /play face down/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "spicy:play_card",
                playerId: "p1",
                playerName: "",
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
        const { getByRole, socket } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /pass \+ draw/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "spicy:pass",
                playerId: "p1",
                playerName: "",
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
        const { getByRole, socket } = renderRoom({ view });

        fireEvent.click(getByRole("button", { name: /challenge number/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "spicy:challenge",
                playerId: "p1",
                playerName: "",
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
        const { getByText, socket } = renderRoom({
            view: makeView({ stackTop: null }),
        });
        expect(getByText(/FRESH STACK/i)).toBeInTheDocument();

        socket.emit({
            type: "spicy:state",
            data: makeView({
                stackTop: makeStackTop({
                    declaredNumber: 5,
                    declaredSpice: "pepper",
                }),
            }),
        });

        expect(getByText(/5 Pepper/i)).toBeInTheDocument();
    });

    it("shows spicy:error message when received", () => {
        const { getByText, socket } = renderRoom();

        socket.emit({
            type: "spicy:error",
            data: { message: "Invalid declaration" },
        });

        expect(getByText(/Invalid declaration/i)).toBeInTheDocument();
    });
});
