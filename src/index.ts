/**
 * @paeng/playwright-ms-auth
 *
 * Flexible authentication framework for Playwright tests supporting
 * password and certificate authentication with multiple credential providers.
 */

export * from "./types";
export * from "./config";
export * from "./authenticate";
export * from "./certAuth";
export * from "./utils";
export * from "./providers";

// Re-export commonly used functions
export { authenticate, loadStorageState } from "./authenticate";
export { loadConfigFromEnv, validateConfig } from "./config";
export { CredentialProviderFactory } from "./providers";
