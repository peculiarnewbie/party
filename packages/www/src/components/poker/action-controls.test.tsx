import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { ActionControls } from "./action-controls";

describe("ActionControls", () => {
    it("shows spectator message when isSpectator is true", () => {
        const { getByText, queryByRole } = render(() => (
            <ActionControls
                legalActions={[]}
                callAmount={0}
                minBetOrRaise={null}
                maxBet={0}
                stack={0}
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

    it("fires onAction with fold when Fold is clicked", () => {
        const onAction = vi.fn();
        const { getByRole } = render(() => (
            <ActionControls
                legalActions={["fold", "call", "all_in"]}
                callAmount={10}
                minBetOrRaise={null}
                maxBet={100}
                stack={1000}
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

    it("uses Check as the primary action when no bet is selected", () => {
        const onAction = vi.fn();
        const { getByTestId } = render(() => (
            <ActionControls
                legalActions={["fold", "check", "bet", "all_in"]}
                callAmount={0}
                minBetOrRaise={20}
                maxBet={200}
                stack={1000}
                amount="0"
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));

        expect(getByTestId("poker-primary-action-button")).toHaveTextContent(
            "Check",
        );

        fireEvent.click(getByTestId("poker-primary-action-button"));

        expect(onAction).toHaveBeenCalledWith("check");
    });

    it("uses Call as the primary action until the raise size reaches the minimum", () => {
        const onAction = vi.fn();
        const { getByTestId } = render(() => (
            <ActionControls
                legalActions={["fold", "call", "raise", "all_in"]}
                callAmount={20}
                minBetOrRaise={60}
                maxBet={300}
                stack={1000}
                amount="40"
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));

        expect(getByTestId("poker-primary-action-button")).toHaveTextContent(
            "Call 20",
        );

        fireEvent.click(getByTestId("poker-primary-action-button"));

        expect(onAction).toHaveBeenCalledWith("call");
    });

    it("submits Bet when the selected amount reaches the betting threshold", () => {
        const onAction = vi.fn();
        const { getByTestId } = render(() => (
            <ActionControls
                legalActions={["fold", "check", "bet", "all_in"]}
                callAmount={0}
                minBetOrRaise={20}
                maxBet={200}
                stack={1000}
                amount="50"
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));

        expect(getByTestId("poker-primary-action-button")).toHaveTextContent("Bet");

        fireEvent.click(getByTestId("poker-primary-action-button"));

        expect(onAction).toHaveBeenCalledWith("bet", 50);
    });

    it("submits Raise when the selected amount reaches the raise minimum", () => {
        const onAction = vi.fn();
        const { getByTestId } = render(() => (
            <ActionControls
                legalActions={["fold", "call", "raise", "all_in"]}
                callAmount={20}
                minBetOrRaise={60}
                maxBet={400}
                stack={1000}
                amount="80"
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));

        expect(getByTestId("poker-primary-action-button")).toHaveTextContent(
            "Raise",
        );

        fireEvent.click(getByTestId("poker-primary-action-button"));

        expect(onAction).toHaveBeenCalledWith("raise", 80);
    });

    it("adjusts the amount with the quick sizing buttons", () => {
        const setAmount = vi.fn();
        const { getByTestId } = render(() => (
            <ActionControls
                legalActions={["fold", "check", "bet", "all_in"]}
                callAmount={0}
                minBetOrRaise={20}
                maxBet={120}
                stack={1000}
                amount="50"
                setAmount={setAmount}
                isSpectator={false}
                isMyTurn={true}
                onAction={() => {}}
            />
        ));

        fireEvent.click(getByTestId("poker-adjust-10"));
        fireEvent.click(getByTestId("poker-adjust--100"));

        expect(setAmount).toHaveBeenNthCalledWith(1, "60");
        expect(setAmount).toHaveBeenNthCalledWith(2, "0");
    });

    it("fires onAction with all_in when All-in is clicked", () => {
        const onAction = vi.fn();
        const { getByRole } = render(() => (
            <ActionControls
                legalActions={["fold", "call", "raise", "all_in"]}
                callAmount={20}
                minBetOrRaise={60}
                maxBet={400}
                stack={1000}
                amount="80"
                setAmount={() => {}}
                isSpectator={false}
                isMyTurn={true}
                onAction={onAction}
            />
        ));

        fireEvent.click(getByRole("button", { name: /all-in/i }));

        expect(onAction).toHaveBeenCalledWith("all_in");
    });

    it("shows YOUR MOVE only when it is the player's turn", () => {
        const notMyTurn = render(() => (
            <ActionControls
                legalActions={["call", "all_in"]}
                callAmount={10}
                minBetOrRaise={null}
                maxBet={100}
                stack={1000}
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
                legalActions={["call", "all_in"]}
                callAmount={10}
                minBetOrRaise={null}
                maxBet={100}
                stack={1000}
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
