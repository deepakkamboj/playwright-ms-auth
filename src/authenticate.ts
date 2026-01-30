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
    const targetBaseDomain = new URL(targetUrl).hostname.split('.').slice(-3).join('.'); // e.g., "test.powerapps.com"

    try {
      // Try to wait for the exact URL first
      await page.waitForURL(targetUrl, { timeout: 5000 });
    } catch {
      // If exact URL doesn't match, check if we're on the same base domain or at least off the login page
      const currentUrl = page.url();
      const currentHostname = new URL(currentUrl).hostname;
      const currentBaseDomain = currentHostname.split('.').slice(-3).join('.');

      // Success if we're on same base domain (e.g., *.test.powerapps.com) or same origin
      const isOnTargetDomain = currentUrl.startsWith(targetDomain) || currentBaseDomain === targetBaseDomain;
      // Also success if we're no longer on the login page
      const loginEndpointHost = config.loginEndpoint || DEFAULT_LOGIN_ENDPOINT;
      const isOffLoginPage = !currentHostname.includes(loginEndpointHost);

      if (!isOnTargetDomain && !isOffLoginPage) {
        throw new Error(
          `Authentication may have failed. Expected to be on ${targetDomain} or similar, but got ${currentUrl}`
        );
      }
      log(`[MsAuth] Redirected to ${currentUrl} (authentication successful)`);
    }

    // Wait for MSAL tokens to be stored in localStorage (if enabled)
    if (config.waitForMsalTokens !== false) {
      const timeout = config.msalTokenTimeout || 30000;
      const tokensFound = await waitForMsalTokens(page, timeout);

      if (tokensFound) {
        log(`[MsAuth] MSAL tokens detected in localStorage`);
      } else {
        log(`[MsAuth] ##[warning]No MSAL tokens found - continuing anyway`);
      }
    }

    // Give it a bit more time for any final writes to complete
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
  try {
    await waitForCertAuthResponse(page, endpoint, 60000);
  } catch (timeoutError) {
    log(
      `[MsAuth] ##[warning]Certificate authentication response not detected - this may be okay if auth flow changed`
    );
    // Continue anyway - the cert auth might have succeeded without the expected response
  }

  // Check for certificate validation errors
  const certFailure = page.getByRole("heading", {
    name: /Certificate validation failed|We couldn't sign you in with a certificate/i,
  });

  if (await certFailure.isVisible({ timeout: 5000 }).catch(() => false)) {
    const failureText = await certFailure.textContent();
    log(`[MsAuth] ##[error]Certificate authentication failed: ${failureText}`);

    // Try to get error details
    const moreDetails = page.getByRole("button", { name: "More details" });
    if (await moreDetails.isVisible({ timeout: 5000 }).catch(() => false)) {
      await moreDetails.click();
      await page
        .context()
        .grantPermissions(["clipboard-read"])
        .catch(() => {});
      const copyButton = page.getByRole("button", { name: "Copy" });
      if (await copyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
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

  // Wait a bit for any post-auth UI to load
  await page.waitForTimeout(2000);
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
 * Wait for MSAL tokens to be stored in localStorage
 * This ensures SPAs have time to initialize and store authentication tokens
 */
async function waitForMsalTokens(
  page: Page,
  timeoutMs: number = 30000
): Promise<boolean> {
  log(`[MsAuth] Waiting for MSAL tokens in localStorage (timeout: ${timeoutMs}ms)`);

  try {
    // Poll localStorage for MSAL-related keys
    await page.waitForFunction(
      `() => {
        const keys = Object.keys(localStorage);
        const hasMsalKeys = keys.some(key =>
          key.startsWith('msal.') ||
          key.includes('accessToken') ||
          key.includes('idToken') ||
          key.includes('account') ||
          key.includes('.login.windows.net') ||
          key.includes('.microsoftonline.com')
        );
        return hasMsalKeys && keys.length > 0;
      }`,
      { timeout: timeoutMs }
    );

    // Log found keys for debugging
    const msalKeys = await page.evaluate(`() => {
      return Object.keys(localStorage).filter(key =>
        key.startsWith('msal.') ||
        key.includes('accessToken') ||
        key.includes('idToken') ||
        key.includes('account') ||
        key.includes('.login.windows.net') ||
        key.includes('.microsoftonline.com')
      );
    }`) as string[];

    log(`[MsAuth] Found ${msalKeys.length} MSAL-related localStorage keys`);
    if (msalKeys.length > 0) {
      log(`[MsAuth] MSAL keys: ${msalKeys.slice(0, 5).join(', ')}${msalKeys.length > 5 ? '...' : ''}`);
    }

    return true;
  } catch (error) {
    log(`[MsAuth] ##[warning]Timeout waiting for MSAL tokens - tokens may not be present in localStorage`);

    // Log what's actually in localStorage for debugging
    const allKeys = await page.evaluate(`() => Object.keys(localStorage)`).catch(() => []) as string[];
    log(`[MsAuth] Found ${allKeys.length} total localStorage keys: ${allKeys.slice(0, 10).join(', ')}${allKeys.length > 10 ? '...' : ''}`);

    return false;
  }
}

/**
 * Handle "Stay signed in?" prompt
 */
async function handleStaySignedIn(page: Page): Promise<void> {
  log(`[MsAuth] Checking for 'Stay signed in?' prompt...`);
  
  // Try multiple selectors for better compatibility
  const staySignedInHeading = page.getByRole("heading", { name: /stay signed in/i });
  const staySignedInText = page.getByText(/stay signed in/i);
  const yesButton = page.getByRole("button", { name: /^yes$/i });
  const noButton = page.getByRole("button", { name: /^no$/i });

  // Check if the prompt is visible
  const isPromptVisible = await Promise.race([
    staySignedInHeading.isVisible({ timeout: 10000 }).catch(() => false),
    staySignedInText.isVisible({ timeout: 10000 }).catch(() => false),
  ]);

  if (isPromptVisible) {
    log(`[MsAuth] 'Stay signed in?' prompt detected - clicking Yes`);
    
    // Click Yes button
    await yesButton.click({ timeout: 5000 }).catch(async () => {
      log(`[MsAuth] Failed to click Yes button by role, trying alternative selector`);
      await page.locator('input[type="submit"][value="Yes"]').click();
    });
    
    log(`[MsAuth] Clicked 'Yes' on stay signed in prompt`);
    
    // Wait for navigation after clicking
    await page.waitForTimeout(2000);
  } else {
    log(`[MsAuth] No 'Stay signed in?' prompt detected`);
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
