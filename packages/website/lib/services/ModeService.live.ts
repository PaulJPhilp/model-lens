import { Effect, Layer } from "effect"
import { type Mode, ModeService } from "./ModeService"

export const ModeServiceLive = Layer.succeed(ModeService, {
	getMode: Effect.sync(() => {
		const stored = localStorage.getItem("mode")
		if (stored === "light" || stored === "dark") return stored
		return window.matchMedia("(prefers-color-scheme: dark)").matches
			? "dark"
			: "light"
	}),
	setMode: (mode: Mode) =>
		Effect.sync(() => {
			document.documentElement.classList.toggle("dark", mode === "dark")
			localStorage.setItem("mode", mode)
		}),
	toggleMode: Effect.sync(() => {
		const current = localStorage.getItem("mode") === "dark" ? "dark" : "light"
		const newMode = current === "light" ? "dark" : "light"
		document.documentElement.classList.toggle("dark", newMode === "dark")
		localStorage.setItem("mode", newMode)
		return newMode
	}),
})
