import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ResultsOverlay } from "./results-overlay";
import type { PokerPlayerPublicView } from "~/game/poker";

function makePlayer(
    overrides: Partial<PokerPlayerPublicView> = {},
): PokerPlayerPublicView {
    return {
        id: "p1",
        name: "Alice",
        stack: 0,
        status: "active",
        connected: true,
        committedThisStreet: 0,
        committedThisHand: 0,
        holeCardCount: 0,
        visibleHoleCards: [],
        isDealer: false,
        isSmallBlind: false,
        isBigBlind: false,
        isActing: false,
        ...overrides,
    };
}

describe("ResultsOverlay", () => {
    it("shows TOURNAMENT COMPLETE and the winner's name in uppercase", () => {
        const players = [
            makePlayer({ id: "p1", name: "Alice", stack: 3000 }),
            makePlayer({ id: "p2", name: "Bob", stack: 0, status: "busted" }),
        ];
        const { getByText } = render(() => (
            <ResultsOverlay
                players={players}
                winnerIds={["p1"]}
                endedByHost={false}
                isHost={false}
                onReturnToLobby={() => {}}
            />
        ));
        expect(getByText("TOURNAMENT COMPLETE")).toBeInTheDocument();
        expect(getByText("ALICE LEADS")).toBeInTheDocument();
    });

    it("shows HOST ENDED THE GAME when endedByHost is true", () => {
        const { getByText } = render(() => (
            <ResultsOverlay
                players={[makePlayer({ stack: 500 })]}
                winnerIds={null}
                endedByHost={true}
                isHost={false}
                onReturnToLobby={() => {}}
            />
        ));
        expect(getByText("HOST ENDED THE GAME")).toBeInTheDocument();
        expect(getByText("TABLE CLOSED")).toBeInTheDocument();
    });

    it("only shows Return To Lobby button for host and fires onReturnToLobby when clicked", () => {
        const onReturnToLobby = vi.fn();
        const guest = render(() => (
            <ResultsOverlay
                players={[makePlayer()]}
                winnerIds={["p1"]}
                endedByHost={false}
                isHost={false}
                onReturnToLobby={onReturnToLobby}
            />
        ));
        expect(
            guest.queryByRole("button", { name: /return to lobby/i }),
        ).toBeNull();

        const host = render(() => (
            <ResultsOverlay
                players={[makePlayer()]}
                winnerIds={["p1"]}
                endedByHost={false}
                isHost={true}
                onReturnToLobby={onReturnToLobby}
            />
        ));
        fireEvent.click(
            host.getByRole("button", { name: /return to lobby/i }),
        );
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("sorts standings by stack descending", () => {
        const players = [
            makePlayer({ id: "p1", name: "Alice", stack: 500 }),
            makePlayer({ id: "p2", name: "Bob", stack: 2000 }),
            makePlayer({ id: "p3", name: "Carol", stack: 1200 }),
        ];
        const { container } = render(() => (
            <ResultsOverlay
                players={players}
                winnerIds={["p2"]}
                endedByHost={false}
                isHost={false}
                onReturnToLobby={() => {}}
            />
        ));
        const names = Array.from(
            container.querySelectorAll(".font-bebas.text-\\[1rem\\]"),
        ).map((el) => el.textContent);
        expect(names).toEqual(["Bob", "Carol", "Alice"]);
    });
});
