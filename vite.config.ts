import { defineConfig } from "vitest/config";
import { cpSync, createReadStream, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = resolve(".");
const publicMapReviewDirectory = resolve(projectRoot, "maps", "public-review");
const publicMapReviewPrefix = "/maps/public-review/";

export default defineConfig({
  plugins: [publicMapReviewAssets(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"]
  }
});

function publicMapReviewAssets(): Plugin {
  return {
    name: "public-map-review-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = (request as unknown as { url?: string }).url ?? "/";
        const pathname = requestUrl.slice(
          0,
          requestUrl.indexOf("?") === -1 ? undefined : requestUrl.indexOf("?")
        );
        if (!pathname.startsWith(publicMapReviewPrefix)) {
          next();
          return;
        }

        let filePath: string;
        try {
          filePath = resolvePublicMapReviewPath(
            decodeURIComponent(pathname.slice(publicMapReviewPrefix.length))
          );
        } catch {
          response.statusCode = 400;
          response.end("Invalid public map-review asset path.");
          return;
        }

        try {
          if (!statSync(filePath).isFile()) {
            next();
            return;
          }
        } catch {
          next();
          return;
        }

        response.statusCode = 200;
        response.setHeader("Content-Type", contentTypeFor(filePath));
        response.setHeader("Cache-Control", "no-store");
        createReadStream(filePath).on("error", next).pipe(response);
      });
    },
    writeBundle(outputOptions) {
      const outputDirectory = outputOptions.dir
        ? resolve(outputOptions.dir)
        : resolve(projectRoot, "dist");
      cpSync(publicMapReviewDirectory, resolve(outputDirectory, "maps", "public-review"), {
        force: true,
        recursive: true
      });
    }
  };
}

function resolvePublicMapReviewPath(relativePath: string): string {
  const filePath = resolve(publicMapReviewDirectory, relativePath);
  const pathFromPublicReview = relative(publicMapReviewDirectory, filePath);
  if (!relativePath || pathFromPublicReview.startsWith("..") || isAbsolute(pathFromPublicReview)) {
    throw new Error("Public map-review path escapes its root.");
  }
  return filePath;
}

function contentTypeFor(filePath: string): string {
  switch (extname(filePath).toLowerCase()) {
    case ".json":
      return "application/json; charset=utf-8";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
