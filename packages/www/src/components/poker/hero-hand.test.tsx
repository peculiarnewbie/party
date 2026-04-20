import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { HeroHand } from "./hero-hand";
import type { Card } from "~/assets/card-deck/types";

describe("HeroHand", () => {
    it("shows spectator text when isSpectator is true", () => {
        const { getByText } = render(() => (
            <HeroHand
                cards={[]}
                cardCount={0}
                isSpectator={true}
            />
        ));
        expect(getByText("Spectating")).toBeInTheDocument();
    });

    it("renders card backs when no cards are visible", () => {
        const { container } = render(() => (
            <HeroHand
                cards={[]}
                cardCount={2}
                isSpectator={false}
            />
        ));
        expect(container.querySelectorAll("svg").length).toBe(2);
    });

    it("renders visible cards when dealt", () => {
        const cards: Card[] = [
            { rank: 1, suit: "spade" },
            { rank: 13, suit: "heart" },
        ];
        const { container } = render(() => (
            <HeroHand
                cards={cards}
                cardCount={2}
                isSpectator={false}
            />
        ));
        expect(container.querySelectorAll("svg").length).toBe(2);
    });
});
