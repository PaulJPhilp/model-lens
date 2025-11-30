/**
 * Vitest Coverage Configuration
 *
 * Defines coverage thresholds and collection settings for comprehensive
 * coverage reporting and gap analysis.
 */

export const coverageConfig = {
	/**
	 * Coverage thresholds for CI/CD pipeline
	 */
	thresholds: {
		lines: 85,
		functions: 85,
		branches: 80,
		statements: 85,
	},

	/**
	 * Providers and reporters
	 */
	provider: "v8",
	reporters: ["text", "json", "html", "lcov"],

	/**
	 * Files to include in coverage
	 */
	include: [
		"lib/**/*.ts",
		"src/**/*.ts",
	],

	/**
	 * Files to exclude from coverage
	 */
	exclude: [
		"node_modules/",
		"dist/",
		"**/*.d.ts",
		"**/*.config.ts",
		"**/setup/**",
		"**/*.test.ts",
		"**/*.spec.ts",
		"**/*.{test,spec}.{js,ts}",
		"coverage/",
		".next/",
	],

	/**
	 * Skip coverage for specific patterns
	 */
	skipFull: true, // Don't report files without coverage statements

	/**
	 * Coverage output directory
	 */
	outputDir: "coverage",

	/**
	 * Generate reports
	 */
	reports: {
		summary: true,
		detailed: true,
		html: true,
		json: true,
		lcov: true,
	},
}

/**
 * Gap Analysis Configuration
 *
 * Identifies areas with insufficient coverage for Phase 9
 */
export const gapAnalysisConfig = {
	/**
	 * Minimum coverage targets for different file types
	 */
	targetsByType: {
		service: 90, // Service files should have >90% coverage
		route: 85, // Route handlers should have >85% coverage
		utility: 95, // Utility functions should have >95% coverage
		middleware: 90, // Middleware should have >90% coverage
		test: 0, // Don't measure coverage for test files
	},

	/**
	 * Areas requiring additional testing
	 */
	gapPatterns: [
		{
			pattern: "*.error.ts",
			description: "Error handling modules",
			minCoverage: 95,
		},
		{
			pattern: "*.service.ts",
			description: "Service implementations",
			minCoverage: 90,
		},
		{
			pattern: "*/routes/*",
			description: "API route handlers",
			minCoverage: 85,
		},
		{
			pattern: "*/middleware/*",
			description: "HTTP middleware",
			minCoverage: 90,
		},
	],

	/**
	 * Uncovered code paths requiring tests
	 */
	uncoveredPatterns: {
		branches: [
			"Error handling branches",
			"Conditional retry logic",
			"Fallback behaviors",
			"Error recovery paths",
		],
		lines: [
			"Edge case handling",
			"Boundary conditions",
			"Timeout scenarios",
			"Resource cleanup",
		],
		functions: [
			"Internal helper functions",
			"Error factory functions",
			"Data transformation utilities",
			"Validation helpers",
		],
	},
}

/**
 * CI/CD Integration Configuration
 */
export const cicdConfig = {
	/**
	 * Test execution phases
	 */
	phases: [
		{
			name: "Unit Tests",
			command: "bun run test:unit",
			timeout: 30000,
			failOnError: true,
		},
		{
			name: "Integration Tests",
			command: "bun run test:integration",
			timeout: 60000,
			failOnError: true,
		},
		{
			name: "E2E Tests",
			command: "bun run test:e2e",
			timeout: 90000,
			failOnError: false, // E2E failures don't block CI if core tests pass
		},
		{
			name: "Coverage Check",
			command: "bun run test:coverage",
			timeout: 60000,
			failOnError: false, // Coverage gaps noted but don't fail CI during development
		},
	],

	/**
	 * Environment variables for CI
	 */
	environment: {
		NODE_ENV: "test",
		DATABASE_URL: "postgresql://test:test@localhost:5432/test_db",
		LOG_LEVEL: "warn",
	},

	/**
	 * Success criteria
	 */
	successCriteria: {
		allUnitTestsPass: true,
		allIntegrationTestsPass: true,
		minCoveragePercentage: 85,
		noTypeErrors: true,
	},

	/**
	 * Artifact collection
	 */
	artifacts: {
		coverage: "coverage/",
		reports: "test-reports/",
		logs: "test-logs/",
	},
}

/**
 * Test Report Configuration
 */
export const reportConfig = {
	/**
	 * Summary statistics
	 */
	summary: {
		totalTests: 0,
		passedTests: 0,
		failedTests: 0,
		skippedTests: 0,
		duration: 0,
		startTime: new Date(),
		endTime: new Date(),
	},

	/**
	 * Coverage summary
	 */
	coverage: {
		branches: { covered: 0, total: 0, percentage: 0 },
		functions: { covered: 0, total: 0, percentage: 0 },
		lines: { covered: 0, total: 0, percentage: 0 },
		statements: { covered: 0, total: 0, percentage: 0 },
	},

	/**
	 * Performance metrics
	 */
	performance: {
		fastestTest: "",
		slowestTest: "",
		averageTestTime: 0,
		totalTime: 0,
	},

	/**
	 * Areas requiring attention
	 */
	gaps: {
		uncoveredFiles: [] as string[],
		lowCoverageFiles: [] as { file: string; coverage: number }[],
		failedTests: [] as string[],
	},
}

/**
 * Export full configuration
 */
export const testInfrastructureConfig = {
	coverage: coverageConfig,
	gapAnalysis: gapAnalysisConfig,
	cicd: cicdConfig,
	reporting: reportConfig,
}

export default testInfrastructureConfig
