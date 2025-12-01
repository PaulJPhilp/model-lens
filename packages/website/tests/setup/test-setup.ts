// Minimal test setup file
import { afterAll, beforeAll, vi } from "vitest"

vi.mock("server-only", () => {
	return {}
})

beforeAll(() => {
	// Global setup if needed
})

afterAll(() => {
	// Global teardown if needed
})
