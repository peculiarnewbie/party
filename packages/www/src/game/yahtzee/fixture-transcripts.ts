import { getPlayerView } from "./views";
import { getTotalScore } from "./engine";
import { getDefaultFixturePlayerId, getYahtzeeFixture } from "./fixtures";
import type {
    FinalScore,
    YahtzeeResult,
    YahtzeeState,
} from "./types";
import type { YahtzeeFixtureId } from "./fixtures";

export type YahtzeeFixtureEnvelope =
    | {
          type: "yahtzee:state";
          data: ReturnType<typeof getPlayerView>;
      }
    | {
          type: "yahtzee:action";
          data: YahtzeeResult;
      }
    | {
          type: "yahtzee:game_over";
          data: {
              winners: string[];
              finalScores: FinalScore[];
          };
      };

export interface YahtzeeFixtureTranscript {
    fixtureId: YahtzeeFixtureId;
    playerId: string;
    roomId: string;
    title: string;
    hostPlayerId: string;
    initialMessages: YahtzeeFixtureEnvelope[];
    afterSend: Partial<Record<string, YahtzeeFixtureEnvelope[]>>;
}

function buildStateMessage(
    state: YahtzeeState,
    playerId: string,
): YahtzeeFixtureEnvelope {
    return {
        type: "yahtzee:state",
        data: getPlayerView(state, playerId),
    };
}

function buildFinalScores(state: YahtzeeState): FinalScore[] {
    return state.players.map((player) => ({
        playerId: player.id,
        playerName: player.name,
        total: getTotalScore(player),
    }));
}

export function buildFixtureTranscript(
    fixtureId: YahtzeeFixtureId,
    playerId = getDefaultFixturePlayerId(fixtureId),
): YahtzeeFixtureTranscript {
    const fixture = getYahtzeeFixture(fixtureId);
    const initialMessages: YahtzeeFixtureEnvelope[] = [];
    const afterSend: Partial<Record<string, YahtzeeFixtureEnvelope[]>> = {};

    if (
        fixtureId === "lying-reveal-caught-lying" ||
        fixtureId === "lying-reveal-truthful-challenge"
    ) {
        initialMessages.push(buildStateMessage(fixture.state, playerId));
        const reveal = fixture.state.lastTurnReveal;
        if (reveal) {
            initialMessages.push({
                type: "yahtzee:action",
                data: {
                    ...reveal,
                    type: "claim_resolved",
                    points:
                        reveal.outcome === "caught_lying"
                            ? -reveal.claimedPoints
                            : reveal.claimedPoints,
                    yahtzeeBonus: false,
                },
            });
        }
    } else {
        initialMessages.push(buildStateMessage(fixture.state, playerId));
    }

    if (fixture.state.phase === "game_over" && fixture.state.winners) {
        initialMessages.push({
            type: "yahtzee:game_over",
            data: {
                winners: fixture.state.winners,
                finalScores: buildFinalScores(fixture.state),
            },
        });
    }

    if (fixtureId === "standard-my-turn-pre-roll") {
        const afterRollFixture = getYahtzeeFixture("standard-my-turn-after-roll");
        afterSend["yahtzee:roll"] = [
            {
                type: "yahtzee:action",
                data: {
                    type: "rolled",
                    playerId,
                    dice: [...afterRollFixture.state.dice],
                },
            },
            buildStateMessage(afterRollFixture.state, playerId),
        ];
    }

    if (fixtureId === "lying-opponent-awaiting-response") {
        const acceptedState = structuredClone(
            getYahtzeeFixture("lying-reveal-truthful-challenge").state,
        ) as YahtzeeState;
        acceptedState.players[0].scorecard.full_house = 25;
        acceptedState.players[1].penaltyPoints = 0;
        acceptedState.lastTurnReveal = {
            playerId: "p1",
            category: "full_house",
            actualDice: [2, 2, 2, 5, 5],
            claimedDice: [2, 2, 5, 5, 5],
            claimedPoints: 25,
            outcome: "accepted",
            penaltyPlayerId: null,
            penaltyPoints: 0,
        };
        const caughtLyingFixture = getYahtzeeFixture("lying-reveal-caught-lying");
        const acceptReveal = acceptedState.lastTurnReveal!;

        afterSend["yahtzee:accept_claim"] = [
            {
                type: "yahtzee:action",
                data: {
                    ...acceptReveal,
                    type: "claim_resolved",
                    points: acceptReveal.claimedPoints,
                    yahtzeeBonus: false,
                },
            },
            buildStateMessage(acceptedState, playerId),
        ];

        afterSend["yahtzee:challenge_claim"] = [
            {
                type: "yahtzee:action",
                data: {
                    ...caughtLyingFixture.state.lastTurnReveal!,
                    type: "claim_resolved",
                    points:
                        -caughtLyingFixture.state.lastTurnReveal!.claimedPoints,
                    yahtzeeBonus: false,
                },
            },
            buildStateMessage(caughtLyingFixture.state, playerId),
        ];
    }

    if (fixtureId === "lying-my-turn-claiming") {
        const responseFixture = getYahtzeeFixture("lying-opponent-awaiting-response");
        afterSend["yahtzee:claim"] = [
            {
                type: "yahtzee:action",
                data: {
                    type: "claim_submitted",
                    playerId,
                    category: "full_house",
                    claimedDice: [2, 2, 5, 5, 5],
                    claimedPoints: 25,
                },
            },
            buildStateMessage(responseFixture.state, playerId),
        ];
    }

    return {
        fixtureId,
        playerId,
        roomId: fixture.roomId,
        title: fixture.title,
        hostPlayerId: fixture.hostPlayerId,
        initialMessages,
        afterSend,
    };
}
