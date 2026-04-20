import { describe, it, expect, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { YahtzeeRoom } from "./yahtzee-room";
import { createFakeGameConnection } from "~/test/fake-game-connection";
import type {
    YahtzeeClientOutgoing,
    YahtzeeSideEvent,
} from "~/game/yahtzee/connection";
import {
    makePlayerInfo,
    makeView,
} from "~/game/yahtzee/test-helpers";
import type { YahtzeePlayerView } from "~/game/yahtzee/views";

function renderRoom(
    options: {
        view?: YahtzeePlayerView;
        playerId?: string | null;
        isHost?: boolean;
        title?: string;
    } = {},
) {
    const {
        view = makeView(),
        playerId = "p1",
        isHost = false,
        title = "Yahtzee",
    } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();

    const connection = createFakeGameConnection<
        YahtzeePlayerView,
        YahtzeeClientOutgoing,
        YahtzeeSideEvent
    >({ initialView: view });

    const result = render(() => (
        <YahtzeeRoom
            roomId="room1"
            playerId={playerId}
            isHost={isHost}
            connection={connection}
            title={title}
            onEndGame={onEndGame}
            onReturnToLobby={onReturnToLobby}
            announcementDelayMs={0}
        />
    ));

    return { ...result, connection, onEndGame, onReturnToLobby };
}

describe("YahtzeeRoom", () => {
    it("renders title header and round counter", () => {
        const view = makeView({ round: 5 });
        const { getByText, getByTestId } = renderRoom({
            view,
            title: "Yahtzee",
        });

        expect(getByTestId("yahtzee-title").textContent).toMatch(/YAHTZEE/);
        expect(getByText("ROUND 5 / 13")).toBeInTheDocument();
    });

    it("sends yahtzee:roll when the ROLL button is clicked", () => {
        const view = makeView({
            canRoll: true,
            phase: "pre_roll",
            rollsLeft: 3,
            isMyTurn: true,
        });
        const { getByTestId, connection } = renderRoom({ view });

        fireEvent.click(getByTestId("yahtzee-roll-button"));

        expect(connection.sentMessages).toEqual([
            {
                type: "yahtzee:roll",
                data: {},
            },
        ]);
    });

    it("sends yahtzee:toggle_hold when a die is clicked mid-turn", () => {
        const view = makeView({
            canRoll: true,
            phase: "mid_turn",
            rollsLeft: 2,
            isMyTurn: true,
            dice: [5, 5, 3, 2, 1],
            held: [false, false, false, false, false],
        });
        const { getByTestId, connection } = renderRoom({ view });

        fireEvent.click(getByTestId("yahtzee-die-0"));

        expect(connection.sentMessages).toEqual([
            {
                type: "yahtzee:toggle_hold",
                data: { diceIndex: 0 },
            },
        ]);
    });

    it("sends yahtzee:score when a scorecard cell is clicked in standard mode", () => {
        const view = makeView({
            mode: "standard",
            phase: "mid_turn",
            isMyTurn: true,
            canScore: true,
            canRoll: true,
            rollsLeft: 1,
            dice: [5, 5, 5, 2, 1],
            potentialScores: { fives: 15, chance: 18 },
            suggestedCategories: ["chance"],
        });
        const { getByTestId, connection } = renderRoom({ view });

        fireEvent.click(getByTestId("scorecard-cell-p1-fives"));

        expect(connection.sentMessages).toEqual([
            {
                type: "yahtzee:score",
                data: { category: "fives" },
            },
        ]);
    });

    it("shows opponent turn label when it is not my turn", () => {
        const view = makeView({
            isMyTurn: false,
            phase: "pre_roll",
            canRoll: false,
            currentPlayerId: "p2",
        });
        const { getByTestId, queryByTestId } = renderRoom({ view });

        expect(getByTestId("yahtzee-turn-label").textContent).toMatch(
            /BOB'S TURN/,
        );
        expect(queryByTestId("yahtzee-roll-button")).toBeNull();
    });

    it("shows END button only for host", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByTestId("yahtzee-end-button")).toBeNull();

        const host = renderRoom({ isHost: true });
        fireEvent.click(host.getByTestId("yahtzee-end-button"));
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("renders GAME OVER panel with winner and RETURN TO LOBBY for host", () => {
        const view = makeView({
            phase: "game_over",
            canRoll: false,
            canScore: false,
            winners: ["p2"],
            players: [
                makePlayerInfo({ id: "p1", name: "Alice", totalScore: 150 }),
                makePlayerInfo({ id: "p2", name: "Bob", totalScore: 240 }),
            ],
        });
        const { getByText, getByTestId, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("GAME OVER")).toBeInTheDocument();
        expect(getByText("WINNER")).toBeInTheDocument();
        fireEvent.click(getByTestId("yahtzee-return-button"));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("reactively updates dice when the connection view changes", () => {
        const { container, connection } = renderRoom({
            view: makeView({
                phase: "pre_roll",
                dice: [0, 0, 0, 0, 0],
                canRoll: true,
            }),
        });

        expect(
            container.querySelector("[data-testid='yahtzee-die-0']")
                ?.getAttribute("data-has-value"),
        ).toBe("false");

        connection.setView(
            makeView({
                phase: "mid_turn",
                rollsLeft: 2,
                canRoll: true,
                dice: [3, 3, 3, 3, 3],
            }),
        );

        expect(
            container.querySelector("[data-testid='yahtzee-die-0']")
                ?.getAttribute("data-has-value"),
        ).toBe("true");
    });

    it("shows BELIEVE/LIAR in lying mode when another player has submitted a claim", () => {
        const view = makeView({
            mode: "lying",
            phase: "awaiting_response",
            isMyTurn: false,
            canRoll: false,
            canAcceptClaim: true,
            canChallengeClaim: true,
            currentPlayerId: "p2",
            pendingClaim: {
                playerId: "p2",
                category: "fives",
                claimedDice: [5, 5, 5, 5, 5],
                claimedPoints: 25,
            },
        });
        const { getByTestId, connection } = renderRoom({ view });

        fireEvent.click(getByTestId("yahtzee-liar-button"));

        expect(connection.sentMessages).toEqual([
            {
                type: "yahtzee:challenge_claim",
                data: {},
            },
        ]);
    });
});
