import { Schema } from "effect";

import { decodeUnknownSync, encodeJsonMessage } from "~/effect/schema-helpers";
import type { SchemaType } from "~/effect/schema-types";

import { serverMessageWithData } from "./wire-schemas";

export const gameErrorPayloadSchema = Schema.Struct({
    message: Schema.mutableKey(Schema.String),
});

export type GameErrorPayload = SchemaType<typeof gameErrorPayloadSchema>;

export function buildGameServerMessageSchema<
    const Prefix extends string,
    ViewSchema extends Schema.Top,
    ActionSchema extends Schema.Top,
    GameOverSchema extends Schema.Top,
>(config: {
    prefix: Prefix;
    playerViewSchema: ViewSchema;
    actionSchema: ActionSchema;
    gameOverSchema: GameOverSchema;
}) {
    const stateType = `${config.prefix}:state` as const;
    return Schema.Union([
        serverMessageWithData(stateType, config.playerViewSchema),
        serverMessageWithData(`${config.prefix}:action`, config.actionSchema),
        serverMessageWithData(`${config.prefix}:error`, gameErrorPayloadSchema),
        serverMessageWithData(
            `${config.prefix}:game_over`,
            config.gameOverSchema,
        ),
    ]);
}

export function buildGameServerMessageSchemaWithoutGameOver<
    const Prefix extends string,
    ViewSchema extends Schema.Top,
    ActionSchema extends Schema.Top,
>(config: {
    prefix: Prefix;
    playerViewSchema: ViewSchema;
    actionSchema: ActionSchema;
}) {
    const stateType = `${config.prefix}:state` as const;
    return Schema.Union([
        serverMessageWithData(stateType, config.playerViewSchema),
        serverMessageWithData(`${config.prefix}:action`, config.actionSchema),
        serverMessageWithData(`${config.prefix}:error`, gameErrorPayloadSchema),
    ]);
}

export function createPlayerViewDecoder<ViewSchema extends Schema.Top>(
    viewSchema: ViewSchema,
) {
    return (raw: unknown): SchemaType<ViewSchema> | null => {
        try {
            return decodeUnknownSync(viewSchema, raw);
        } catch {
            return null;
        }
    };
}

export function createServerMessageDecoder<
    ServerSchema extends Schema.Top,
    StateType extends string,
>(stateType: StateType, serverSchema: ServerSchema) {
    type ServerMessage = SchemaType<ServerSchema>;
    type SideMessage = Exclude<ServerMessage, { type: StateType }>;

    return (raw: unknown): SideMessage | null => {
        try {
            const message = decodeUnknownSync(serverSchema, raw) as ServerMessage & {
                type: string;
            };
            if (message.type === stateType) {
                return null;
            }

            return message as unknown as SideMessage;
        } catch {
            return null;
        }
    };
}

export function encodeGameServerMessage<ServerSchema extends Schema.Top>(
    serverSchema: ServerSchema,
    message: SchemaType<ServerSchema>,
): string {
    return encodeJsonMessage(serverSchema, message);
}
