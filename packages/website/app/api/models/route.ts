import "server-only"
import { Effect, pipe } from "effect"
import { NextResponse } from "next/server"
import { ModelDataService } from "../../../lib/services/ModelDataService"
import { ModelDataServiceLive } from "../../../lib/services/ModelDataServiceLive"

export async function GET() {
	console.log("API route called")
	const getModels = Effect.flatMap(ModelDataService, (service) =>
		service.getLatestModels(),
	)

	const program = pipe(getModels, Effect.provide(ModelDataServiceLive))

	try {
		const models = await Effect.runPromise(program)
		console.log("Models fetched successfully")
		return NextResponse.json(models)
	} catch (error) {
		console.error("Error in API route:", error)
		return NextResponse.json(
			{ error: "Failed to fetch models" },
			{ status: 500 },
		)
	}
}
