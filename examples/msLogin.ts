/**
 * Microsoft/SharePoint Authentication Helper
 * Uses playwright-ms-auth for Microsoft authentication
 */

import * as fs from "fs";
import * as dotenv from "dotenv";
import {
  authenticate,
  loadConfigFromEnv,
  getStorageStatePath,
  getAuthBaseDir,
} from "playwright-ms-auth";

dotenv.config();

/**
 * Login to Microsoft/SharePoint and save authentication state
 * Uses playwright-ms-auth package for robust authentication
 */
export async function loginToMicrosoft(
  headless: boolean = true
): Promise<void> {
  const url = process.env.MS_SHAREPOINT_URL || "";

  // Validate configuration
  if (!url) {
    throw new Error("Missing required environment variable: MS_SHAREPOINT_URL");
  }

  console.log("🔐 Starting Microsoft authentication...");
  console.log(`🌐 URL: ${url}`);
  console.log(`👁️  Browser mode: ${headless ? "headless" : "headful"}`);

  try {
    // Load configuration from environment variables
    // Supports: MS_AUTH_EMAIL, MS_AUTH_CREDENTIAL_TYPE, etc.
    const config = loadConfigFromEnv();

    // Set headless mode
    config.headless = headless;

    console.log("📧 Email:", config.email);
    console.log("🔑 Credential Type:", config.credentialType || "password");

    // Perform authentication - saves to ~/.playwright-ms-auth/state-{email}.json
    await authenticate(config, url);

    const storagePath = getStorageStatePath(config.email);
    console.log("✅ Authentication successful!");
    console.log(`📁 Auth state saved to: ${storagePath}`);
  } catch (error) {
    console.error("❌ Authentication failed:", error);
    throw error;
  }
}

/**
 * Check if valid authentication exists
 */
export async function hasValidAuth(): Promise<boolean> {
  const config = loadConfigFromEnv();
  const storagePath = getStorageStatePath(config.email);
  return fs.existsSync(storagePath);
}

/**
 * Get the path to the auth file
 * Returns the storage state path for the configured user
 */
export async function getAuthFilePath(): Promise<string> {
  const config = loadConfigFromEnv();
  return getStorageStatePath(config.email);
}

/**
 * Clear saved authentication
 */
export async function clearAuth(): Promise<void> {
  const config = loadConfigFromEnv();
  const storagePath = getStorageStatePath(config.email);

  if (fs.existsSync(storagePath)) {
    fs.unlinkSync(storagePath);
    console.log(`✅ Cleared: ${storagePath}`);
  } else {
    console.log("ℹ️ No authentication to clear");
  }

  // Also clear screenshots directory if it exists
  const authBaseDir = getAuthBaseDir();
  const screenshotsDir = `${authBaseDir}/screenshots`;
  if (fs.existsSync(screenshotsDir)) {
    console.log(`📁 Screenshots directory: ${screenshotsDir}`);
  }
}

/**
 * Get MS Auth configuration from environment
 * Useful for programmatic access
 */
export async function getMsAuthConfig(): Promise<any> {
  return loadConfigFromEnv();
}

// CLI execution - ES module compatible
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isMainModule =
  process.argv[1] === __filename ||
  import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`;

if (isMainModule) {
  // Check for --headful flag
  const headless = !process.argv.includes("--headful");

  loginToMicrosoft(headless)
    .then(() => {
      console.log("\n🎉 Login complete! You can now run authenticated tests.");
      console.log("\n💡 Run tests with: npm run test:e2e");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Login failed:", error.message);
      console.log("\n💡 Check your .env file has:");
      console.log("   - MS_AUTH_EMAIL");
      console.log(
        '   - MS_AUTH_CREDENTIAL_TYPE (optional, defaults to "password")'
      );
      console.log(
        '   - MS_AUTH_CREDENTIAL_PROVIDER (optional, defaults to "environment")'
      );
      console.log('   - MS_AUTH_ENV_VARIABLE_NAME (e.g., "MS_USER_PASSWORD")');
      console.log("   - MS_USER_PASSWORD (your actual password)");
      console.log("   - MS_SHAREPOINT_URL");
      console.log("\n💡 Run with --headful to see the browser:");
      console.log("   npm run login -- --headful");
      process.exit(1);
    });
}
