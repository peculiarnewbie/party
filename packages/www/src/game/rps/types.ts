import type { BestOf, RpsChoice } from "./schemas";

export type {
    RpsChoice,
    BestOf,
    RpsPhase,
    RpsPlayer,
    RpsThrow,
    RpsMatch,
    RpsRound,
    RpsState,
    RpsResult,
} from "./schemas";

export type RpsAction =
    | { type: "throw"; playerId: string; choice: RpsChoice }
    | { type: "next_round"; playerId: string }
    | { type: "set_best_of"; bestOf: BestOf };
