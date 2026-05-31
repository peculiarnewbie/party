import { Schema } from "effect";

export const rpsChoices = ["rock", "paper", "scissors"] as const;
export const rpsBestOfValues = [1, 3, 5] as const;
export const rpsPhases = ["throwing", "round_results", "tournament_over"] as const;

export const rpsChoiceSchema = Schema.Literals(rpsChoices);
export const rpsBestOfSchema = Schema.Literals(rpsBestOfValues);
