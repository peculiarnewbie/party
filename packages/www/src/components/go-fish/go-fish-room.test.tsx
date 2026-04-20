import { describe, it, expect } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { GoFishRoom } from "./go-fish-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    GoFishClientOutgoing,
    GoFishSideEvent,
} from "~/game/go-fish/connection";
import { makeSeat, makeView, SAMPLE_HAND } from "~/game/go-fish/test-helpers";
import type { GoFishPlayerView } from "~/game/go-fish";

function renderRoom(
    options: {
        view?: GoFishPlayerView;
        playerId?: string | null;
        isHost?: boolean;
    } = {},
) {
    const {
        view = makeView(),
        playerId = "p1",
        isHost = false,
    } = options;

    const connection = createFakeGameConnection<
        GoFishPlayerView,
        GoFishClientOutgoing,
        GoFishSideEvent
    >({ initialView: view });

    const result = render(() => (
        <GoFishRoom
            roomId="room1"
            playerId={playerId}
            isHost={isHost}
            connection={connection}
        />
    ));

    return { ...result, connection };
}

describe("GoFishRoom", () => {
    it("renders initial state: YOUR TURN, opponents and draw pile count", () => {
        const view = makeView({
            drawPileCount: 25,
            currentPlayerId: "p1",
            players: [
                makeSeat({ id: "p1", name: "Alice" }),
                makeSeat({ id: "p2", name: "Bob", cardCount: 5 }),
            ],
            myHand: SAMPLE_HAND,
        });
        const { getByText } = renderRoom({ view });

        expect(getByText("YOUR TURN")).toBeInTheDocument();
        expect(getByText("Bob")).toBeInTheDocument();
        expect(getByText(/25 LEFT/i)).toBeInTheDocument();
    });

    it("shows opponent's turn when it's not your turn", () => {
        const view = makeView({
            currentPlayerId: "p2",
            players: [
                makeSeat({ id: "p1", name: "Alice" }),
                makeSeat({ id: "p2", name: "Bob" }),
            ],
        });
        const { getByText } = renderRoom({ view, playerId: "p1" });
        expect(getByText(/BOB'S TURN/i)).toBeInTheDocument();
        expect(getByText(/WAITING FOR BOB/i)).toBeInTheDocument();
    });

    it("sends go_fish:ask when opponent and rank are both selected", () => {
        const view = makeView({
            currentPlayerId: "p1",
            turnPhase: "awaiting_ask",
            players: [
                makeSeat({ id: "p1", name: "Alice" }),
                makeSeat({ id: "p2", name: "Bob" }),
            ],
            myHand: SAMPLE_HAND,
        });
        const { getByRole, connection, container } = renderRoom({
            view,
            playerId: "p1",
        });

        fireEvent.click(getByRole("button", { name: /bob/i }));

        const handButtons = container.querySelectorAll(
            ".border-t-\\[3px\\] button",
        );
        fireEvent.click(handButtons[0]!);

        expect(connection.sentMessages).toEqual([
            {
                type: "go_fish:ask",
                data: { targetId: "p2", rank: 7 },
            },
        ]);
    });

    it("sends go_fish:draw when turnPhase is go_fish and Go Fish! is clicked", () => {
        const view = makeView({
            currentPlayerId: "p1",
            turnPhase: "go_fish",
            players: [
                makeSeat({ id: "p1", name: "Alice" }),
                makeSeat({ id: "p2", name: "Bob" }),
            ],
        });
        const { getByRole, connection } = renderRoom({ view, playerId: "p1" });

        fireEvent.click(getByRole("button", { name: /go fish!/i }));

        expect(connection.sentMessages).toEqual([
            {
                type: "go_fish:draw",
                data: {},
            },
        ]);
    });

    it("updates UI when a new view is pushed via the connection", () => {
        const initialView = makeView({
            drawPileCount: 40,
            myHand: [],
        });
        const { getByText, connection } = renderRoom({ view: initialView });
        expect(getByText(/40 LEFT/i)).toBeInTheDocument();

        connection.setView(makeView({ drawPileCount: 12, myHand: SAMPLE_HAND }));

        expect(getByText(/12 LEFT/i)).toBeInTheDocument();
    });

    it("shows game over screen with winner name and Back to Lobby button", () => {
        const view = makeView({
            gameOver: true,
            winner: ["p2"],
            players: [
                makeSeat({ id: "p1", name: "Alice", books: [] }),
                makeSeat({ id: "p2", name: "Bob", books: [1, 2, 3] }),
            ],
        });
        const { getByText, getByRole } = renderRoom({ view, playerId: "p1" });

        expect(getByText(/GAME OVER/i)).toBeInTheDocument();
        expect(getByText(/BOB WINS/i)).toBeInTheDocument();
        expect(
            getByRole("button", { name: /back to lobby/i }),
        ).toBeInTheDocument();
    });

    it("shows YOU WIN! when the current player wins", () => {
        const view = makeView({
            gameOver: true,
            winner: ["p1"],
            players: [
                makeSeat({ id: "p1", name: "Alice", books: [1, 2] }),
                makeSeat({ id: "p2", name: "Bob", books: [] }),
            ],
        });
        const { getByText } = renderRoom({ view, playerId: "p1" });
        expect(getByText("YOU WIN!")).toBeInTheDocument();
    });
});
