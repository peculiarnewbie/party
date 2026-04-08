import { DurableObject } from "cloudflare:workers";
import { GameState, isPokerGameType, server } from "~/game";
import { goFishClientMessageSchema, goFishServer, type GoFishState } from "~/game/go-fish";
import {
    pokerClientMessageSchema,
    pokerServer,
    type PokerState,
} from "~/game/poker";
import {
    blackjackClientMessageSchema,
    blackjackServer,
    type BlackjackState,
} from "~/game/blackjack";
import {
    yahtzeeClientMessageSchema,
    yahtzeeServer,
    type YahtzeeState,
} from "~/game/yahtzee";

function getPokerVisibilityMode(gameType: GameState["activeGameType"]) {
    return gameType === "backwards_poker" ? "backwards" : "standard";
}

function getYahtzeeMode(gameType: GameState["activeGameType"]) {
    return gameType === "lying_yahtzee" ? "lying" : "standard";
}

export class GameRoom extends DurableObject {
    sessions: Map<WebSocket, { id: string; playerId: string | null }>;
    state: GameState;
    goFishState: { current: GoFishState | null };
    pokerState: { current: PokerState | null };
    blackjackState: { current: BlackjackState | null };
    yahtzeeState: { current: YahtzeeState | null };
    nextHandTimer: ReturnType<typeof setTimeout> | null;

    constructor(ctx: DurableObjectState, env: Env) {
        super(ctx, env);
        this.sessions = new Map();
        this.state = {
            players: [],
            hostId: null,
            answers: {},
            phase: "lobby",
            selectedGameType: "quiz",
            activeGameType: null,
        };
        this.goFishState = { current: null };
        this.pokerState = { current: null };
        this.blackjackState = { current: null };
        this.yahtzeeState = { current: null };
        this.nextHandTimer = null;
    }

    clearNextHandTimer() {
        if (this.nextHandTimer) {
            clearTimeout(this.nextHandTimer);
            this.nextHandTimer = null;
        }
    }

    async fetch(request: Request): Promise<Response> {
        const webSocketPair = new WebSocketPair();
        const [client, serverWs] = Object.values(webSocketPair);

        serverWs.accept();

        const id = crypto.randomUUID();
        this.sessions.set(serverWs, { id, playerId: null });

        serverWs.send(
            JSON.stringify({
                type: "room_state",
                data: server(this.state).getRoomState(),
            }),
        );

        const broadcast = (msg: string) => {
            this.sessions.forEach((_, ws) => ws.send(msg));
        };

        const sendTo = (playerId: string, msg: string) => {
            this.sessions.forEach((session, ws) => {
                if (session.playerId === playerId) ws.send(msg);
            });
        };

        const schedulePokerNextHand = () => {
            this.clearNextHandTimer();
            this.nextHandTimer = setTimeout(() => {
                this.nextHandTimer = null;
                pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(this.state.activeGameType),
                }).startNextHand(broadcast, sendTo);
            }, 4500);
        };

        const scheduleBlackjackNextRound = () => {
            this.clearNextHandTimer();
            this.nextHandTimer = setTimeout(() => {
                this.nextHandTimer = null;
                blackjackServer(this.blackjackState, {
                    scheduleNextRound: scheduleBlackjackNextRound,
                }).startNextRound(broadcast, sendTo);
            }, 5000);
        };

        serverWs.addEventListener("message", async (event) => {
            const raw = event.data as string;
            let json: any;
            try {
                json = JSON.parse(raw);
            } catch {
                return;
            }

            if (json.type === "join" && json.playerId) {
                const session = this.sessions.get(serverWs);
                if (session) session.playerId = json.playerId;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("go_fish:")
            ) {
                const parsed = goFishClientMessageSchema.safeParse(json);
                if (!parsed.success) return;
                goFishServer(this.goFishState).processMessage(
                    parsed.data,
                    broadcast,
                    sendTo,
                );
                return;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("poker:")
            ) {
                const parsed = pokerClientMessageSchema.safeParse(json);
                if (!parsed.success) return;
                pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(this.state.activeGameType),
                }).processMessage(parsed.data, broadcast, sendTo);
                return;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("blackjack:")
            ) {
                const parsed = blackjackClientMessageSchema.safeParse(json);
                if (!parsed.success) return;
                blackjackServer(this.blackjackState, {
                    scheduleNextRound: scheduleBlackjackNextRound,
                }).processMessage(parsed.data, broadcast, sendTo);
                return;
            }

            if (
                typeof json.type === "string" &&
                json.type.startsWith("yahtzee:")
            ) {
                const parsed = yahtzeeClientMessageSchema.safeParse(json);
                if (!parsed.success) return;
                yahtzeeServer(this.yahtzeeState).processMessage(
                    parsed.data,
                    broadcast,
                    sendTo,
                );
                return;
            }

            const wasPoker = isPokerGameType(this.state.activeGameType);
            const currentPokerState = this.pokerState.current;
            const wasSeatedPokerPlayer =
                wasPoker &&
                !!currentPokerState?.players.some(
                    (player) => player.id === json.playerId,
                );

            const processResult = await server(this.state).processMessage(
                raw,
                broadcast,
            );

            if (json.type === "join" && isPokerGameType(this.state.activeGameType)) {
                const poker = pokerServer(this.pokerState, {
                    scheduleNextHand: schedulePokerNextHand,
                    visibilityMode: getPokerVisibilityMode(this.state.activeGameType),
                });
                if (wasSeatedPokerPlayer) {
                    poker.reconnectPlayer(
                        {
                            id: json.playerId,
                            name: json.playerName,
                        },
                        broadcast,
                        sendTo,
                    );
                } else {
                    poker.addSpectator(
                        {
                            id: json.playerId,
                            name: json.playerName,
                        },
                        broadcast,
                        sendTo,
                    );
                }
            }

            if (processResult.kind === "start") {
                this.clearNextHandTimer();
                if (processResult.gameType === "go_fish") {
                    const players = this.state.players.map((player) => ({
                        id: player.id,
                        name: player.name,
                    }));
                    this.pokerState.current = null;
                    goFishServer(this.goFishState).initGame(
                        players,
                        broadcast,
                        sendTo,
                    );
                } else if (isPokerGameType(processResult.gameType)) {
                    const players = this.state.players.map((player) => ({
                        id: player.id,
                        name: player.name,
                    }));
                    this.goFishState.current = null;
                    pokerServer(this.pokerState, {
                        scheduleNextHand: schedulePokerNextHand,
                        visibilityMode: getPokerVisibilityMode(processResult.gameType),
                    }).initGame(players, broadcast, sendTo);
                } else if (processResult.gameType === "blackjack") {
                    const players = this.state.players.map((player) => ({
                        id: player.id,
                        name: player.name,
                    }));
                    this.goFishState.current = null;
                    this.pokerState.current = null;
                    blackjackServer(this.blackjackState, {
                        scheduleNextRound: scheduleBlackjackNextRound,
                    }).initGame(players, broadcast, sendTo);
                } else if (
                    processResult.gameType === "yahtzee" ||
                    processResult.gameType === "lying_yahtzee"
                ) {
                    const players = this.state.players.map((player) => ({
                        id: player.id,
                        name: player.name,
                    }));
                    this.goFishState.current = null;
                    this.pokerState.current = null;
                    this.blackjackState.current = null;
                    yahtzeeServer(this.yahtzeeState, {
                        mode: getYahtzeeMode(processResult.gameType),
                    }).initGame(
                        players,
                        broadcast,
                        sendTo,
                    );
                } else {
                    this.goFishState.current = null;
                    this.pokerState.current = null;
                    this.blackjackState.current = null;
                    this.yahtzeeState.current = null;
                }
                return;
            }

            if (processResult.kind === "end") {
                if (isPokerGameType(processResult.gameType)) {
                    this.clearNextHandTimer();
                    pokerServer(this.pokerState, {
                        scheduleNextHand: schedulePokerNextHand,
                        visibilityMode: getPokerVisibilityMode(processResult.gameType),
                    }).endGame(broadcast, sendTo);
                }
                if (processResult.gameType === "blackjack") {
                    this.clearNextHandTimer();
                }
                return;
            }

            if (processResult.kind === "return_to_lobby") {
                this.clearNextHandTimer();
                this.goFishState.current = null;
                this.pokerState.current = null;
                this.blackjackState.current = null;
                this.yahtzeeState.current = null;
            }
        });

        serverWs.addEventListener("close", () => {
            const session = this.sessions.get(serverWs);
            this.sessions.delete(serverWs);

            if (!session?.playerId) return;
            if (!isPokerGameType(this.state.activeGameType)) return;

            pokerServer(this.pokerState, {
                scheduleNextHand: schedulePokerNextHand,
                visibilityMode: getPokerVisibilityMode(this.state.activeGameType),
            }).disconnectPlayer(session.playerId, broadcast, sendTo);
        });

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }
}
