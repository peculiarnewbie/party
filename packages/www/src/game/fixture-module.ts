import type { Component } from "solid-js";

export interface FixtureMeta<TFixtureId extends string = string> {
    id: TFixtureId;
    description: string;
    primaryPlayerId: string;
}

export interface HarnessProps<TFixtureId extends string = string> {
    fixtureId: TFixtureId;
    playerId: string;
    step?: number;
}

export interface GameFixtureModule<TFixtureId extends string = string> {
    game: string;
    title: string;
    fixtures: Record<TFixtureId, FixtureMeta<TFixtureId>>;
    defaultFixtureId: TFixtureId;
    playerIds: readonly string[];
    Harness: Component<HarnessProps<TFixtureId>>;
}
