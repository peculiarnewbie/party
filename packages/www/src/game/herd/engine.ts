import type {
    HerdState,
    HerdPlayer,
    HerdAction,
    HerdResult,
    AnswerGroup,
    RoundResult,
} from "./types";
import { QUESTION_BANK } from "./questions";

function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

export function normalizeAnswer(answer: string): string {
    return answer.trim().toLowerCase();
}

export function buildAnswerGroups(
    answers: Record<string, string>,
    startGroupId: number,
): { groups: AnswerGroup[]; nextGroupId: number } {
    const grouped = new Map<string, { playerIds: string[]; originals: Record<string, string> }>();

    for (const [playerId, answer] of Object.entries(answers)) {
        const normalized = normalizeAnswer(answer);
        const existing = grouped.get(normalized);
        if (existing) {
            existing.playerIds.push(playerId);
            existing.originals[playerId] = answer;
        } else {
            grouped.set(normalized, {
                playerIds: [playerId],
                originals: { [playerId]: answer },
            });
        }
    }

    let nextId = startGroupId;
    const groups: AnswerGroup[] = [];

    for (const [normalized, data] of grouped) {
        const firstPlayerAnswer = data.originals[data.playerIds[0]];
        groups.push({
            id: `g${nextId}`,
            canonicalAnswer: firstPlayerAnswer ?? normalized,
            playerIds: data.playerIds,
            originalAnswers: data.originals,
        });
        nextId++;
    }

    groups.sort((a, b) => b.playerIds.length - a.playerIds.length);

    return { groups, nextGroupId: nextId };
}

export function initGame(
    players: { id: string; name: string }[],
    hostId: string,
    opts?: { winScore?: number; pinkCowEnabled?: boolean },
): HerdState {
    const herdPlayers: HerdPlayer[] = players
        .filter((p) => p.id !== hostId)
        .map((p) => ({
            id: p.id,
            name: p.name,
            score: 0,
            hasPinkCow: false,
        }));

    const shuffledQuestions = shuffle([...QUESTION_BANK]);

    return {
        players: herdPlayers,
        hostId,
        phase: "waiting",
        roundNumber: 0,
        currentQuestion: null,
        questionIndex: 0,
        shuffledQuestions,
        answers: {},
        answerGroups: [],
        nextGroupId: 0,
        lastRoundResult: null,
        pinkCowEnabled: opts?.pinkCowEnabled ?? false,
        pinkCowHolder: null,
        winnerId: null,
        winScore: opts?.winScore ?? 8,
    };
}

export function processAction(
    state: HerdState,
    action: HerdAction,
): HerdResult {
    if (action.type === "toggle_pink_cow") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can toggle pink cow" };
        }
        if (state.phase !== "waiting") {
            return { type: "error", message: "Can only toggle pink cow between rounds" };
        }
        state.pinkCowEnabled = action.enabled;
        if (!action.enabled) {
            state.pinkCowHolder = null;
            for (const player of state.players) {
                player.hasPinkCow = false;
            }
        }
        return { type: "pink_cow_toggled", enabled: action.enabled };
    }

    if (action.type === "next_question") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can advance questions" };
        }
        if (state.phase !== "waiting") {
            return { type: "error", message: "Not in waiting phase" };
        }

        let question: string;
        if (action.customQuestion && action.customQuestion.trim().length > 0) {
            question = action.customQuestion.trim();
        } else {
            if (state.shuffledQuestions.length === 0) {
                state.shuffledQuestions = shuffle([...QUESTION_BANK]);
                state.questionIndex = 0;
            }
            question =
                state.shuffledQuestions[
                    state.questionIndex % state.shuffledQuestions.length
                ];
            state.questionIndex++;
        }

        state.currentQuestion = question;
        state.roundNumber++;
        state.answers = {};
        state.answerGroups = [];
        state.lastRoundResult = null;
        state.phase = "answering";

        return {
            type: "question_started",
            question,
            roundNumber: state.roundNumber,
        };
    }

    if (action.type === "submit_answer") {
        if (state.phase !== "answering") {
            return { type: "error", message: "Not in answering phase" };
        }
        const player = state.players.find((p) => p.id === action.playerId);
        if (!player) {
            return { type: "error", message: "Player not in game" };
        }
        if (action.answer.trim().length === 0) {
            return { type: "error", message: "Answer cannot be empty" };
        }

        state.answers[action.playerId] = action.answer.trim();

        const answeredCount = Object.keys(state.answers).length;
        return {
            type: "answer_submitted",
            playerId: action.playerId,
            answeredCount,
            totalPlayers: state.players.length,
        };
    }

    if (action.type === "close_answers") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can close answers" };
        }
        if (state.phase !== "answering") {
            return { type: "error", message: "Not in answering phase" };
        }

        const { groups, nextGroupId } = buildAnswerGroups(
            state.answers,
            state.nextGroupId,
        );
        state.answerGroups = groups;
        state.nextGroupId = nextGroupId;
        state.phase = "reveal";

        return { type: "answers_closed", groups };
    }

    if (action.type === "merge_groups") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can merge groups" };
        }
        if (state.phase !== "reveal") {
            return { type: "error", message: "Not in reveal phase" };
        }

        const group1 = state.answerGroups.find(
            (g) => g.id === action.groupId1,
        );
        const group2 = state.answerGroups.find(
            (g) => g.id === action.groupId2,
        );

        if (!group1 || !group2) {
            return { type: "error", message: "Group not found" };
        }
        if (group1.id === group2.id) {
            return { type: "error", message: "Cannot merge a group with itself" };
        }

        group1.playerIds.push(...group2.playerIds);
        Object.assign(group1.originalAnswers, group2.originalAnswers);

        state.answerGroups = state.answerGroups.filter(
            (g) => g.id !== group2.id,
        );
        state.answerGroups.sort(
            (a, b) => b.playerIds.length - a.playerIds.length,
        );

        return { type: "groups_merged", groups: state.answerGroups };
    }

    if (action.type === "confirm_scoring") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can confirm scoring" };
        }
        if (state.phase !== "reveal") {
            return { type: "error", message: "Not in reveal phase" };
        }

        const result = calculateScoring(state);
        state.lastRoundResult = result;

        for (const playerId of result.scoringPlayerIds) {
            const player = state.players.find((p) => p.id === playerId);
            if (player) player.score++;
        }

        if (state.pinkCowEnabled && result.pinkCowPlayerId) {
            if (state.pinkCowHolder) {
                const oldHolder = state.players.find(
                    (p) => p.id === state.pinkCowHolder,
                );
                if (oldHolder) oldHolder.hasPinkCow = false;
            }
            state.pinkCowHolder = result.pinkCowPlayerId;
            const newHolder = state.players.find(
                (p) => p.id === result.pinkCowPlayerId,
            );
            if (newHolder) newHolder.hasPinkCow = true;
        }

        const winner = state.players.find(
            (p) =>
                p.score >= state.winScore &&
                (!state.pinkCowEnabled || !p.hasPinkCow),
        );

        if (winner) {
            state.phase = "game_over";
            state.winnerId = winner.id;
            return { type: "game_over", winnerId: winner.id };
        }

        state.phase = "scored";
        return { type: "scoring_confirmed", result };
    }

    if (action.type === "next_round") {
        if (action.hostId !== state.hostId) {
            return { type: "error", message: "Only the host can advance rounds" };
        }
        if (state.phase !== "scored") {
            return { type: "error", message: "Not in scored phase" };
        }

        state.phase = "waiting";
        return { type: "round_advanced" };
    }

    return { type: "error", message: "Unknown action" };
}

function calculateScoring(state: HerdState): RoundResult {
    const groups = state.answerGroups;
    const question = state.currentQuestion ?? "";

    if (groups.length === 0) {
        return {
            question,
            groups: [],
            majorityGroupId: null,
            majorityCount: 0,
            scoringPlayerIds: [],
            pinkCowPlayerId: null,
            pinkCowPreviousHolder: null,
        };
    }

    const maxCount = Math.max(...groups.map((g) => g.playerIds.length));
    const maxGroups = groups.filter((g) => g.playerIds.length === maxCount);

    let majorityGroupId: string | null = null;
    let scoringPlayerIds: string[] = [];

    if (maxGroups.length === 1) {
        majorityGroupId = maxGroups[0].id;
        scoringPlayerIds = [...maxGroups[0].playerIds];
    }

    let pinkCowPlayerId: string | null = null;
    if (state.pinkCowEnabled) {
        const singlePlayerGroups = groups.filter(
            (g) => g.playerIds.length === 1,
        );
        if (singlePlayerGroups.length === 1) {
            pinkCowPlayerId = singlePlayerGroups[0].playerIds[0];
        }
    }

    return {
        question,
        groups,
        majorityGroupId,
        majorityCount: maxCount,
        scoringPlayerIds,
        pinkCowPlayerId,
        pinkCowPreviousHolder: state.pinkCowHolder,
    };
}

export function removePlayer(
    state: HerdState,
    playerId: string,
): HerdResult | null {
    const playerIndex = state.players.findIndex((p) => p.id === playerId);
    if (playerIndex < 0) return null;

    const player = state.players[playerIndex];

    if (player.hasPinkCow) {
        state.pinkCowHolder = null;
    }

    state.players.splice(playerIndex, 1);

    delete state.answers[playerId];

    for (const group of state.answerGroups) {
        group.playerIds = group.playerIds.filter((id) => id !== playerId);
        delete group.originalAnswers[playerId];
    }
    state.answerGroups = state.answerGroups.filter(
        (g) => g.playerIds.length > 0,
    );

    if (state.players.length <= 1) {
        state.phase = "game_over";
        state.winnerId = state.players[0]?.id ?? null;
        return {
            type: "game_over",
            winnerId: state.winnerId ?? "",
        };
    }

    return null;
}

export function endGameByHost(state: HerdState): HerdResult {
    state.phase = "game_over";

    const eligible = state.players
        .filter((p) => !state.pinkCowEnabled || !p.hasPinkCow)
        .sort((a, b) => b.score - a.score);

    const winner = eligible[0] ?? state.players.sort((a, b) => b.score - a.score)[0];

    state.winnerId = winner?.id ?? null;
    return { type: "game_over", winnerId: state.winnerId ?? "" };
}
