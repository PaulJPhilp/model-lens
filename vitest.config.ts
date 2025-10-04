import { URL, fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      // Support imports like '@/src/db'
      {
        find: /^@\/(.*)$/,
        replacement: fileURLToPath(new URL("./$1", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
  },
});
