import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
  },
  resolve: {
    alias: [
      {
        find: "@",
        replacement: path.resolve(import.meta.dirname, "./src"),
      },
      {
        find: "server-only",
        replacement: path.resolve(
          import.meta.dirname,
          "./node_modules/server-only/empty.js"
        ),
      },
    ],
  },
});
