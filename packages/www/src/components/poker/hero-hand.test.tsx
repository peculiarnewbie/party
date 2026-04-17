import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { HeroHand } from "./hero-hand";
import type { Card } from "~/assets/card-deck/types";

describe("HeroHand", () => {
    it("shows SPECTATING label and spectator fallback text when isSpectator is true", () => {
        const { getByText } = render(() => (
            <HeroHand
                cards={[]}
                cardCount={0}
                isSpectator={true}
                stack={0}
                status={null}
            />
        ));
        expect(getByText("SPECTATING")).toBeInTheDocument();
        expect(
            getByText(/You joined this table as a spectator/i),
        ).toBeInTheDocument();
    });

    it("renders stack and uppercased status when seated", () => {
        const { getByText } = render(() => (
            <HeroHand
                cards={[]}
                cardCount={0}
                isSpectator={false}
                stack={1450}
                status="Folded"
            />
        ));
        expect(getByText("1450")).toBeInTheDocument();
        expect(getByText("FOLDED")).toBeInTheDocument();
    });

    it("renders the hand heading for a seated player", () => {
        const cards: Card[] = [
            { rank: 1, suit: "spade" },
            { rank: 13, suit: "heart" },
        ];
        const { getByText } = render(() => (
            <HeroHand
                cards={cards}
                cardCount={2}
                isSpectator={false}
                stack={500}
                status={null}
            />
        ));
        expect(getByText("YOUR HAND")).toBeInTheDocument();
        expect(getByText("500")).toBeInTheDocument();
    });
});
