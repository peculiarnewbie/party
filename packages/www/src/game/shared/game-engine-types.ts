import { Schema } from "effect";

import type { SchemaType } from "~/effect/schema-types";
import type { BroadcastFn, SendToFn } from "~/game/shared/game-adapter-types";
import { nonNegativeIntSchema } from "~/game/shared/wire-schemas";

const syncSnapshotEntrySchema = Schema.Struct({
    index: nonNegativeIntSchema,
    data: Schema.Unknown,
});

const syncEventEntrySchema = Schema.Struct({
    index: nonNegativeIntSchema,
    type: Schema.String,
    data: Schema.Unknown,
});

const syncHiddenEntrySchema = Schema.Struct({
    index: nonNegativeIntSchema,
    data: Schema.Unknown,
});

export const syncResponseSchema = Schema.Struct({
    snapshot: syncSnapshotEntrySchema,
    events: Schema.Array(syncEventEntrySchema),
    hidden: Schema.Array(syncHiddenEntrySchema),
});

export type SyncResponse = SchemaType<typeof syncResponseSchema>;

export interface GameEngineInit {
    broadcast: BroadcastFn;
    sendTo: SendToFn;
}

export interface GameEngine {
    initGame(
        players: { id: string; name: string }[],
        hostId: string | null,
    ): void;
    processMessage(raw: string): void;
    removePlayer(playerId: string): void;
    endGame(): void;
    sync(
        playerId: string,
        lastSnapshotIndex: number,
        lastEventIndex: number,
    ): SyncResponse;
}
