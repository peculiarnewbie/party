import { Component, createSignal, onMount, For, Show } from "solid-js";
import { Player } from "~/game";

type PlayerAnswer = {
    player: Player;
    answer: string;
};

const AnswerButton: Component<{
    answer: string;
    label: string;
    playerAnswer: string | null;
    onSubmit: (answer: string) => void;
}> = (props) => (
    <button
        onClick={() => props.onSubmit(props.answer)}
        disabled={props.playerAnswer !== null}
        class="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
    >
        {props.label}
    </button>
);

export const SampleQuizRoom: Component<{
    roomId: string;
    playerId: string | null;
    isHost: boolean;
}> = (props) => {
    const [playerAnswer, setPlayerAnswer] = createSignal<string | null>(null);
    const [playerAnswers, setPlayerAnswers] = createSignal<PlayerAnswer[]>([]);
    let ws: WebSocket;

    onMount(() => {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        const wsUrl = `${protocol}//${host}/api/room/${props.roomId}`;

        ws = new WebSocket(wsUrl);
        ws.onmessage = (e) => {
            const json = JSON.parse(e.data);
            if (json.type === "player_answered") {
                const players = json.data.players as Player[];
                const answers = json.data.answers as Record<string, string>;
                setPlayerAnswers(
                    players
                        .filter((p: Player) => answers[p.id])
                        .map((p: Player) => ({
                            player: p,
                            answer: answers[p.id],
                        })),
                );
            }
        };
    });

    const submitAnswer = (answer: string) => {
        setPlayerAnswer(answer);
        ws.send(
            JSON.stringify({
                playerId: props.playerId,
                playerName: "",
                type: "answer",
                data: { answer },
            }),
        );
    };

    return (
        <div class="p-8">
            <h1 class="text-2xl font-bold mb-4">this is a sample question</h1>
            <div class="flex gap-2 mb-6">
                <AnswerButton
                    answer="a"
                    label="A"
                    playerAnswer={playerAnswer()}
                    onSubmit={submitAnswer}
                />
                <AnswerButton
                    answer="b"
                    label="B"
                    playerAnswer={playerAnswer()}
                    onSubmit={submitAnswer}
                />
                <AnswerButton
                    answer="c"
                    label="C"
                    playerAnswer={playerAnswer()}
                    onSubmit={submitAnswer}
                />
            </div>
            <Show when={props.isHost}>
                <div class="border-t border-gray-700 pt-4 mt-4">
                    <h2 class="font-semibold mb-2">Answers</h2>
                    <ul class="space-y-1">
                        <For each={playerAnswers()}>
                            {(pa) => (
                                <li>
                                    {pa.player.name}: {pa.answer}
                                </li>
                            )}
                        </For>
                    </ul>
                </div>
            </Show>
        </div>
    );
};
