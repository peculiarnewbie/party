import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { EventLog } from "./event-log";
import type { PokerEvent } from "~/game/poker";

describe("EventLog", () => {
    it("renders the TABLE LOG heading even when empty", () => {
        const { getByText } = render(() => <EventLog events={[]} />);
        expect(getByText("TABLE LOG")).toBeInTheDocument();
    });

    it("renders event messages with their type in uppercase with spaces", () => {
        const events: PokerEvent[] = [
            { id: 1, type: "hand_started", message: "Hand #1 dealt." },
            {
                id: 2,
                type: "player_action",
                message: "Alice bets 20.",
                playerId: "p1",
                amount: 20,
            },
        ];
        const { getByText } = render(() => <EventLog events={events} />);
        expect(getByText("HAND STARTED")).toBeInTheDocument();
        expect(getByText("PLAYER ACTION")).toBeInTheDocument();
        expect(getByText("Hand #1 dealt.")).toBeInTheDocument();
        expect(getByText("Alice bets 20.")).toBeInTheDocument();
    });

    it("renders the most recent event first (reversed order)", () => {
        const events: PokerEvent[] = [
            { id: 1, type: "hand_started", message: "First event" },
            { id: 2, type: "board_dealt", message: "Second event" },
            { id: 3, type: "pot_awarded", message: "Third event" },
        ];
        const { container } = render(() => <EventLog events={events} />);
        const messages = Array.from(
            container.querySelectorAll(".font-karla"),
        ).map((el) => el.textContent);
        expect(messages).toEqual(["Third event", "Second event", "First event"]);
    });
});
