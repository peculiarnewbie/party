import type { Schema } from "effect";

export type SchemaType<S extends Schema.Top> = S["Type"];
