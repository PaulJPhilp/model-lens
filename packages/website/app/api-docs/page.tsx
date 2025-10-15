"use client"

import { useEffect, useId } from "react"

export default function ApiDocsPage() {
	const swaggerId = useId()

	useEffect(() => {
		// Load Swagger UI dynamically
		const script = document.createElement("script")
		script.src = "https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"
		script.onload = () => {
			// @ts-expect-error
			if (window.SwaggerUIBundle) {
				// @ts-expect-error
				window.SwaggerUIBundle({
					url: "/docs/api/openapi.yaml",
					dom_id: `#${swaggerId}`,
					presets: [
						// @ts-expect-error
						window.SwaggerUIBundle.presets.apis,
						// @ts-expect-error
						window.SwaggerUIBundle.presets.standalone,
					],
					layout: "StandaloneLayout",
					deepLinking: true,
					showExtensions: true,
					showCommonExtensions: true,
					tryItOutEnabled: true,
					requestInterceptor: (request: Request) => {
						// Add any custom request modifications here
						return request
					},
				})
			}
		}
		document.head.appendChild(script)

		const link = document.createElement("link")
		link.rel = "stylesheet"
		link.href = "https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css"
		document.head.appendChild(link)

		return () => {
			document.head.removeChild(script)
			document.head.removeChild(link)
		}
	}, [swaggerId])

	return (
		<div className="min-h-screen bg-white">
			<div className="container mx-auto px-4 py-8">
				<div className="mb-6">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						ModelLens API Documentation
					</h1>
					<p className="text-gray-600">
						Interactive API documentation for the ModelLens API endpoints
					</p>
				</div>

				<div className="bg-white border border-gray-200 rounded-lg shadow-sm">
					<div id={swaggerId} className="swagger-ui"></div>
				</div>

				<div className="mt-8 p-6 bg-blue-50 rounded-lg">
					<h2 className="text-xl font-semibold text-blue-900 mb-3">
						API Endpoints Overview
					</h2>
					<div className="space-y-3 text-blue-800">
						<div>
							<strong>GET /api/models</strong> - Fetch all AI models from
							multiple sources with optional filtering
						</div>
						<div>
							<strong>GET /api/models/[id]</strong> - Get detailed information
							about a specific model
						</div>
						<div>
							<strong>POST /api/admin/sync-models</strong> - Trigger manual
							synchronization of model data (admin only)
						</div>
					</div>
				</div>

				<div className="mt-6 p-6 bg-green-50 rounded-lg">
					<h2 className="text-xl font-semibold text-green-900 mb-3">
						Data Sources
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-green-800">
						<div>
							<strong>models.dev</strong> - Comprehensive model database
						</div>
						<div>
							<strong>OpenRouter</strong> - Unified API access
						</div>
						<div>
							<strong>HuggingFace</strong> - Open source models
						</div>
						<div>
							<strong>ArtificialAnalysis</strong> - Model intelligence metrics
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
