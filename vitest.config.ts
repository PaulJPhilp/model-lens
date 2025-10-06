import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
	esbuild: {
		jsx: "automatic",
	},
	resolve: {
		alias: [
			// Support imports like '@/src/db'
			{
				find: /^@\/(.*)$/,
				replacement: fileURLToPath(new URL("./$1", import.meta.url)),
			},
			{
				find: /^@app\/(.*)$/,
				replacement: fileURLToPath(new URL("./app/$1", import.meta.url)),
			},
			{
				find: /^@components\/(.*)$/,
				replacement: fileURLToPath(new URL("./components/$1", import.meta.url)),
			},
			{
				find: /^@services\/(.*)$/,
				replacement: fileURLToPath(
					new URL("./lib/services/$1", import.meta.url),
				),
			},
			{
				find: /^@schemas\/(.*)$/,
				replacement: fileURLToPath(new URL("./src/db/$1", import.meta.url)),
			},
			{
				find: /^@type$/,
				replacement: fileURLToPath(new URL("./lib/types", import.meta.url)),
			},
			{
				find: /^@utils$/,
				replacement: fileURLToPath(new URL("./lib/utils", import.meta.url)),
			},
			{
				find: /^@config\/(.*)$/,
				replacement: fileURLToPath(new URL("./lib/config/$1", import.meta.url)),
			},
			{
				find: /^@transformers\/(.*)$/,
				replacement: fileURLToPath(
					new URL("./lib/transformers/$1", import.meta.url),
				),
			},
			{
				find: /^@api\/(.*)$/,
				replacement: fileURLToPath(new URL("./lib/api/$1", import.meta.url)),
			},
			{
				find: /^@tests\/(.*)$/,
				replacement: fileURLToPath(new URL("./tests/$1", import.meta.url)),
			},
		],
	},
	test: {
		environment: "jsdom",
		include: ["**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", "dist", ".next"],
		setupFiles: ["./tests/setup/test-setup.ts"],
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				".next/",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"**/setup/**",
				"**/mocks/**",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
			],
			thresholds: {
				global: {
					branches: 80,
					functions: 80,
					lines: 80,
					statements: 80,
				},
			},
		},
		testTimeout: 10000,
		hookTimeout: 10000,
	},
})
