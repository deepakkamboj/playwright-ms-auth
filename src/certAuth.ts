import type { Route, Request, Page } from "@playwright/test";
import { Agent, AgentOptions, request as https } from "node:https";
import { log } from "./utils";

const DEFAULT_AUTH_ENDPOINT = "login.microsoftonline.com";

export interface CertAuthOptions {
  /** The certificate for the user as a pfx buffer or base64 string */
  pfx: Buffer | string;

  /** Optional passphrase for the certificate */
  passphrase?: string;

  /**
   * The authentication endpoint e.g. login.microsoftonline.com or login.microsoftonline.us
   * @default 'login.microsoftonline.com'
   */
  authEndpoint?: string;
}

/**
 * Add certificate authentication route handler to the page
 */
export async function addCertAuthRoute(
  page: Page,
  options: CertAuthOptions
): Promise<void> {
  const endpoint = options.authEndpoint || DEFAULT_AUTH_ENDPOINT;
  const uri = getCertAuthGlob(endpoint);
  const { pfx, passphrase } = options;

  log(
    `[CertAuth] Adding certificate authentication route for endpoint: ${endpoint}`
  );
  await page.route(uri, certAuthHandler({ pfx, passphrase }));
}

/**
 * Create handler for certificate authentication requests
 * See https://learn.microsoft.com/en-us/entra/identity/authentication/concept-certificate-based-authentication-technical-deep-dive
 */
function certAuthHandler(options: AgentOptions) {
  return async (route: Route, request: Request) => {
    try {
      log(
        `[CertAuth] Handling certificate authentication request to ${request.url()}`
      );
      const resp = await doCertAuthPost(request, options);
      await route.fulfill(resp);
      log(
        `[CertAuth] Certificate authentication request completed with status ${resp.status}`
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log(`[CertAuth] ##[error]Failed to send cert auth request: ${message}`);
      await route.abort("failed");
    }
  };
}

/**
 * Perform certificate authentication POST request
 */
function doCertAuthPost(request: Request, options: AgentOptions) {
  return new Promise<{
    status: number;
    headers: Record<string, string>;
    body: string;
  }>((resolve, reject) => {
    const agent = new Agent(options);
    const req = https(request.url(), {
      method: "POST",
      headers: request.headers(),
      agent,
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("response", (res) => {
      if (res.statusCode! >= 400) {
        reject(
          new Error(
            `Cert auth request failed: ${res.statusCode} ${res.statusMessage}`
          )
        );
        return;
      }

      let data = "";
      res.on("data", (chunk) => {
        data += Buffer.from(chunk).toString("utf-8");
      });

      res.on("end", () => {
        resolve({
          status: res.statusCode!,
          headers: res.headers as any,
          body: data,
        });
      });
    });

    req.write(request.postData());
    req.end();
  });
}

/**
 * Wait for certificate authentication response
 */
export function waitForCertAuthResponse(
  page: Page,
  endpoint?: string
): Promise<void> {
  const authEndpoint = endpoint || DEFAULT_AUTH_ENDPOINT;
  const glob = getCertAuthGlob(authEndpoint);
  return page.waitForResponse(glob).then(() => {});
}

/**
 * Get glob pattern for certificate authentication endpoint
 */
function getCertAuthGlob(endpoint: string): string {
  return `https://*certauth.${endpoint}/**`;
}
