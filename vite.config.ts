import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, ".", "");
  return {
    base: environment.GITHUB_PAGES_BASE || "/",
    plugins: [react()],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"]
    }
  };
});
