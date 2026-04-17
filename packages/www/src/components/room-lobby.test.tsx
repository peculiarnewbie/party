import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { RoomLobby } from "./room-lobby";
import type { Player } from "~/game";

function makeProps(overrides: Partial<Parameters<typeof RoomLobby>[0]> = {}) {
    const base: Parameters<typeof RoomLobby>[0] = {
        roomId: "abc123",
        playerId: "p1",
        name: "",
        setName: () => {},
        players: [],
        isHost: false,
        isJoined: false,
        selectedGameType: "yahtzee",
        onJoin: () => {},
        onLeave: () => {},
        onStart: () => {},
        onSelectGame: () => {},
    };
    return { ...base, ...overrides };
}

describe("RoomLobby", () => {
    it("renders the uppercased room code prominently", () => {
        const { getAllByText } = render(() => (
            <RoomLobby {...makeProps({ roomId: "abc123" })} />
        ));
        expect(getAllByText("ABC123").length).toBeGreaterThanOrEqual(1);
    });

    it("shows a Join button for an unjoined user and fires onJoin with typed name", () => {
        const onJoin = vi.fn();
        const props = makeProps({
            name: "Alice",
            isJoined: false,
            onJoin,
        });
        const { getByRole } = render(() => <RoomLobby {...props} />);
        const joinBtn = getByRole("button", { name: /join/i });
        expect(joinBtn).not.toBeDisabled();
        fireEvent.click(joinBtn);
        expect(onJoin).toHaveBeenCalledWith("Alice");
    });

    it("disables the Join button when name is empty", () => {
        const { getByRole } = render(() => (
            <RoomLobby {...makeProps({ name: "", isJoined: false })} />
        ));
        expect(getByRole("button", { name: /join/i })).toBeDisabled();
    });

    it("shows Rename (not Join) button for a joined guest, and no Start button", () => {
        const props = makeProps({
            name: "Alice",
            isJoined: true,
            isHost: false,
            players: [{ id: "p1", name: "Alice" }],
        });
        const { getByRole, queryByRole } = render(() => <RoomLobby {...props} />);
        expect(
            getByRole("button", { name: /rename/i }),
        ).toBeInTheDocument();
        expect(queryByRole("button", { name: /start/i })).toBeNull();
    });

    it("shows YOU ARE HOST and a Start button when the player is host", () => {
        const players: Player[] = [
            { id: "p1", name: "Alice" },
            { id: "p2", name: "Bob" },
        ];
        const props = makeProps({
            name: "Alice",
            isJoined: true,
            isHost: true,
            players,
            selectedGameType: "yahtzee",
        });
        const { getByText, getByRole } = render(() => <RoomLobby {...props} />);
        expect(getByText(/YOU ARE HOST/i)).toBeInTheDocument();
        expect(
            getByRole("button", { name: /\+ start/i }),
        ).toBeInTheDocument();
    });

    it("disables Start button when there are not enough players", () => {
        const props = makeProps({
            name: "Alice",
            isJoined: true,
            isHost: true,
            players: [{ id: "p1", name: "Alice" }],
            selectedGameType: "yahtzee",
        });
        const { getByRole } = render(() => <RoomLobby {...props} />);
        expect(getByRole("button", { name: /\+ start/i })).toBeDisabled();
    });

    it("fires onStart when host clicks Start with valid player count", () => {
        const onStart = vi.fn();
        const props = makeProps({
            name: "Alice",
            isJoined: true,
            isHost: true,
            players: [
                { id: "p1", name: "Alice" },
                { id: "p2", name: "Bob" },
            ],
            selectedGameType: "yahtzee",
            onStart,
        });
        const { getByRole } = render(() => <RoomLobby {...props} />);
        fireEvent.click(getByRole("button", { name: /\+ start/i }));
        expect(onStart).toHaveBeenCalledTimes(1);
    });

    it("fires onSelectGame with the chosen game type when host clicks a game card", () => {
        const onSelectGame = vi.fn();
        const props = makeProps({
            name: "Alice",
            isJoined: true,
            isHost: true,
            players: [
                { id: "p1", name: "Alice" },
                { id: "p2", name: "Bob" },
            ],
            selectedGameType: "yahtzee",
            onSelectGame,
        });
        const { getByRole } = render(() => <RoomLobby {...props} />);
        fireEvent.click(getByRole("button", { name: /texas hold'em/i }));
        expect(onSelectGame).toHaveBeenCalledWith("poker");
    });

    it("disables game-select buttons for non-host guests", () => {
        const props = makeProps({
            name: "Alice",
            isJoined: true,
            isHost: false,
            players: [
                { id: "p1", name: "Alice" },
                { id: "p2", name: "Bob" },
            ],
            selectedGameType: "yahtzee",
        });
        const { getByRole, getByText } = render(() => <RoomLobby {...props} />);
        expect(getByText(/HOST DECIDES/i)).toBeInTheDocument();
        expect(
            getByRole("button", { name: /texas hold'em/i }),
        ).toBeDisabled();
    });
});
