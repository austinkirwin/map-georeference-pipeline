import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inboxDirectory = join(repositoryRoot, "maps", "inbox");
const allowedInboxRootFiles = new Set(["README.md"]);
const allowedReviewImageExtensions = new Set([".avif", ".jpeg", ".jpg", ".png", ".webp"]);
const prohibitedRightsLanguage =
  /\b(unknown|unverified|verify|testing|test only|todo|tbd|restricted|private|not for redistribution)\b/i;
const errors = [];

function addError(message) {
  errors.push(message);
}

function requireLicense() {
  const candidates = ["LICENSE", "LICENSE.md", "LICENSE.txt", "COPYING"];
  if (!candidates.some((fileName) => existsSync(join(repositoryRoot, fileName)))) {
    addError("Add a repository license before public release.");
  }
}

function validateMapIntakes() {
  if (!existsSync(inboxDirectory)) {
    addError("maps/inbox does not exist.");
    return 0;
  }

  let mapCount = 0;
  for (const entry of readdirSync(inboxDirectory, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      if (!allowedInboxRootFiles.has(entry.name)) {
        addError(
          `maps/inbox/${entry.name}: only map folders and the inbox README may be publicly deployed.`
        );
      }
      continue;
    }

    const intakeDirectory = join(inboxDirectory, entry.name);
    const manifestPath = join(intakeDirectory, "map.json");
    if (!existsSync(manifestPath)) {
      addError(`${entry.name}: map folders must contain map.json.`);
      continue;
    }

    mapCount += 1;
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    } catch (error) {
      addError(`${entry.name}: map.json is not valid JSON (${error.message}).`);
      continue;
    }

    const source = manifest.source && typeof manifest.source === "object" ? manifest.source : {};
    const rights = typeof source.rights === "string" ? source.rights.trim() : "";
    if (!rights || prohibitedRightsLanguage.test(rights)) {
      addError(
        `${entry.name}: source.rights must state confirmed public redistribution terms, not ${
          rights ? JSON.stringify(rights) : "an empty value"
        }.`
      );
    }

    const sourceUrl = typeof source.url === "string" ? source.url.trim() : "";
    try {
      const parsedUrl = new URL(sourceUrl);
      if (parsedUrl.protocol !== "https:") {
        throw new Error("not HTTPS");
      }
    } catch {
      addError(`${entry.name}: source.url must be a durable HTTPS source record.`);
    }

    const reviewImage = typeof manifest.reviewImage === "string" ? manifest.reviewImage : "";
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(reviewImage)) {
      addError(`${entry.name}: reviewImage must be a safe file name.`);
      continue;
    }

    const extension = reviewImage.slice(reviewImage.lastIndexOf(".")).toLowerCase();
    if (!allowedReviewImageExtensions.has(extension)) {
      addError(`${entry.name}: reviewImage must be a supported raster image file.`);
    }

    const reviewImagePath = join(intakeDirectory, reviewImage);
    if (!existsSync(reviewImagePath) || !statSync(reviewImagePath).isFile()) {
      addError(`${entry.name}: review image ${JSON.stringify(reviewImage)} is missing.`);
    }

    const expectedFiles = new Set(["map.json", reviewImage]);
    for (const child of readdirSync(intakeDirectory, { withFileTypes: true })) {
      if (!child.isFile() || !expectedFiles.has(child.name)) {
        addError(
          `${entry.name}: only map.json and the declared review image may be stored in a public intake folder.`
        );
      }
    }
  }

  return mapCount;
}

requireLicense();
const mapCount = validateMapIntakes();

if (errors.length > 0) {
  console.error("Public release check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Public release check passed for ${mapCount} map intake(s).`);
}
