import type { GameFixtureModule } from "~/game/fixture-module";

const modules = import.meta.glob<{
    gameFixtureModule?: GameFixtureModule;
}>("../../game/*/fixtures.ts", { eager: true });

export const fixtureModules: GameFixtureModule[] = Object.values(modules)
    .map((module) => module.gameFixtureModule)
    .filter((fixtureModule): fixtureModule is GameFixtureModule =>
        Boolean(fixtureModule),
    )
    .sort((a, b) => a.title.localeCompare(b.title));

export function getFixtureModule(game: string): GameFixtureModule | undefined {
    return fixtureModules.find((module) => module.game === game);
}
