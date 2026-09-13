import { fileURLToPath } from "node:url";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig(async () => {
  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.jsonc" },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: await readD1Migrations("./migrations"),
            SUMMARY_EVAL: process.env.SUMMARY_EVAL ?? "",
            SUMMARY_EVAL_CONFIGS: process.env.SUMMARY_EVAL_CONFIGS ?? "",
          },
        },
      }),
    ],
    resolve: {
      alias: [
        {
          find: /^discord\.js$/,
          replacement: fileURLToPath(new URL("./test/discord-shim.ts", import.meta.url)),
        },
        {
          find: /^discord-api-types\/v10$/,
          replacement: fileURLToPath(
            new URL("./node_modules/discord-api-types/v10.js", import.meta.url),
          ),
        },
      ],
    },
    test: {
      include: ["test/**/*.test.ts"],
      setupFiles: ["./test/setup.ts"],
    },
  };
});
