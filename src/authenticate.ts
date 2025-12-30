import type { Page, Browser, BrowserContext } from "@playwright/test";
import { expect, chromium } from "@playwright/test";
import type { MsAuthConfig, CredentialResult } from "./types";
import { CredentialProviderFactory } from "./providers";
import { addCertAuthRoute, waitForCertAuthResponse } from "./certAuth";
import {
  log,
  getStorageStatePath,
  getAuthScreenshotPath,
  ensureDirExists,
  isStorageStateValid,
} from "./utils";
import { createHash } from "node:crypto";

const DEFAULT_LOGIN_ENDPOINT = "login.microsoftonline.com";

/**
 * Perform Microsoft Entra authentication and save storage state
 */
export async function authenticate(
  config: MsAuthConfig,
  targetUrl: string
): Promise<void> {
  const storagePath = getStorageStatePath(config.email);

  // Check if existing storage state is still valid
  const isValid = await isStorageStateValid(
    storagePath,
    config.storageStateExpiration
  );
  if (isValid) {
    log(
      `[MsAuth] Storage state for '${config.email}' is still valid, skipping authentication`
    );
    return;
  }

  log(`[MsAuth] Starting authentication for '${config.email}'`);
  log(`[MsAuth] Credential provider: ${config.credentialProvider}`);
  log(`[MsAuth] Credential type: ${config.credentialType}`);
  if (config.headless === false) {
    log(`[MsAuth] Running in headful mode (visible browser)`);
  }

  // Create credential provider and retrieve credential
  const provider = CredentialProviderFactory.createProvider(
    config.credentialProvider,
    config.providerConfig
  );

  const credential = await provider.getCredential();

  // Validate credential type matches configuration
  if (credential.type !== config.credentialType) {
    log(
      `[MsAuth] ##[warning]Credential type mismatch: expected '${config.credentialType}' but got '${credential.type}'`
    );
  }

  // Launch browser and perform authentication
  const headlessMode = config.headless !== false;
  console.log(
    `[CONSOLE] About to launch browser with headless=${headlessMode} (config.headless=${config.headless})`
  );
  log(
    `[MsAuth] About to launch browser with headless=${headlessMode} (config.headless=${config.headless})`
  );

  const browser = await chromium.launch({
    headless: headlessMode,
    channel: "msedge", // Use Microsoft Edge for better Windows compatibility
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  console.log(
    `[CONSOLE] Browser launched successfully with headless=${headlessMode}`
  );
  log(`[MsAuth] Browser launched successfully`);

  try {
    await performAuthenticationFlow(
      browser,
      config,
      targetUrl,
      credential,
      storagePath
    );
    log(
      `[MsAuth] ##[section]Authentication completed successfully for '${config.email}'`
    );
  } finally {
    await browser.close();
  }
}

/**
 * Perform the actual authentication flow in the browser
 */
async function performAuthenticationFlow(
  browser: Browser,
  config: MsAuthConfig,
  targetUrl: string,
  credential: CredentialResult,
  storagePath: string
): Promise<void> {
  const context = await browser.newContext({
    storageState: undefined, // Start with fresh state
  });

  const page = await context.newPage();

  try {
    // Navigate to target URL which will redirect to login
    log(`[MsAuth] Navigating to ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

    // Verify we're on the Entra login page
    const loginEndpoint = config.loginEndpoint || DEFAULT_LOGIN_ENDPOINT;
    const loginUrlPattern = new RegExp(
      `https:\\/\\/${loginEndpoint.replace(/\./g, "\\.")}\\\/`
    );

    await expect(page, "Expected Entra sign-in page").toHaveURL(
      loginUrlPattern,
      { timeout: 30000 }
    );

    const actualEndpoint = new URL(page.url()).hostname;
    log(`[MsAuth] On Entra login page: ${actualEndpoint}`);

    // Enter email address
    log(`[MsAuth] Entering email: ${config.email}`);
    await page.getByRole("textbox", { name: "email" }).fill(config.email);
    await page.getByRole("button", { name: "next" }).click();

    // Handle authentication based on credential type
    if (credential.type === "certificate") {
      await handleCertificateAuth(
        page,
        credential.value as Buffer,
        actualEndpoint,
        config.email
      );
    } else {
      await handlePasswordAuth(page, credential.value as string, config.email);
    }

    // Handle "Stay signed in?" prompt
    await handleStaySignedIn(page);

    // Wait for redirect to target URL or any page on the same domain
    log(`[MsAuth] Waiting for redirect to target domain`);
    const targetDomain = new URL(targetUrl).origin;

    try {
      // Try to wait for the exact URL first
      await page.waitForURL(targetUrl, { timeout: 5000 });
    } catch {
      // If exact URL doesn't match, check if we're on the same domain (authentication succeeded)
      const currentUrl = page.url();
      if (!currentUrl.startsWith(targetDomain)) {
        throw new Error(
          `Authentication may have failed. Expected to be on ${targetDomain}, but got ${currentUrl}`
        );
      }
      log(`[MsAuth] Redirected to ${currentUrl} (authentication successful)`);
    }

    // Give it a bit more time for cookies to settle
    await page.waitForTimeout(2000);

    // Save storage state
    await ensureDirExists(
      getStorageStatePath(config.email).replace(/[^/\\\\]+$/, "")
    );
    await context.storageState({ path: storagePath });
    log(`[MsAuth] Saved storage state to ${storagePath}`);

    // Take success screenshot
    const screenshotPath = getAuthScreenshotPath(config.email, "success");
    await ensureDirExists(screenshotPath.replace(/[^/\\\\]+$/, ""));
    await page
      .screenshot({ path: screenshotPath, fullPage: true })
      .catch(() => {});
    log(`[MsAuth] Screenshot saved to ${screenshotPath}`);
  } catch (error) {
    // Take failure screenshot
    const screenshotPath = getAuthScreenshotPath(config.email, "failed");
    await ensureDirExists(screenshotPath.replace(/[^/\\\\]+$/, ""));
    await page
      .screenshot({ path: screenshotPath, fullPage: true })
      .catch(() => {});
    log(
      `[MsAuth] ##[error]Authentication failed. Screenshot: ${screenshotPath}`
    );

    throw error;
  } finally {
    await context.close();
  }
}

/**
 * Handle certificate-based authentication
 */
async function handleCertificateAuth(
  page: Page,
  certificate: Buffer,
  endpoint: string,
  email: string
): Promise<void> {
  log(`[MsAuth] Using certificate authentication`);

  // Log certificate fingerprint for debugging
  const fingerprint = createHash("sha256")
    .update(new Uint8Array(certificate))
    .digest("hex");
  log(`[MsAuth] Certificate fingerprint: ${fingerprint}`);
  log(`[MsAuth] Certificate size: ${certificate.byteLength} bytes`);

  // Add certificate authentication route
  await addCertAuthRoute(page, { pfx: certificate, authEndpoint: endpoint });

  // Handle account type selection if needed
  const workOrSchoolButton = page.getByRole("button", {
    name: "Work or school account",
  });
  if (
    await workOrSchoolButton.isVisible({ timeout: 5000 }).catch(() => false)
  ) {
    log(`[MsAuth] Selecting 'Work or school account'`);
    await workOrSchoolButton.click();
  }

  // Handle certificate selection if needed
  const certButton = page
    .getByRole("link", { name: "certificate" })
    .or(page.getByRole("button", { name: "certificate" }));

  if (await certButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    log(`[MsAuth] Selecting certificate authentication`);
    await certButton.click();
  }

  // Wait for certificate authentication to complete
  log(`[MsAuth] Waiting for certificate authentication response`);
  await waitForCertAuthResponse(page, endpoint);

  // Check for certificate validation errors
  const certFailure = page.getByRole("heading", {
    name: /Certificate validation failed|We couldn't sign you in with a certificate/i,
  });

  if (await certFailure.isVisible({ timeout: 2000 }).catch(() => false)) {
    const failureText = await certFailure.textContent();
    log(`[MsAuth] ##[error]Certificate authentication failed: ${failureText}`);

    // Try to get error details
    const moreDetails = page.getByRole("button", { name: "More details" });
    if (await moreDetails.isVisible({ timeout: 1000 }).catch(() => false)) {
      await moreDetails.click();
      await page
        .context()
        .grantPermissions(["clipboard-read"])
        .catch(() => {});
      const copyButton = page.getByRole("button", { name: "Copy" });
      if (await copyButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await copyButton.click();
        const errorDetails = await page
          .evaluate("navigator.clipboard.readText()")
          .catch(() => "");
        if (errorDetails) {
          log(`[MsAuth] ##[error]Error details: ${errorDetails}`);
        }
      }
    }

    throw new Error(
      `Certificate authentication failed for ${email}. Check Entra sign-in logs.`
    );
  }

  log(`[MsAuth] Certificate authentication successful`);
}

/**
 * Handle password-based authentication
 */
async function handlePasswordAuth(
  page: Page,
  password: string,
  email: string
): Promise<void> {
  log(`[MsAuth] Using password authentication`);

  // Wait for password field
  await page
    .getByRole("textbox", { name: "password" })
    .waitFor({ timeout: 10000 });

  // Enter password
  log(`[MsAuth] Entering password`);
  await page.getByRole("textbox", { name: "password" }).fill(password);
  await page
    .getByRole("button", { name: "submit" })
    .or(page.locator('input[type="submit"]'))
    .click();

  // Check for password errors
  await page.waitForTimeout(1000);
  const passwordError = page.locator("#passwordError, .has-error");
  if (await passwordError.isVisible().catch(() => false)) {
    const errorText = await passwordError.textContent().catch(() => "");
    log(`[MsAuth] ##[error]Password authentication failed: ${errorText}`);
    throw new Error(
      `Password authentication failed for ${email}. Please verify the password is correct.`
    );
  }

  log(`[MsAuth] Password authentication successful`);
}

/**
 * Handle "Stay signed in?" prompt
 */
async function handleStaySignedIn(page: Page): Promise<void> {
  const staySignedIn = page.getByRole("heading", { name: "Stay signed in?" });

  if (await staySignedIn.isVisible({ timeout: 5000 }).catch(() => false)) {
    log(`[MsAuth] Handling 'Stay signed in?' prompt`);
    await page.getByRole("button", { name: "Yes" }).click();
  }
}

/**
 * Load existing storage state into a browser context
 */
export async function loadStorageState(config: MsAuthConfig): Promise<string> {
  const storagePath = getStorageStatePath(config.email);

  const isValid = await isStorageStateValid(
    storagePath,
    config.storageStateExpiration
  );
  if (!isValid) {
    throw new Error(
      `Storage state for '${config.email}' does not exist or has expired. ` +
        `Please run authentication first.`
    );
  }

  return storagePath;
}
