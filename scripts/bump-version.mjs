#!/usr/bin/env node

/**
 * Synchronized version bumper for the Qarar monorepo.
 * Usage:
 *   node scripts/bump-version.mjs [patch|minor|major|<explicit-version>] [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const rawArgs = process.argv.slice(2);
const isDryRun = rawArgs.includes("--dry-run");
const cleanArgs = rawArgs.filter((a) => a !== "--" && a !== "--dry-run");
const versionArg = cleanArgs[0] || "patch";

function parseSemver(v) {
  const match = v.match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/);
  if (!match) {
    throw new Error(`Invalid semver version: "${v}"`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

function computeNextVersion(current, bump) {
  if (bump === "current") {
    return current;
  }
  const parsed = parseSemver(current);
  switch (bump) {
    case "patch":
      return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
    case "minor":
      return `${parsed.major}.${parsed.minor + 1}.0`;
    case "major":
      return `${parsed.major + 1}.0.0`;
    default:
      // Must be an explicit version string
      parseSemver(bump); // validates
      return bump;
  }
}

// 1. Read root package.json to get current version
const rootPkgPath = path.join(rootDir, "package.json");
const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, "utf-8"));
const currentVersion = rootPkg.version || "0.0.1";
const newVersion = computeNextVersion(currentVersion, versionArg);

console.log(`📦 Monorepo Version Bump: ${currentVersion} ➔ ${newVersion}${isDryRun ? " (DRY RUN)" : ""}`);

// 2. Discover all package.json files across the monorepo
function findPackageJsons() {
  const targets = [rootPkgPath];
  const scanDirs = ["packages", "apps", "examples"];

  for (const dir of scanDirs) {
    const fullDir = path.join(rootDir, dir);
    if (!fs.existsSync(fullDir)) continue;

    const entries = fs.readdirSync(fullDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pkgFile = path.join(fullDir, entry.name, "package.json");
        if (fs.existsSync(pkgFile)) {
          targets.push(pkgFile);
        }
      }
    }
  }

  return targets;
}

const packageFiles = findPackageJsons();
console.log(`Found ${packageFiles.length} packages to update:`);

for (const file of packageFiles) {
  const relPath = path.relative(rootDir, file);
  const content = fs.readFileSync(file, "utf-8");
  const json = JSON.parse(content);
  const prevVersion = json.version;

  json.version = newVersion;

  if (isDryRun) {
    console.log(`  • [DRY-RUN] ${relPath}: ${prevVersion} ➔ ${newVersion}`);
  } else {
    fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`, "utf-8");
    console.log(`  ✓ ${relPath}: ${prevVersion} ➔ ${newVersion}`);
  }
}

console.log(`\n🎉 Successfully ${isDryRun ? "calculated" : "bumped"} version to ${newVersion}`);

// Set GitHub Actions output if in CI environment
if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `new_version=${newVersion}\n`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `current_version=${currentVersion}\n`);
}
