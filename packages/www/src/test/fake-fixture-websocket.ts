type MessageHandler = (event: { data: string }) => void;

export interface FakeFixtureWebSocketState<TEnvelope = unknown> {
    sentMessages: unknown[];
    deliveredMessages: TEnvelope[];
}

export interface FakeFixtureWebSocketOptions<TEnvelope extends { type: string }> {
    initialMessages?: TEnvelope[];
    afterSend?: Partial<Record<string, TEnvelope[]>>;
    state?: FakeFixtureWebSocketState<TEnvelope>;
    onStateChange?: (state: FakeFixtureWebSocketState<TEnvelope>) => void;
}

export class FakeFixtureWebSocket<TEnvelope extends { type: string } = { type: string }> {
    private readonly listeners = new Set<MessageHandler>();
    private readonly initialMessages: TEnvelope[];
    private readonly afterSend: Partial<Record<string, TEnvelope[]>>;
    private readonly onStateChange?: (state: FakeFixtureWebSocketState<TEnvelope>) => void;

    readonly state: FakeFixtureWebSocketState<TEnvelope>;

    constructor(options: FakeFixtureWebSocketOptions<TEnvelope> = {}) {
        this.initialMessages = options.initialMessages ?? [];
        this.afterSend = options.afterSend ?? {};
        this.state =
            options.state ?? {
                sentMessages: [],
                deliveredMessages: [],
            };
        this.onStateChange = options.onStateChange;
    }

    addEventListener(type: string, handler: MessageHandler) {
        if (type !== "message") return;
        this.listeners.add(handler);
    }

    removeEventListener(type: string, handler: MessageHandler) {
        if (type !== "message") return;
        this.listeners.delete(handler);
    }

    send(rawMessage: string) {
        let parsedMessage: unknown = rawMessage;
        try {
            parsedMessage = JSON.parse(rawMessage);
        } catch {
            parsedMessage = rawMessage;
        }

        this.state.sentMessages.push(parsedMessage);
        this.onStateChange?.(this.state);

        const messageType =
            typeof parsedMessage === "object" &&
            parsedMessage !== null &&
            "type" in parsedMessage &&
            typeof (parsedMessage as { type: unknown }).type === "string"
                ? (parsedMessage as { type: string }).type
                : null;

        if (!messageType) return;

        const nextMessages = this.afterSend[messageType] ?? [];
        for (const message of nextMessages) {
            this.emit(message);
        }
    }

    start() {
        for (const message of this.initialMessages) {
            this.emit(message);
        }
    }

    emit(message: TEnvelope) {
        this.state.deliveredMessages.push(message);
        this.onStateChange?.(this.state);

        const event = { data: JSON.stringify(message) };
        for (const listener of this.listeners) {
            listener(event);
        }
    }

    get sentMessages(): readonly unknown[] {
        return this.state.sentMessages;
    }

    get deliveredMessages(): readonly TEnvelope[] {
        return this.state.deliveredMessages;
    }
}
