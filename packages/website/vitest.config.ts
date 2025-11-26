import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		alias: [
			{
				find: /^@\/(.*)$/,
				replacement: fileURLToPath(new URL("./src/$1", import.meta.url)),
			},
			{
				find: /^@services\/(.*)$/,
				replacement: fileURLToPath(
					new URL("./src/services/$1", import.meta.url),
				),
			},
			{
				find: /^@db\/(.*)$/,
				replacement: fileURLToPath(new URL("./src/db/$1", import.meta.url)),
			},
			{
				find: /^@lib\/(.*)$/,
				replacement: fileURLToPath(new URL("./lib/$1", import.meta.url)),
			},
			{
				find: /^@routes\/(.*)$/,
				replacement: fileURLToPath(new URL("./src/routes/$1", import.meta.url)),
			},
			{
				find: /^@middleware\/(.*)$/,
				replacement: fileURLToPath(
					new URL("./src/middleware/$1", import.meta.url),
				),
			},
			{
				find: /^@tests\/(.*)$/,
				replacement: fileURLToPath(new URL("./tests/$1", import.meta.url)),
			},
		],
	},
	test: {
		environment: "node",
		include: ["**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist"],
		setupFiles: ["./tests/setup/test-setup.ts"],
		globals: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"**/*.d.ts",
				"**/*.config.{js,ts}",
				"**/setup/**",
				"**/*.test.ts",
				"**/*.spec.ts",
			],
		},
		testTimeout: 10000,
		hookTimeout: 10000,
	},
})
