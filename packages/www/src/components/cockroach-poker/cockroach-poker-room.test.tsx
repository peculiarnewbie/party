import { describe, it, expect, vi } from "vitest";
import { fireEvent } from "@solidjs/testing-library";
import { CockroachPokerRoom } from "./cockroach-poker-room";
import { renderWithWs } from "~/test/render-with-ws";
import {
    makeOfferChain,
    makePlayerInfo,
    makeView,
} from "~/game/cockroach-poker/test-helpers";
import type { CockroachPokerPlayerView } from "~/game/cockroach-poker/views";

type CockroachEnvelope =
    | { type: "cockroach_poker:state"; data: CockroachPokerPlayerView }
    | { type: "cockroach_poker:action"; data: Record<string, unknown> };

function renderRoom(
    options: {
        view?: CockroachPokerPlayerView;
        playerId?: string | null;
        isHost?: boolean;
    } = {},
) {
    const {
        view = makeView(),
        playerId = "p1",
        isHost = false,
    } = options;

    const onEndGame = vi.fn();
    const onReturnToLobby = vi.fn();
    const initialMessages: CockroachEnvelope[] = [
        { type: "cockroach_poker:state", data: view },
    ];

    const { socket, ...rest } = renderWithWs<CockroachEnvelope>(
        (ws) => (
            <CockroachPokerRoom
                roomId="room1"
                playerId={playerId}
                isHost={isHost}
                ws={ws}
                onEndGame={onEndGame}
                onReturnToLobby={onReturnToLobby}
            />
        ),
        { initialMessages },
    );

    return { ...rest, socket, onEndGame, onReturnToLobby };
}

describe("CockroachPokerRoom", () => {
    it("renders COCKROACH POKER header and phase label", () => {
        const view = makeView({ phase: "offering" });
        const { getByText } = renderRoom({ view });

        expect(getByText("COCKROACH POKER")).toBeInTheDocument();
        expect(getByText("OFFERING")).toBeInTheDocument();
    });

    it("shows WatchingPhase copy when it is not my turn", () => {
        const view = makeView({
            phase: "offering",
            isMyTurn: false,
            activePlayerId: "p2",
        });
        const { getByText } = renderRoom({ view });

        expect(getByText(/is choosing a card to offer/i)).toBeInTheDocument();
    });

    it("sends cockroach_poker:offer_card with selected card, target, and claim", () => {
        const view = makeView({
            phase: "offering",
            isMyTurn: true,
            activePlayerId: "p1",
            myHand: ["bat", "fly", "cockroach"],
        });
        const { getByRole, getAllByRole, socket } = renderRoom({ view });

        // "Bat" appears in both hand and claim row; hand card is first.
        fireEvent.click(getAllByRole("button", { name: /^bat$/i })[0]!);
        fireEvent.click(getByRole("button", { name: /^bob$/i }));
        // "Rat" is only in the claim row (not in myHand).
        fireEvent.click(getByRole("button", { name: /^rat$/i }));
        fireEvent.click(getByRole("button", { name: /offer card/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cockroach_poker:offer_card",
                playerId: "p1",
                playerName: "",
                data: { targetId: "p2", cardIndex: 0, claim: "rat" },
            },
        ]);
    });

    it("sends cockroach_poker:call_true when receiver clicks TRUE", () => {
        const view = makeView({
            phase: "awaiting_response",
            isMyTurn: true,
            myId: "p2",
            activePlayerId: "p1",
            offerChain: makeOfferChain({
                currentOffererId: "p1",
                currentReceiverId: "p2",
                currentClaim: "fly",
            }),
        });
        const { getByRole, socket } = renderRoom({
            view,
            playerId: "p2",
        });

        fireEvent.click(getByRole("button", { name: /^true$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cockroach_poker:call_true",
                playerId: "p2",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends cockroach_poker:call_false when receiver clicks FALSE", () => {
        const view = makeView({
            phase: "awaiting_response",
            isMyTurn: true,
            myId: "p2",
            activePlayerId: "p1",
            offerChain: makeOfferChain({
                currentReceiverId: "p2",
                currentClaim: "fly",
            }),
        });
        const { getByRole, socket } = renderRoom({
            view,
            playerId: "p2",
        });

        fireEvent.click(getByRole("button", { name: /^false$/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cockroach_poker:call_false",
                playerId: "p2",
                playerName: "",
                data: {},
            },
        ]);
    });

    it("sends cockroach_poker:peek_and_pass with selected target and claim", () => {
        const view = makeView({
            phase: "awaiting_response",
            isMyTurn: true,
            myId: "p2",
            activePlayerId: "p1",
            validPassTargets: ["p3"],
            offerChain: makeOfferChain({
                currentReceiverId: "p2",
                currentClaim: "fly",
                mustAccept: false,
            }),
        });
        const { getByRole, socket } = renderRoom({
            view,
            playerId: "p2",
        });

        fireEvent.click(getByRole("button", { name: /^carol$/i }));
        fireEvent.click(getByRole("button", { name: /^spider$/i }));
        fireEvent.click(getByRole("button", { name: /peek & pass/i }));

        expect(socket.sentMessages).toEqual([
            {
                type: "cockroach_poker:peek_and_pass",
                playerId: "p2",
                playerName: "",
                data: { targetId: "p3", newClaim: "spider" },
            },
        ]);
    });

    it("shows END button only for host during active play", () => {
        const guest = renderRoom({ isHost: false });
        expect(guest.queryByRole("button", { name: /^end$/i })).toBeNull();

        const host = renderRoom({
            view: makeView(),
            isHost: true,
        });
        fireEvent.click(host.getByRole("button", { name: /^end$/i }));
        expect(host.onEndGame).toHaveBeenCalledTimes(1);
    });

    it("renders GAME OVER panel with RETURN TO LOBBY for host", () => {
        const view = makeView({
            phase: "game_over",
            loserId: "p2",
            loseReason: "four_of_a_kind",
        });
        const { getByText, getByRole, onReturnToLobby } = renderRoom({
            view,
            isHost: true,
        });

        expect(getByText("GAME OVER")).toBeInTheDocument();
        expect(getByText("YOU WIN")).toBeInTheDocument();
        fireEvent.click(getByRole("button", { name: /return to lobby/i }));
        expect(onReturnToLobby).toHaveBeenCalledTimes(1);
    });

    it("reactively updates UI on incoming cockroach_poker:state", () => {
        const { getByText, socket } = renderRoom({
            view: makeView({ phase: "offering" }),
        });
        expect(getByText("OFFERING")).toBeInTheDocument();

        socket.emit({
            type: "cockroach_poker:state",
            data: makeView({
                phase: "awaiting_response",
                isMyTurn: false,
                activePlayerId: "p2",
                offerChain: makeOfferChain(),
            }),
        });

        expect(getByText("RESPONDING")).toBeInTheDocument();
    });
});
