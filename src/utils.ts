import { resolve, join, dirname, parse } from "node:path";
import { homedir } from "node:os";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { EnvVars } from "./types";

/**
 * Find the project root by looking for package.json file
 * @param startDir - The directory to start searching from
 * @returns The project root directory
 */
function findProjectRoot(startDir: string): string {
  let currentDir = startDir;

  while (currentDir !== parse(currentDir).root) {
    if (existsSync(join(currentDir, "package.json"))) {
      return currentDir;
    }
    currentDir = dirname(currentDir);
  }

  // Fall back to the current working directory if project root isn't found
  return process.cwd();
}

/**
 * Get the calling project's root directory
 */
export function getProjectRoot(): string {
  return findProjectRoot(process.cwd());
}

/**
 * Logging function that checks SYSTEM_DEBUG at runtime
 */
export function log(message: string): void {
  if (process.env[EnvVars.SYSTEM_DEBUG]?.toLowerCase() === "true") {
    process.stdout.write(`${message}\n`);
    console.log(message);
  }
}

/**
 * Get the base directory for authentication files
 * Can be overridden via MS_AUTH_OUTPUT_DIR environment variable
 * Defaults to project root/.playwright-ms-auth
 */
export function getAuthBaseDir(): string {
  const customDir = process.env[EnvVars.OUTPUT_DIR];
  if (customDir) {
    return resolve(customDir);
  }
  // Use project root instead of user home directory
  const projectRoot = getProjectRoot();
  return resolve(projectRoot, ".playwright-ms-auth");
}

/**
 * Ensure a directory exists
 */
export async function ensureDirExists(dir: string): Promise<void> {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

/**
 * Get the storage state path for a user
 */
export function getStorageStatePath(email: string): string {
  const authDir = getAuthBaseDir();
  const sanitizedEmail = email.replace(/[^a-zA-Z0-9@.-]/g, "_");
  return join(authDir, `state-${sanitizedEmail}.json`);
}

/**
 * Get the screenshot filepath for authentication
 */
export function getAuthScreenshotPath(
  email: string,
  status: "success" | "failed"
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sanitizedEmail = email.replace(/[^a-zA-Z0-9@.-]/g, "_");

  // If MS_AUTH_OUTPUT_DIR is set, use that directory
  // Otherwise find the calling project's root directory
  const outputDir = process.env[EnvVars.OUTPUT_DIR];
  const baseDir = outputDir ? resolve(outputDir) : getProjectRoot();
  const screenshotDir = join(baseDir, "screenshots");

  return join(
    screenshotDir,
    `auth-${sanitizedEmail}-${status}-${timestamp}.png`
  );
}

/**
 * Sanitize email for use in filenames
 */
export function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9@.-]/g, "_");
}

/**
 * Check if storage state file exists and is not expired
 */
export async function isStorageStateValid(
  filePath: string,
  expirationHours: number = 24
): Promise<boolean> {
  try {
    const { stat } = await import("node:fs/promises");
    const stats = await stat(filePath);
    const ageMs = Date.now() - stats.mtimeMs;
    const expirationMs = expirationHours * 60 * 60 * 1000;
    return ageMs < expirationMs;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
