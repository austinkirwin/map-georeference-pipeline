import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  assertDropboxPathWithinRoot,
  MAX_REVIEW_IMAGE_BYTES,
  validateDropboxIntakeBundle
} from "./dropbox-map-intake.mjs";

const validManifest = {
  schemaVersion: "0.1",
  id: "riverton-1930-sheet-01",
  title: "Riverton zoning map",
  placeName: "Riverton, Illinois",
  mapDate: "1930-06-01",
  reviewImage: "review-copy.png",
  widthPx: 4000,
  heightPx: 3000,
  targetCrs: "EPSG:3857",
  source: {
    title: "Riverton archive",
    accessedAt: "2026-11-17",
    rights: "Authorized for repository review by all repository collaborators."
  }
};

function fileEntry(name, overrides = {}) {
  return {
    ".tag": "file",
    name,
    path_lower: `/intake/riverton-1930-sheet-01/${name}`,
    id: `id:${name}`,
    rev: `rev-${name}`,
    content_hash: `hash-${name}`,
    ...overrides
  };
}

function pngBytes() {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
}

describe("Dropbox map-intake validation", () => {
  it("accepts one manifest and one rights-cleared PNG review copy", () => {
    const result = validateDropboxIntakeBundle({
      folderPath: "/intake/riverton-1930-sheet-01",
      entries: [fileEntry("map.json"), fileEntry("review-copy.png")],
      manifestBytes: Buffer.from(JSON.stringify(validManifest)),
      reviewBytes: pngBytes()
    });

    expect(result.mapId).toBe("riverton-1930-sheet-01");
    expect(result.manifest.storage.reviewCopy).toMatchObject({
      provider: "dropbox",
      fileId: "id:review-copy.png",
      revision: "rev-review-copy.png",
      contentHash: "hash-review-copy.png"
    });
    expect(result.manifest.storage.reviewCopy.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects paths outside the configured Dropbox App Folder subdirectory", () => {
    expect(assertDropboxPathWithinRoot("/intake/riverton-1930-sheet-01", "/intake")).toBe(
      "/intake/riverton-1930-sheet-01"
    );
    expect(() => assertDropboxPathWithinRoot("/outside/map", "/intake")).toThrow(
      "DROPBOX_INGEST_ROOT"
    );
    expect(() => assertDropboxPathWithinRoot("/intake/../outside/map", "/intake")).toThrow(
      "dot segments"
    );
  });

  it("rejects an unexpected raw or archive file in the intake folder", () => {
    expect(() =>
      validateDropboxIntakeBundle({
        folderPath: "/intake/riverton-1930-sheet-01",
        entries: [
          fileEntry("map.json"),
          fileEntry("review-copy.png"),
          fileEntry("original-scan.tif")
        ],
        manifestBytes: Buffer.from(JSON.stringify(validManifest)),
        reviewBytes: pngBytes()
      })
    ).toThrow("exactly two files");
  });

  it("rejects a mismatched extension and image signature", () => {
    expect(() =>
      validateDropboxIntakeBundle({
        folderPath: "/intake/riverton-1930-sheet-01",
        entries: [fileEntry("map.json"), fileEntry("review-copy.jpg")],
        manifestBytes: Buffer.from(
          JSON.stringify({ ...validManifest, reviewImage: "review-copy.jpg" })
        ),
        reviewBytes: pngBytes()
      })
    ).toThrow("do not match");
  });

  it("rejects an oversized review image before it reaches the repository", () => {
    expect(() =>
      validateDropboxIntakeBundle({
        folderPath: "/intake/riverton-1930-sheet-01",
        entries: [fileEntry("map.json"), fileEntry("review-copy.png")],
        manifestBytes: Buffer.from(JSON.stringify(validManifest)),
        reviewBytes: Buffer.alloc(MAX_REVIEW_IMAGE_BYTES + 1)
      })
    ).toThrow("exceeds");
  });
});
