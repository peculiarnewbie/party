import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { SkullBoard } from "./skull-board";
import { skullTableViewFromPlayer } from "~/game/skull/table-view";
import { makePlayerInfo, makeView } from "~/game/skull/test-helpers";

describe("Skull disc areas", () => {
    it("draws each remaining disc and played disc, then moves them between areas as play progresses", () => {
        const [view, setView] = createSignal(
            skullTableViewFromPlayer(
                makeView({
                    players: [makePlayerInfo({ name: "Alice", handCount: 4 })],
                }),
            ),
        );
        const { getByRole, getByLabelText } = render(() => (
            <SkullBoard view={view()} display />
        ));
        expect(
            getByRole("group", {
                name: "Alice's hand: 4 discs",
            }).querySelectorAll("svg"),
        ).toHaveLength(4);
        expect(
            getByRole("group", {
                name: "Alice's played discs: 0 hidden, 0 revealed",
            }).querySelectorAll("svg"),
        ).toHaveLength(0);
        setView(
            skullTableViewFromPlayer(
                makeView({
                    players: [
                        makePlayerInfo({
                            name: "Alice",
                            handCount: 2,
                            matCount: 2,
                            faceDownCount: 1,
                            revealedDiscs: ["flower"],
                        }),
                    ],
                }),
            ),
        );
        flush();
        expect(
            getByRole("group", {
                name: "Alice's hand: 2 discs",
            }).querySelectorAll("svg"),
        ).toHaveLength(2);
        expect(
            getByRole("group", {
                name: "Alice's played discs: 1 hidden, 1 revealed",
            }).querySelectorAll("svg"),
        ).toHaveLength(2);
        expect(getByLabelText("Revealed flower")).toBeVisible();
    });
});
