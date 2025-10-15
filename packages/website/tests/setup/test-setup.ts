import "@testing-library/jest-dom"
import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, vi } from "vitest"

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		prefetch: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(),
		getAll: vi.fn(),
		has: vi.fn(),
		keys: vi.fn(),
		values: vi.fn(),
		entries: vi.fn(),
		forEach: vi.fn(),
		toString: vi.fn(),
	}),
	usePathname: () => "/",
}))

// Mock Next.js dynamic imports
vi.mock("next/dynamic", () => ({
	default: (fn: any) => {
		const Component = fn()
		Component.displayName = "DynamicComponent"
		return Component
	},
}))

// Mock window.matchMedia
global.matchMedia = vi.fn().mockImplementation((query) => ({
	matches: false,
	media: query,
	onchange: null,
	addListener: vi.fn(), // deprecated
	removeListener: vi.fn(), // deprecated
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	dispatchEvent: vi.fn(),
}))

// Mock IntersectionObserver
class MockIntersectionObserver {
	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
}

global.IntersectionObserver = MockIntersectionObserver as any

// Mock ResizeObserver
class MockResizeObserver {
	observe = vi.fn()
	unobserve = vi.fn()
	disconnect = vi.fn()
}

global.ResizeObserver = MockResizeObserver as any

// Mock scrollTo
global.scrollTo = vi.fn()

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

beforeAll(() => {
	// Suppress specific console warnings/errors that are expected in tests
	console.error = vi.fn((message) => {
		if (
			typeof message === "string" &&
			(message.includes("Warning: ReactDOM.render is deprecated") ||
				message.includes("Warning: validateDOMNesting") ||
				message.includes("act()"))
		) {
			return
		}
		originalConsoleError(message)
	})

	console.warn = vi.fn((message) => {
		if (
			typeof message === "string" &&
			(message.includes("componentWillReceiveProps") ||
				message.includes("componentWillUpdate"))
		) {
			return
		}
		originalConsoleWarn(message)
	})
})

afterAll(() => {
	console.error = originalConsoleError
	console.warn = originalConsoleWarn
})

// Cleanup after each test
afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

// Global test timeout is set in vitest.config.ts

// Mock environment variables
vi.stubEnv("NODE_ENV", "test")
vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
vi.stubEnv("DATABASE_URL", "postgresql://postgres@localhost:5432/modellens")
