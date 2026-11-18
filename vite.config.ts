import { defineConfig } from "vitest/config";
import { cpSync, createReadStream, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve } from "node:path";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

const projectRoot = resolve(".");
const mapInboxDirectory = resolve(projectRoot, "maps", "inbox");
const mapInboxPrefix = "/maps/inbox/";

export default defineConfig({
  plugins: [mapInboxAssets(), react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"]
  }
});

function mapInboxAssets(): Plugin {
  return {
    name: "private-map-inbox-assets",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = (request as unknown as { url?: string }).url ?? "/";
        const pathname = requestUrl.slice(
          0,
          requestUrl.indexOf("?") === -1 ? undefined : requestUrl.indexOf("?")
        );
        if (!pathname.startsWith(mapInboxPrefix)) {
          next();
          return;
        }

        let filePath: string;
        try {
          filePath = resolveMapInboxPath(decodeURIComponent(pathname.slice(mapInboxPrefix.length)));
        } catch {
          response.statusCode = 400;
          response.end("Invalid map-inbox asset path.");
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
      cpSync(mapInboxDirectory, resolve(outputDirectory, "maps", "inbox"), {
        force: true,
        recursive: true
      });
    }
  };
}

function resolveMapInboxPath(relativePath: string): string {
  const filePath = resolve(mapInboxDirectory, relativePath);
  const pathFromInbox = relative(mapInboxDirectory, filePath);
  if (!relativePath || pathFromInbox.startsWith("..") || isAbsolute(pathFromInbox)) {
    throw new Error("Map-inbox path escapes its root.");
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
