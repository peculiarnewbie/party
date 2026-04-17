import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { PotDisplay } from "./pot-display";
import type { PokerPot } from "~/game/poker";

describe("PotDisplay", () => {
    it("shows NO POT YET when pots are empty", () => {
        const { getByText } = render(() => <PotDisplay pots={[]} />);
        expect(getByText("NO POT YET")).toBeInTheDocument();
    });

    it("labels the first pot as MAIN POT and renders its amount", () => {
        const pots: PokerPot[] = [
            { amount: 240, eligiblePlayerIds: ["p1", "p2"] },
        ];
        const { getByText } = render(() => <PotDisplay pots={pots} />);
        expect(getByText("MAIN POT")).toBeInTheDocument();
        expect(getByText("240")).toBeInTheDocument();
    });

    it("labels additional pots as SIDE POT N", () => {
        const pots: PokerPot[] = [
            { amount: 100, eligiblePlayerIds: ["p1", "p2", "p3"] },
            { amount: 60, eligiblePlayerIds: ["p2", "p3"] },
            { amount: 40, eligiblePlayerIds: ["p3"] },
        ];
        const { getByText } = render(() => <PotDisplay pots={pots} />);
        expect(getByText("MAIN POT")).toBeInTheDocument();
        expect(getByText("SIDE POT 1")).toBeInTheDocument();
        expect(getByText("SIDE POT 2")).toBeInTheDocument();
        expect(getByText("60")).toBeInTheDocument();
        expect(getByText("40")).toBeInTheDocument();
    });
});
