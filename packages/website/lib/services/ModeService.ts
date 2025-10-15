import { Context, type Effect } from "effect"

export type Mode = "light" | "dark"

export interface ModeServiceType {
	getMode: Effect.Effect<Mode, never>
	setMode: (mode: Mode) => Effect.Effect<void, never>
	toggleMode: Effect.Effect<Mode, never>
}

export class ModeService extends Context.Tag("ModeService")<
	ModeService,
	ModeServiceType
>() {}
