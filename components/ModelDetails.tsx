"use client"

interface ModelDetailsProps {
	model: any
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function ModelDetails({ model, open, onOpenChange }: ModelDetailsProps) {
	if (!open || !model) return null

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
				<h2 className="text-2xl font-bold mb-4">{model.name}</h2>
				<div className="space-y-4">
					<div>
						<strong>ID:</strong> {model.id || "N/A"}
					</div>
					<div>
						<strong>Provider:</strong> {model.provider}
					</div>
					<div>
						<strong>Context Window:</strong>{" "}
						{model.contextWindow?.toLocaleString() || 0} tokens
					</div>
					<div>
						<strong>Max Output Tokens:</strong>{" "}
						{model.maxOutputTokens > 0
							? model.maxOutputTokens.toLocaleString()
							: "N/A"}
					</div>
					<div>
						<strong>Input Cost:</strong> $
						{model.inputCost?.toFixed(2) || "0.00"} per 1M tokens
					</div>
					<div>
						<strong>Output Cost:</strong> $
						{model.outputCost?.toFixed(2) || "0.00"} per 1M tokens
					</div>
					<div>
						<strong>Cache Read Cost:</strong>{" "}
						{model.cacheReadCost > 0
							? `$${model.cacheReadCost.toFixed(2)} per 1M tokens`
							: "N/A"}
					</div>
					<div>
						<strong>Modalities:</strong> {model.modalities?.join(", ") || "N/A"}
					</div>
					<div>
						<strong>Capabilities:</strong>{" "}
						{model.capabilities?.join(", ") || "N/A"}
					</div>
					<div>
						<strong>Open Weights:</strong> {model.openWeights ? "Yes" : "No"}
					</div>
					<div>
						<strong>Supports Temperature:</strong>{" "}
						{model.supportsTemperature ? "Yes" : "No"}
					</div>
					<div>
						<strong>Supports Attachments:</strong>{" "}
						{model.supportsAttachments ? "Yes" : "No"}
					</div>
					<div>
						<strong>Release Date:</strong> {model.releaseDate || "N/A"}
					</div>
					<div>
						<strong>Last Updated:</strong> {model.lastUpdated || "N/A"}
					</div>
				</div>
				<button
					onClick={() => onOpenChange(false)}
					className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
				>
					Close
				</button>
			</div>
		</div>
	)
}
