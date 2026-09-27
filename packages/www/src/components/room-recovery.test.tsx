import { createSignal, flush } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { describe, it, expect, vi } from "vitest";
import { RoomRecoveryPanel } from "./room-recovery";
import { createRoomRecovery } from "~/game";
import type { PlayerId, RoomRecovery } from "~/game";

describe("RoomRecoveryPanel", () => {
    it("stays absent for a connected host, appears on disconnect, and disappears on recovery", () => {
        const [recovery, setRecovery] =
            createSignal<RoomRecovery>(createRoomRecovery());
        const onManage = vi.fn();
        const { queryByTestId, getByTestId, getByRole, getByText } = render(
            () => (
                <RoomRecoveryPanel
                    recovery={recovery()}
                    players={[{ id: "p2", name: "Bob" }]}
                    status="connected"
                    isHost
                    onManage={onManage}
                />
            ),
        );
        expect(queryByTestId("room-recovery")).toBeNull();
        setRecovery({
            ...createRoomRecovery(),
            offline: [
                {
                    playerId: "p2" as PlayerId,
                    since: Date.now(),
                    deadline: null,
                    status: "waiting",
                },
            ],
        });
        flush();
        expect(getByTestId("room-recovery")).toHaveTextContent(
            "1 player disconnected",
        );
        fireEvent.click(getByText("1 player disconnected"));
        fireEvent.click(getByRole("button", { name: "Add 30 seconds" }));
        expect(onManage).toHaveBeenCalledWith("p2", "extend");
        setRecovery(createRoomRecovery());
        flush();
        expect(queryByTestId("room-recovery")).toBeNull();
    });

    it("keeps retry available when this device loses its connection", () => {
        const onRetry = vi.fn();
        const { getByRole } = render(() => (
            <RoomRecoveryPanel
                players={[]}
                status="reconnecting"
                onRetry={onRetry}
            />
        ));
        expect(getByRole("status")).toHaveTextContent(
            "Reconnecting to your room",
        );
        fireEvent.click(getByRole("button", { name: "Retry connection" }));
        expect(onRetry).toHaveBeenCalledOnce();
    });
});
