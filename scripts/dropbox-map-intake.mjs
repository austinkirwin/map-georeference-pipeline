import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { appendFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, isAbsolute, posix, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const MAP_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,80}$/;
const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const ALLOWED_REVIEW_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);
const MAX_MANIFEST_BYTES = 512 * 1024;
export const MAX_REVIEW_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * A minimal representation of the Dropbox file metadata needed by the intake.
 * Dropbox metadata and every value from the remote folder are untrusted input.
 */
function isDropboxFile(entry) {
  return (
    isRecord(entry) &&
    entry[".tag"] === "file" &&
    typeof entry.name === "string" &&
    typeof entry.path_lower === "string" &&
    typeof entry.id === "string" &&
    typeof entry.rev === "string" &&
    typeof entry.content_hash === "string"
  );
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(record, key) {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`map.json.${key} must be a non-empty string.`);
  }
  return value;
}

function requiredPositiveInteger(record, key) {
  const value = record[key];
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(`map.json.${key} must be a positive integer.`);
  }
  return value;
}

function assertSafeFileName(value, label) {
  if (!SAFE_FILE_NAME_PATTERN.test(value)) {
    throw new Error(`${label} must be a simple file name without directory segments.`);
  }
}

function extensionFor(fileName) {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

function assertAllowedReviewImageName(fileName) {
  assertSafeFileName(fileName, "map.json.reviewImage");
  if (!ALLOWED_REVIEW_IMAGE_EXTENSIONS.has(extensionFor(fileName))) {
    throw new Error("map.json.reviewImage must be a PNG, JPEG, or WebP file.");
  }
}

function assertReviewImageSignature(fileName, bytes) {
  const extension = extensionFor(fileName);
  const isPng =
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isWebp =
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP";

  if (
    (extension === ".png" && !isPng) ||
    (extension === ".jpg" && !isJpeg) ||
    (extension === ".jpeg" && !isJpeg) ||
    (extension === ".webp" && !isWebp)
  ) {
    throw new Error("The review image bytes do not match the declared image type.");
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function assertManifestShape(manifest, folderMapId) {
  if (!isRecord(manifest)) {
    throw new Error("map.json must contain an object.");
  }
  if (requiredString(manifest, "schemaVersion") !== "0.1") {
    throw new Error("map.json.schemaVersion must be 0.1.");
  }

  const id = requiredString(manifest, "id");
  if (!MAP_ID_PATTERN.test(id)) {
    throw new Error("map.json.id must use lowercase letters, numbers, and hyphens.");
  }
  if (id !== folderMapId) {
    throw new Error("The Dropbox folder name must exactly match map.json.id.");
  }

  requiredString(manifest, "title");
  requiredString(manifest, "placeName");
  requiredString(manifest, "mapDate");
  requiredString(manifest, "targetCrs");
  requiredPositiveInteger(manifest, "widthPx");
  requiredPositiveInteger(manifest, "heightPx");

  const reviewImage = requiredString(manifest, "reviewImage");
  assertAllowedReviewImageName(reviewImage);

  if (!isRecord(manifest.source)) {
    throw new Error("map.json.source must be an object.");
  }
  requiredString(manifest.source, "title");
  requiredString(manifest.source, "accessedAt");
  requiredString(manifest.source, "rights");

  if (manifest.storage !== undefined && !isRecord(manifest.storage)) {
    throw new Error("map.json.storage must be an object when supplied.");
  }

  return { id, reviewImage };
}

/**
 * Validates and enriches one complete Dropbox folder without writing to disk.
 * The only allowed remote contents are map.json and its single declared review image.
 */
export function validateDropboxIntakeBundle({ folderPath, entries, manifestBytes, reviewBytes }) {
  const normalizedFolderPath = normalizeDropboxPath(folderPath);
  const folderMapId = basename(normalizedFolderPath);
  if (!MAP_ID_PATTERN.test(folderMapId)) {
    throw new Error("The Dropbox intake folder name must be a valid map ID.");
  }
  if (
    !Array.isArray(entries) ||
    entries.length !== 2 ||
    entries.some((entry) => !isDropboxFile(entry))
  ) {
    throw new Error(
      "The Dropbox intake folder must contain exactly two files: map.json and one review image."
    );
  }
  if (manifestBytes.length > MAX_MANIFEST_BYTES) {
    throw new Error("map.json exceeds the 512 KiB intake limit.");
  }
  if (reviewBytes.length > MAX_REVIEW_IMAGE_BYTES) {
    throw new Error(
      `The review image exceeds the ${MAX_REVIEW_IMAGE_BYTES / 1024 / 1024} MiB intake limit.`
    );
  }

  let manifest;
  try {
    manifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("map.json is not valid JSON.");
  }

  const { id, reviewImage } = assertManifestShape(manifest, folderMapId);
  const expectedNames = new Set(["map.json", reviewImage]);
  if (entries.some((entry) => !expectedNames.has(entry.name))) {
    throw new Error("The Dropbox intake folder contains an unexpected file.");
  }
  const manifestEntry = entries.find((entry) => entry.name === "map.json");
  const reviewEntry = entries.find((entry) => entry.name === reviewImage);
  if (!manifestEntry || !reviewEntry) {
    throw new Error(
      "The declared review image or map.json is missing from the Dropbox intake folder."
    );
  }
  if (manifestEntry.path_lower === reviewEntry.path_lower) {
    throw new Error("The manifest and review image must be separate files.");
  }

  assertReviewImageSignature(reviewImage, reviewBytes);
  const storage = isRecord(manifest.storage) ? { ...manifest.storage } : {};
  const enrichedManifest = {
    ...manifest,
    storage: {
      ...storage,
      reviewCopy: {
        provider: "dropbox",
        fileId: reviewEntry.id,
        revision: reviewEntry.rev,
        contentHash: reviewEntry.content_hash,
        sha256: sha256(reviewBytes)
      }
    }
  };

  return {
    mapId: id,
    reviewImage,
    manifest: enrichedManifest,
    manifestEntry,
    reviewEntry
  };
}

/** Prevents a workflow input from escaping the Dropbox App Folder subdirectory. */
export function assertDropboxPathWithinRoot(requestedPath, intakeRoot) {
  const requested = normalizeDropboxPath(requestedPath);
  const root = normalizeDropboxPath(intakeRoot);
  if (requested === root || !requested.startsWith(`${root}/`)) {
    throw new Error("The Dropbox path must be inside DROPBOX_INGEST_ROOT.");
  }
  return requested;
}

function normalizeDropboxPath(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.includes("\0")) {
    throw new Error("Dropbox paths must be absolute, non-empty paths.");
  }
  const segments = value.split("/").filter(Boolean);
  if (segments.some((segment) => segment === "." || segment === "..")) {
    throw new Error("Dropbox paths may not contain dot segments.");
  }
  const normalized = posix.normalize(value);
  if (normalized === "/" || normalized === ".") {
    throw new Error("Dropbox paths must name a folder, not the Dropbox root.");
  }
  return normalized.replace(/\/$/, "");
}

function assertPathInside(parent, child) {
  const pathFromParent = relative(parent, child);
  if (!pathFromParent || pathFromParent.startsWith("..") || isAbsolute(pathFromParent)) {
    throw new Error("The destination path escapes maps/inbox.");
  }
}

async function readLimitedBody(response, maximumBytes, description) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maximumBytes) {
    throw new Error(`${description} exceeds the configured size limit.`);
  }
  if (!response.body) {
    throw new Error(`${description} had no response body.`);
  }

  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new Error(`${description} exceeds the configured size limit.`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}

function assertDropboxResponse(response, operation) {
  if (!response.ok) {
    throw new Error(`Dropbox ${operation} failed with HTTP ${response.status}.`);
  }
}

async function readDropboxJson(response, operation) {
  assertDropboxResponse(response, operation);
  try {
    return await response.json();
  } catch {
    throw new Error(`Dropbox ${operation} returned invalid JSON.`);
  }
}

export async function createDropboxClient({
  appKey,
  appSecret,
  refreshToken,
  fetchImplementation = fetch
}) {
  if (
    ![appKey, appSecret, refreshToken].every(
      (value) => typeof value === "string" && value.length > 0
    )
  ) {
    throw new Error("DROPBOX_APP_KEY, DROPBOX_APP_SECRET, and DROPBOX_REFRESH_TOKEN are required.");
  }

  const tokenBody = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const basicCredentials = Buffer.from(`${appKey}:${appSecret}`).toString("base64");
  const tokenResponse = await fetchImplementation("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicCredentials}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: tokenBody
  });
  const token = await readDropboxJson(tokenResponse, "OAuth token exchange");
  if (
    !isRecord(token) ||
    typeof token.access_token !== "string" ||
    token.access_token.length === 0
  ) {
    throw new Error("Dropbox OAuth token exchange did not return an access token.");
  }
  const authorization = `Bearer ${token.access_token}`;

  async function listFolder(folderPath) {
    let body = { path: folderPath, recursive: false, include_deleted: false };
    let endpoint = "https://api.dropboxapi.com/2/files/list_folder";
    const entries = [];
    while (endpoint) {
      const response = await fetchImplementation(endpoint, {
        method: "POST",
        headers: { Authorization: authorization, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const page = await readDropboxJson(response, "folder listing");
      if (!isRecord(page) || !Array.isArray(page.entries)) {
        throw new Error("Dropbox folder listing had an invalid shape.");
      }
      entries.push(...page.entries);
      if (page.has_more === true && typeof page.cursor === "string") {
        endpoint = "https://api.dropboxapi.com/2/files/list_folder/continue";
        body = { cursor: page.cursor };
      } else {
        endpoint = "";
      }
    }
    return entries;
  }

  async function downloadFile(entry, maximumBytes, description) {
    if (!isDropboxFile(entry)) {
      throw new Error("Dropbox download target was not file metadata.");
    }
    const response = await fetchImplementation("https://content.dropboxapi.com/2/files/download", {
      method: "POST",
      headers: {
        Authorization: authorization,
        "Dropbox-API-Arg": JSON.stringify({ path: entry.path_lower })
      }
    });
    assertDropboxResponse(response, `download of ${entry.name}`);
    return readLimitedBody(response, maximumBytes, description);
  }

  return { listFolder, downloadFile };
}

export async function stageDropboxIntake({
  client,
  dropboxPath,
  intakeRoot,
  repositoryRoot,
  dryRun = false
}) {
  const requestedPath = assertDropboxPathWithinRoot(dropboxPath, intakeRoot);
  const entries = await client.listFolder(requestedPath);
  if (!Array.isArray(entries) || entries.some((entry) => !isDropboxFile(entry))) {
    throw new Error(
      "Dropbox intake folders may contain files only; nested folders are not allowed."
    );
  }
  const manifestEntry = entries.find((entry) => entry.name === "map.json");
  if (!manifestEntry) {
    throw new Error("Dropbox intake folder is missing map.json.");
  }
  const manifestBytes = await client.downloadFile(manifestEntry, MAX_MANIFEST_BYTES, "map.json");
  let untrustedManifest;
  try {
    untrustedManifest = JSON.parse(manifestBytes.toString("utf8"));
  } catch {
    throw new Error("map.json is not valid JSON.");
  }
  if (!isRecord(untrustedManifest) || typeof untrustedManifest.reviewImage !== "string") {
    throw new Error("map.json.reviewImage is required before its review image can be downloaded.");
  }
  assertAllowedReviewImageName(untrustedManifest.reviewImage);
  const reviewEntry = entries.find((entry) => entry.name === untrustedManifest.reviewImage);
  if (!reviewEntry) {
    throw new Error("The Dropbox intake folder does not contain the declared review image.");
  }
  const reviewBytes = await client.downloadFile(
    reviewEntry,
    MAX_REVIEW_IMAGE_BYTES,
    "review image"
  );
  const bundle = validateDropboxIntakeBundle({
    folderPath: requestedPath,
    entries,
    manifestBytes,
    reviewBytes
  });

  const inboxRoot = resolve(repositoryRoot, "maps", "inbox");
  const destination = resolve(inboxRoot, bundle.mapId);
  assertPathInside(inboxRoot, destination);
  if (existsSync(destination)) {
    throw new Error(
      `maps/inbox/${bundle.mapId} already exists; use a new map ID or review the existing intake.`
    );
  }
  if (dryRun) {
    return { ...bundle, destination, dryRun: true };
  }

  const temporaryDirectory = resolve(
    inboxRoot,
    `.${bundle.mapId}.dropbox-staging-${process.pid}-${Date.now()}`
  );
  assertPathInside(inboxRoot, temporaryDirectory);
  await mkdir(temporaryDirectory, { recursive: false });
  try {
    await writeFile(
      resolve(temporaryDirectory, "map.json"),
      `${JSON.stringify(bundle.manifest, null, 2)}\n`,
      "utf8"
    );
    await writeFile(resolve(temporaryDirectory, bundle.reviewImage), reviewBytes);
    await rename(temporaryDirectory, destination);
  } catch (error) {
    await rm(temporaryDirectory, { force: true, recursive: true });
    throw error;
  }
  return { ...bundle, destination, dryRun: false };
}

function parseArguments(argumentsList) {
  const result = { dryRun: false, path: undefined };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--dry-run") {
      result.dryRun = true;
    } else if (argument === "--path") {
      result.path = argumentsList[index + 1];
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (typeof result.path !== "string" || result.path.length === 0) {
    throw new Error(
      "Usage: node scripts/dropbox-map-intake.mjs --path /intake/<map-id> [--dry-run]"
    );
  }
  return result;
}

async function writeGitHubOutputs(result) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  await appendFile(
    outputPath,
    `map_id=${result.mapId}\nreview_image=${result.reviewImage}\ndry_run=${String(result.dryRun)}\n`,
    "utf8"
  );
}

export async function runCommand() {
  const argumentsList = parseArguments(process.argv.slice(2));
  const client = await createDropboxClient({
    appKey: process.env.DROPBOX_APP_KEY,
    appSecret: process.env.DROPBOX_APP_SECRET,
    refreshToken: process.env.DROPBOX_REFRESH_TOKEN
  });
  const result = await stageDropboxIntake({
    client,
    dropboxPath: argumentsList.path,
    intakeRoot: process.env.DROPBOX_INGEST_ROOT ?? "/intake",
    repositoryRoot: process.cwd(),
    dryRun: argumentsList.dryRun
  });
  await writeGitHubOutputs(result);
  console.log(
    `${result.dryRun ? "Validated" : "Staged"} Dropbox intake ${result.mapId} (${result.reviewImage}).`
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCommand().catch((error) => {
    console.error(
      `Dropbox intake failed: ${error instanceof Error ? error.message : "unknown error"}`
    );
    process.exitCode = 1;
  });
}
