import { goFishRegistration } from "~/game/go-fish/adapter";
import { pokerRegistration } from "~/game/poker/adapter";
import { blackjackRegistration } from "~/game/blackjack/adapter";
import { yahtzeeRegistration } from "~/game/yahtzee/adapter";
import { perudoRegistration } from "~/game/perudo/adapter";
import { rpsEngineRegistration as rpsRegistration } from "~/game/rps/engine-adapter";
import { herdRegistration } from "~/game/herd/adapter";
import { funFactsRegistration } from "~/game/fun-facts/adapter";
import { cheeseThiefRegistration } from "~/game/cheese-thief/adapter";
import { cockroachPokerRegistration } from "~/game/cockroach-poker/adapter";
import { flip7Registration } from "~/game/flip-7/adapter";
import { skullRegistration } from "~/game/skull/adapter";
import { spicyRegistration } from "~/game/spicy/adapter";
import type {
    GameAdapter,
    GameAdapterContext,
    GameAdapterRegistration,
} from "~/game/shared/game-adapter-types";

export type { GameAdapter, GameAdapterContext };
export type { GameAdapterRegistration };

const REGISTRATIONS = [
    goFishRegistration,
    pokerRegistration,
    blackjackRegistration,
    yahtzeeRegistration,
    perudoRegistration,
    rpsRegistration,
    herdRegistration,
    funFactsRegistration,
    cheeseThiefRegistration,
    cockroachPokerRegistration,
    flip7Registration,
    skullRegistration,
    spicyRegistration,
] as const;

const REGISTRY: Record<
    string,
    (
        gameType: string,
        stateRef: { current: unknown },
        adapterCtx?: GameAdapterContext,
    ) => GameAdapter
> = {};

for (const reg of REGISTRATIONS) {
    for (const gt of reg.gameTypes) {
        REGISTRY[gt] = reg.create as (
            gameType: string,
            stateRef: { current: unknown },
            adapterCtx?: GameAdapterContext,
        ) => GameAdapter;
    }
}

export function createGameAdapter(
    gameType: string,
    stateRef: { current: unknown },
    adapterCtx?: GameAdapterContext,
): GameAdapter | null {
    const create = REGISTRY[gameType];
    return create ? create(gameType, stateRef, adapterCtx) : null;
}
