import { PlayingCard } from "./playing-card";

export type SpadeRank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export function SpadeCard(props: { rank: SpadeRank; size?: number }) {
    return <PlayingCard suit="spade" rank={props.rank} size={props.size} />;
}
