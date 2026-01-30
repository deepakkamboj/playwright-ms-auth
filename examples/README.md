# Examples

This folder contains example implementations showing how to use `playwright-ms-auth` in your projects.

## Files

### `msLogin.ts`

A helper module for Microsoft/SharePoint authentication with convenient utility functions.

**Features:**

- ✅ Simple login function
- ✅ Check for valid authentication
- ✅ Get auth file path
- ✅ Clear saved authentication
- ✅ CLI execution support

**Usage:**

```typescript
import { loginToMicrosoft, hasValidAuth, getAuthFilePath } from "./msLogin";

// Login
await loginToMicrosoft();

// Check if authenticated
const isAuthenticated = await hasValidAuth();

// Get storage state path
const authPath = await getAuthFilePath();
```

**CLI Usage:**

```bash
# Run from examples directory
cd examples
npm install

# Headless mode (default)
npm run login

# Headful mode (visible browser window)
npm run login -- --headful
```

### `.env.example`

Template for environment variables configuration. Copy to `.env` and fill in your credentials.

### `.env`

Your actual credentials (⚠️ **DO NOT COMMIT THIS FILE**)

## Quick Start

1. **Install dependencies:**

   ```bash
   npm install playwright-ms-auth dotenv
   npm install -D tsx @types/node
   ```

2. **Configure environment:**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Run authentication:**

   ```bash
   npx tsx msLogin.ts
   ```

4. **Use in your tests:**

   ```typescript
   import { test } from "@playwright/test";
   import { getAuthFilePath } from "./msLogin";

   test.use({
     storageState: await getAuthFilePath(),
   });

   test("authenticated test", async ({ page }) => {
     await page.goto("https://yourcompany.sharepoint.com");
     // Already authenticated!
   });
   ```

## Environment Variables

### Required

- `MS_AUTH_EMAIL` - Your Microsoft email
- `MS_SHAREPOINT_URL` - SharePoint URL to authenticate against
- `MS_USER_PASSWORD` - Your password (for simple auth)

### Optional

- `MS_AUTH_CREDENTIAL_TYPE` - `password` or `certificate` (default: password)
- `MS_AUTH_CREDENTIAL_PROVIDER` - Provider type (default: environment)
- `MS_AUTH_OUTPUT_DIR` - Custom output directory
- `MS_AUTH_WAIT_FOR_MSAL_TOKENS` - Wait for MSAL tokens (default: true)
- `MS_AUTH_MSAL_TOKEN_TIMEOUT` - MSAL token timeout in ms (default: 30000)
- `SYSTEM_DEBUG` - Enable debug logging

## Security Notes

⚠️ **Important:**

- Never commit `.env` files with real credentials
- Use Azure KeyVault for production environments
- The password method is suitable for development/testing only

## Troubleshooting

**Authentication fails:**

- Verify your credentials in `.env`
- Check the SharePoint URL is correct
- Enable debug mode: `SYSTEM_DEBUG=true`

**Storage state not found:**

- Run `npx tsx msLogin.ts` first to authenticate
- Check the auth file path with `getAuthFilePath()`

**Module not found:**

- Install dependencies: `npm install playwright-ms-auth dotenv`
- For TypeScript: `npm install -D tsx @types/node`

**MSAL tokens not found in localStorage:**

- For SPAs like Power Platform, the library automatically waits for MSAL tokens
- If your app takes longer than 30 seconds, increase the timeout:
  ```bash
  MS_AUTH_MSAL_TOKEN_TIMEOUT=60000 npm run login
  ```
- Enable debug mode to see which tokens were found:
  ```bash
  SYSTEM_DEBUG=true npm run login
  ```
