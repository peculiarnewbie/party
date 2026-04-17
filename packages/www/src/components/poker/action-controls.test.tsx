import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ActionControls } from "./action-controls";

describe("ActionControls", () => {
    it("shows spectator message when isSpectator is true", () => {
        const { getByText, queryByRole } = render(() => (
            <ActionControls
                legalActions={[]}
                callAmount={0}
                minBetOrRaise={null}
                maxBet={0}
                amount=""
                setAmount={() => {}}
                isSpectator={true}
                isMyTurn={false}
                onAction={() => {}}
            />
        ));
        expect(
            getByText(/Spectators can follow the board/i),
        ).toBeInTheDocument();
        expect(queryByRole("button", { name: /fold/i })).toBeNull();
    });

    it("fires onAction with 'fold' when Fold is clicked", () => {
        const onAction = vi.fn();
        const { getByRole } = render(() => (
            <ActionControls
                legalActions={["fold", "call"]}
                callAmount={10}
                minBetOrRaise={null}
                maxBet={100}
                amount=""
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));
        fireEvent.click(getByRole("button", { name: /fold/i }));
        expect(onAction).toHaveBeenCalledWith("fold");
    });

    it("disables actions not in legalActions", () => {
        const onAction = vi.fn();
        const { getByRole } = render(() => (
            <ActionControls
                legalActions={["call"]}
                callAmount={10}
                minBetOrRaise={null}
                maxBet={100}
                amount=""
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));
        expect(getByRole("button", { name: /fold/i })).toBeDisabled();
        expect(getByRole("button", { name: /check/i })).toBeDisabled();
        expect(getByRole("button", { name: /call/i })).not.toBeDisabled();
        fireEvent.click(getByRole("button", { name: /fold/i }));
        expect(onAction).not.toHaveBeenCalled();
    });

    it("passes the typed amount to onAction when Bet is clicked", () => {
        const onAction = vi.fn();
        const { getByRole } = render(() => (
            <ActionControls
                legalActions={["bet"]}
                callAmount={0}
                minBetOrRaise={20}
                maxBet={200}
                amount="50"
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));
        fireEvent.click(getByRole("button", { name: /bet/i }));
        expect(onAction).toHaveBeenCalledWith("bet", 50);
    });

    it("shows YOUR MOVE only when it is the player's turn", () => {
        const notMyTurn = render(() => (
            <ActionControls
                legalActions={["call"]}
                callAmount={0}
                minBetOrRaise={null}
                maxBet={100}
                amount=""
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={false}
                onAction={() => {}}
            />
        ));
        expect(notMyTurn.queryByText("YOUR MOVE")).toBeNull();

        const myTurn = render(() => (
            <ActionControls
                legalActions={["call"]}
                callAmount={0}
                minBetOrRaise={null}
                maxBet={100}
                amount=""
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={() => {}}
            />
        ));
        expect(myTurn.getByText("YOUR MOVE")).toBeInTheDocument();
    });
});
