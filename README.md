# Playwright Microsoft Authentication

[![CI](https://github.com/deepakkamboj/playwright-ms-auth/actions/workflows/ci.yml/badge.svg)](https://github.com/deepakkamboj/playwright-ms-auth/actions/workflows/ci.yml)
[![NPM Version](https://img.shields.io/npm/v/playwright-ms-auth.svg)](https://www.npmjs.com/package/playwright-ms-auth)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.44-green?logo=playwright)](https://playwright.dev/)
[![Azure](https://img.shields.io/badge/Azure-KeyVault-0078D4?logo=microsoftazure)](https://azure.microsoft.com/)

> Enterprise-grade authentication solution for Playwright E2E tests with Microsoft Entra ID (formerly Azure AD)

A robust, production-ready authentication framework that simplifies Microsoft identity integration in Playwright test suites. Built with the Abstract Factory pattern, it supports both password and certificate-based authentication across multiple credential providers including Azure KeyVault, local files, environment variables, and GitHub Secrets.

Perfect for enterprise test automation requiring secure, reusable authentication flows with multi-region support and smart session caching. Get started in seconds with just email and password, or use enterprise-grade providers like Azure KeyVault for production.

## Tech Stack

### Core Dependencies

- **[Playwright](https://playwright.dev/)** (v1.44.1) - Browser automation framework
- **[TypeScript](https://www.typescriptlang.org/)** (v5.4.4) - Type-safe development
- **[Commander.js](https://github.com/tj/commander.js)** (v11.0.0) - CLI framework
- **[@azure/keyvault-secrets](https://www.npmjs.com/package/@azure/keyvault-secrets)** (v4.8.0) - Azure KeyVault integration
- **[@azure/identity](https://www.npmjs.com/package/@azure/identity)** (v4.2.1) - Azure authentication

### Runtime Requirements

- **Node.js** ≥18
- **Playwright Chromium** browser

### Build & Development

- **TypeScript Compiler** - ES2020 target, ESM modules
- **Rimraf** - Cross-platform file cleanup

## Features

- 🔐 **Multiple Authentication Methods**: Password and certificate-based authentication
- 🏭 **Abstract Factory Pattern**: Easily extensible credential provider system
- ☁️ **Multiple Providers**: Azure KeyVault, Local File, Environment Variables, GitHub Secrets
- 🌍 **Multi-Region Support**: Works with different Microsoft Entra endpoints
- 🔧 **CLI Tool**: Full-featured command-line interface with direct password support
- 🌳 **Environment Variables**: Complete configuration via environment variables
- 💾 **Smart Caching**: Automatic storage state management with expiration
- 📝 **TypeScript**: Full type safety and IntelliSense support
- 🐛 **Debug Logging**: Comprehensive logging for troubleshooting
- ⚡ **Zero Config for Simple Cases**: Just email and password to get started

## Installation

```bash
npm install playwright-ms-auth
```

## Quick Start

### Using CLI

```bash
# Simple password authentication (for testing/development)
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --password "your-password"

# Run in headful mode (visible browser window)
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --password "your-password" \
  --headful

# Authenticate with Azure KeyVault (recommended for production)
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --credential-provider azure-keyvault \
  --keyvault-endpoint https://your-vault.vault.azure.net \
  --keyvault-secret your-secret-name

# Authenticate with local certificate file
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --credential-type certificate \
  --credential-provider local-file \
  --local-file ./cert.pfx
```

### Using Programmatically

```typescript
import { authenticate, loadConfigFromEnv } from "playwright-ms-auth";

// Load configuration from environment variables
const config = loadConfigFromEnv();

// Perform authentication
await authenticate(config, "https://your-app.com");
```

### In Playwright Tests

```typescript
import { test as base } from "@playwright/test";
import { loadStorageState, type MsAuthConfig } from "playwright-ms-auth";

const config: MsAuthConfig = {
  email: "user@company.com",
  credentialType: "certificate",
  credentialProvider: "azure-keyvault",
  providerConfig: {
    keyVaultEndpoint: "https://your-vault.vault.azure.net",
    secretName: "your-cert-secret",
  },
};

const test = base.extend({
  context: async ({ browser }, use) => {
    const storagePath = await loadStorageState(config);
    const context = await browser.newContext({ storageState: storagePath });
    await use(context);
    await context.close();
  },
});

test("authenticated test", async ({ page }) => {
  await page.goto("https://your-app.com");
  // You're already authenticated!
});
```

## Credential Providers

### Azure KeyVault

Store credentials securely in Azure KeyVault.

```typescript
const config: MsAuthConfig = {
  email: "user@company.com",
  credentialType: "certificate", // or 'password'
  credentialProvider: "azure-keyvault",
  providerConfig: {
    keyVaultEndpoint: "https://your-vault.vault.azure.net",
    secretName: "your-secret-name",
    secretVersion: "latest", // optional
  },
};
```

**Environment Variables:**

- `MS_AUTH_KEYVAULT_ENDPOINT`
- `MS_AUTH_KEYVAULT_SECRET_NAME`

### Local File

Read credentials from local file system.

```typescript
const config: MsAuthConfig = {
  email: "user@company.com",
  credentialType: "certificate",
  credentialProvider: "local-file",
  providerConfig: {
    filePath: "./path/to/cert.pfx",
    certificatePassword: "optional-password", // for encrypted certificates
  },
};
```

**Environment Variables:**

- `MS_AUTH_LOCAL_FILE_PATH`
- `MS_AUTH_CERTIFICATE_PASSWORD`

### Environment Variables

Read credentials directly from environment variables. **Also used when passing `--password` via CLI.**

```typescript
const config: MsAuthConfig = {
  email: "user@company.com",
  credentialType: "password",
  credentialProvider: "environment",
  providerConfig: {
    variableName: "MY_PASSWORD_VAR",
  },
};
```

**CLI Usage:**

```bash
# Direct password (automatically uses environment provider)
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --password "your-password"

# Or use environment variable
export MY_PASSWORD_VAR="your-password"
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --credential-provider environment \
  --env-variable MY_PASSWORD_VAR
```

**Environment Variables:**

- `MS_AUTH_ENV_VARIABLE_NAME`

⚠️ **Security Note**: Using `--password` directly in CLI is not recommended for production. Use Azure KeyVault or other secure providers instead.

### GitHub Secrets

Use GitHub Actions secrets (reads from environment).

```typescript
const config: MsAuthConfig = {
  email: "user@company.com",
  credentialType: "certificate",
  credentialProvider: "github-secrets",
  providerConfig: {
    repository: "owner/repo",
    secretName: "MY_CERT_SECRET",
  },
};
```

**Environment Variables:**

- `MS_AUTH_GITHUB_REPOSITORY`
- `MS_AUTH_GITHUB_SECRET_NAME`
- `MS_AUTH_GITHUB_TOKEN` (optional)

## Environment Variables

All configuration can be provided via environment variables. Run `npx ms-auth env-help` for complete list.

### Core Configuration

- `MS_AUTH_EMAIL` - User email address
- `MS_AUTH_CREDENTIAL_TYPE` - `password` or `certificate`
- `MS_AUTH_CREDENTIAL_PROVIDER` - Provider type (auto-set to `environment` when using `--password`)
- `MS_AUTH_OUTPUT_DIR` - Directory for storage state files (defaults to project root)
- `MS_AUTH_LOGIN_ENDPOINT` - Entra endpoint (default: `login.microsoftonline.com`)
- `MS_AUTH_STORAGE_STATE_EXPIRATION` - Hours until state expires (default: 24)
- `MS_AUTH_WAIT_FOR_MSAL_TOKENS` - Wait for MSAL tokens in localStorage (`true`/`false`, default: `true`)
- `MS_AUTH_MSAL_TOKEN_TIMEOUT` - Max time to wait for MSAL tokens in milliseconds (default: 30000)
- `SYSTEM_DEBUG` - Enable detailed debug logging (`true`/`false`, default: `false`)

### Debugging

Enable detailed logging to troubleshoot authentication issues:

```bash
# Enable debug logging via environment variable
export SYSTEM_DEBUG=true
npx ms-auth login --url https://your-app.com --email user@company.com --password "your-password"

# Or inline
SYSTEM_DEBUG=true npx ms-auth login --url https://your-app.com --email user@company.com --password "your-password"

# In .env file
SYSTEM_DEBUG=true
```

When `SYSTEM_DEBUG=true`, you'll see detailed logs including:

- Authentication flow steps
- Credential provider operations
- Browser launch parameters
- Storage state paths
- Screenshot locations
- URL redirects and navigation events

### Quick Reference

| Use Case                  | Command                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Development/Testing**   | `npx ms-auth login --url <url> --email <email> --password <pwd>`                                                                               |
| **Production (KeyVault)** | `npx ms-auth login --url <url> --email <email> --credential-provider azure-keyvault --keyvault-endpoint <endpoint> --keyvault-secret <secret>` |
| **Certificate Auth**      | `npx ms-auth login --url <url> --email <email> --credential-type certificate --credential-provider local-file --local-file <path>`             |
| **Environment Var**       | `npx ms-auth login --url <url> --email <email> --credential-provider environment --env-variable MY_VAR`                                        |

## Architecture

### High-Level Architecture

```mermaid
flowchart TB
    subgraph CLI["CLI Layer"]
        CMD[ms-auth CLI]
    end

    subgraph Core["Core Authentication"]
        AUTH[authenticate.ts]
        CERT[certAuth.ts]
        CONFIG[config.ts]
    end

    subgraph Factory["Factory Pattern"]
        FACTORY[CredentialProviderFactory]
    end

    subgraph Providers["Credential Providers"]
        AKV[AzureKeyVaultProvider]
        LOCAL[LocalFileProvider]
        ENV[EnvironmentProvider]
        GH[GitHubSecretsProvider]
    end

    subgraph Storage["State Management"]
        UTILS[utils.ts]
        CACHE[(Storage State Cache)]
    end

    subgraph Browser["Playwright Browser"]
        PW[Chromium Browser]
        ENTRA[Microsoft Entra ID]
    end

    CMD --> CONFIG
    CONFIG --> AUTH
    AUTH --> FACTORY
    FACTORY --> AKV
    FACTORY --> LOCAL
    FACTORY --> ENV
    FACTORY --> GH
    AUTH --> CERT
    AUTH --> UTILS
    UTILS --> CACHE
    AUTH --> PW
    PW --> ENTRA
    ENTRA --> CACHE
```

### Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Config
    participant Factory
    participant Provider
    participant Auth
    participant Browser
    participant Entra
    participant Storage

    User->>CLI: ms-auth login
    CLI->>Config: Load configuration
    Config->>Factory: Create provider
    Factory->>Provider: Instantiate

    Auth->>Storage: Check cached state
    alt State valid
        Storage-->>Auth: Return cached state
    else State expired/missing
        Auth->>Provider: Get credential
        Provider-->>Auth: Return credential
        Auth->>Browser: Launch browser
        Browser->>Entra: Navigate to login

        alt Certificate Auth
            Auth->>Browser: Intercept cert request
            Browser->>Entra: Present certificate
        else Password Auth
            Auth->>Browser: Fill password
            Browser->>Entra: Submit password
        end

        Entra-->>Browser: Authentication success
        Browser-->>Auth: Session cookies
        Auth->>Storage: Save storage state
    end

    Storage-->>User: Authentication complete
```

### Factory Pattern Implementation

```mermaid
classDiagram
    class CredentialProvider {
        <<abstract>>
        +getProviderName() string
        +validateConfig() void
        +getCredential()* CredentialResult
    }

    class AzureKeyVaultProvider {
        -keyVaultEndpoint: string
        -secretName: string
        +getCredential() CredentialResult
        -createKeyVaultClient() SecretClient
    }

    class LocalFileProvider {
        -filePath: string
        -certificatePassword?: string
        +getCredential() CredentialResult
        -detectCredentialType() CredentialType
    }

    class EnvironmentProvider {
        -variableName: string
        +getCredential() CredentialResult
    }

    class GitHubSecretsProvider {
        -repository: string
        -secretName: string
        +getCredential() CredentialResult
    }

    class CredentialProviderFactory {
        +createProvider(type, config) CredentialProvider
        +getSupportedProviders() string[]
    }

    class MsAuthConfig {
        +email: string
        +credentialType: CredentialType
        +credentialProvider: ProviderType
        +providerConfig: ProviderConfig
    }

    CredentialProvider <|-- AzureKeyVaultProvider
    CredentialProvider <|-- LocalFileProvider
    CredentialProvider <|-- EnvironmentProvider
    CredentialProvider <|-- GitHubSecretsProvider
    CredentialProviderFactory ..> CredentialProvider : creates
    MsAuthConfig ..> CredentialProviderFactory : configures
```

### Data Flow Diagram

```mermaid
flowchart LR
    subgraph Input["Configuration Sources"]
        ENV_VARS[Environment Variables]
        CLI_ARGS[CLI Arguments]
        CODE[Programmatic Config]
    end

    subgraph Processing["Processing"]
        CONFIG_LOADER[Config Loader]
        VALIDATOR[Config Validator]
    end

    subgraph Credential["Credential Retrieval"]
        KV[(Azure KeyVault)]
        FS[(File System)]
        ENV_SYS[(Environment)]
        GH_API[(GitHub API)]
    end

    subgraph Auth["Authentication"]
        BROWSER[Browser Session]
        CERT_HANDLER[Certificate Handler]
        PWD_HANDLER[Password Handler]
    end

    subgraph Output["Output"]
        STATE_FILE[Storage State File]
        LOGS[Debug Logs]
    end

    ENV_VARS --> CONFIG_LOADER
    CLI_ARGS --> CONFIG_LOADER
    CODE --> CONFIG_LOADER
    CONFIG_LOADER --> VALIDATOR

    VALIDATOR --> KV
    VALIDATOR --> FS
    VALIDATOR --> ENV_SYS
    VALIDATOR --> GH_API

    KV --> CERT_HANDLER
    FS --> CERT_HANDLER
    ENV_SYS --> PWD_HANDLER
    GH_API --> CERT_HANDLER

    CERT_HANDLER --> BROWSER
    PWD_HANDLER --> BROWSER

    BROWSER --> STATE_FILE
    BROWSER --> LOGS
```

### Provider Hierarchy

```mermaid
graph TD
    A[CredentialProvider<br/>Abstract Base Class] --> B[AzureKeyVaultProvider]
    A --> C[LocalFileProvider]
    A --> D[EnvironmentProvider]
    A --> E[GitHubSecretsProvider]

    B --> B1[Uses ChainedTokenCredential]
    B --> B2[Supports AzureCLI, PowerShell,<br/>Developer, Interactive]

    C --> C1[Auto-detects file type]
    C --> C2[Supports .pfx, .p12, .txt, .pwd]

    D --> D1[Direct env var access]
    D --> D2[Auto-detects credential type]

    E --> E1[Reads GitHub Actions secrets]
    E --> E2[Converts to env vars]

    style A fill:#e1f5ff
    style B fill:#d4edda
    style C fill:#d4edda
    style D fill:#d4edda
    style E fill:#d4edda
```

### Code Structure

```
playwright-ms-auth/
├── src/
│   ├── types.ts              # Type definitions & interfaces
│   ├── config.ts             # Environment variable loader
│   ├── authenticate.ts       # Main authentication orchestration
│   ├── certAuth.ts           # Certificate auth route handler
│   ├── utils.ts              # Logging & storage utilities
│   ├── cli.ts                # Command-line interface
│   ├── index.ts              # Public API exports
│   └── providers/
│       ├── CredentialProvider.ts          # Abstract base class
│       ├── AzureKeyVaultProvider.ts       # KeyVault implementation
│       ├── LocalFileProvider.ts           # File system implementation
│       ├── EnvironmentProvider.ts         # Environment var implementation
│       ├── GitHubSecretsProvider.ts       # GitHub secrets implementation
│       ├── CredentialProviderFactory.ts   # Factory pattern
│       └── index.ts                       # Provider exports
├── examples/
│   ├── msLogin.ts            # Example authentication helper
│   ├── .env.example          # Environment template
│   ├── package.json          # Example dependencies
│   └── README.md             # Example documentation
├── bin/
│   └── ms-auth               # CLI executable
├── package.json
├── tsconfig.json
└── README.md
```

## Examples

Check out the [`examples/`](./examples) directory for a complete working example:

```bash
cd examples
npm install
npm run login
```

The example includes:

- 📝 Ready-to-use authentication helper (`msLogin.ts`)
- 🔧 Pre-configured environment file
- 📚 Complete documentation
- ⚡ NPM scripts for easy execution

See [`examples/README.md`](./examples/README.md) for details.

## Abstract Factory Pattern

The package uses the **Abstract Factory Pattern** for extensibility:

```
CredentialProvider (abstract)
├── AzureKeyVaultProvider
├── LocalFileProvider
├── EnvironmentProvider
└── GitHubSecretsProvider

CredentialProviderFactory
└── createProvider(type, config)
```

### Adding Custom Providers

```typescript
import { CredentialProvider, type CredentialResult } from "playwright-ms-auth";

class MyCustomProvider extends CredentialProvider {
  getProviderName(): string {
    return "My Custom Provider";
  }

  validateConfig(): void {
    // Validate your config
  }

  async getCredential(): Promise<CredentialResult> {
    // Retrieve credential from your source
    return {
      type: "password",
      value: "my-password",
    };
  }
}
```

## Troubleshooting & FAQ

### Authentication Issues

**Q: Browser is not visible when using `--headful` flag**

A: Make sure you're running the latest version and that Microsoft Edge is installed. The package uses Edge for better Windows compatibility.

```bash
# Verify Edge channel is working
npx playwright install msedge
```

**Q: Authentication times out waiting for redirect**

A: This usually happens when SharePoint redirects to a different page after login. The package automatically handles redirects to any page on the same domain. Enable debug logging to see the actual redirect:

```bash
SYSTEM_DEBUG=true npx ms-auth login --url https://your-site.com --email user@company.com --password "pwd"
```

**Q: "page.waitForURL: Timeout exceeded" error**

A: The authentication may have succeeded but redirected to a different page than expected. Check the logs for "navigated to" message. This is normal for SharePoint sites that redirect to home pages.

**Q: Screenshot saved to wrong location**

A: Screenshots are saved to `<project-root>/screenshots/` by default. To change this, set `MS_AUTH_OUTPUT_DIR`:

```bash
export MS_AUTH_OUTPUT_DIR=/path/to/custom/dir
```

### Storage State Issues

**Q: Where are storage state files saved?**

A: By default, storage state files are saved to `<project-root>/.playwright-ms-auth/state-{email}.json`. You can customize this with the `MS_AUTH_OUTPUT_DIR` environment variable.

**Q: How long do storage states last?**

A: Storage states expire after 24 hours by default. Configure with `MS_AUTH_STORAGE_STATE_EXPIRATION` (in hours):

```bash
export MS_AUTH_STORAGE_STATE_EXPIRATION=48  # 48 hours
```

**Q: How do I force re-authentication?**

A: Delete the storage state file or use the CLI:

```bash
# Find and delete the storage state file
rm .playwright-ms-auth/state-your-email@company.com.json

# Or use clearAuth from examples
npm run clear-auth
```

### Debugging

**Q: How do I enable detailed logging?**

A: Set `SYSTEM_DEBUG=true` to see detailed authentication flow:

```bash
# Temporary (command line)
SYSTEM_DEBUG=true npx ms-auth login --url https://site.com --email user@company.com --password "pwd"

# Permanent (in .env file)
SYSTEM_DEBUG=true
```

Debug logs include:

- Credential provider operations
- Browser launch parameters (headless/headful)
- Storage state paths
- Screenshot locations
- Navigation events and redirects
- Authentication flow steps

**Q: Authentication succeeds but I get errors in my tests**

A: Verify the storage state file exists and check its timestamp:

```bash
# Check if file exists and when it was created
ls -la .playwright-ms-auth/state-*.json

# View file contents (check cookies)
cat .playwright-ms-auth/state-*.json
```

**Q: Authentication succeeds but no MSAL tokens in localStorage**

A: This issue commonly occurs with Single Page Applications (SPAs) like Power Platform, where the app needs time to initialize MSAL and write tokens to localStorage after authentication completes.

By default, the library waits up to 30 seconds for MSAL tokens to appear in localStorage before saving the storage state. If your app takes longer, you can increase the timeout:

```bash
# Increase MSAL token timeout to 60 seconds
export MS_AUTH_MSAL_TOKEN_TIMEOUT=60000
npx ms-auth login --url https://your-spa.com --email user@company.com --password "pwd"

# Or disable MSAL token waiting entirely (not recommended for SPAs)
export MS_AUTH_WAIT_FOR_MSAL_TOKENS=false
npx ms-auth login --url https://your-spa.com --email user@company.com --password "pwd"
```

Programmatically:

```typescript
const config: MsAuthConfig = {
  email: "user@company.com",
  credentialType: "password",
  credentialProvider: "environment",
  providerConfig: { variableName: "MY_PASSWORD" },
  waitForMsalTokens: true,  // default: true
  msalTokenTimeout: 60000,  // default: 30000 (30 seconds)
};

await authenticate(config, "https://your-spa.com");
```

The library looks for common MSAL storage patterns in localStorage:
- Keys starting with `msal.` (MSAL.js v1)
- Keys containing `accessToken`, `idToken`, `account`
- Keys containing `.login.windows.net` or `.microsoftonline.com`

Enable debug logging to see which keys were found:

```bash
SYSTEM_DEBUG=true npx ms-auth login --url https://your-spa.com --email user@company.com --password "pwd"
```

**Q: Getting "Cannot find module" errors**

A: Make sure to rebuild after making changes:

```bash
npm run build

# If using examples directory
cd examples
rm -rf node_modules/playwright-ms-auth
npm install
```

### Certificate Authentication

**Q: Certificate authentication fails with validation error**

A: Ensure:

1. Certificate is in PFX/P12 format
2. Certificate is not expired
3. Certificate password is correct (if encrypted)
4. Certificate is trusted by the Entra tenant

**Q: How do I convert PEM to PFX?**

```bash
openssl pkcs12 -export -out cert.pfx -inkey private.key -in certificate.crt
```

### Production Issues

**Q: Should I use `--password` flag in production?**

A: No. Use Azure KeyVault or other secure credential providers for production:

```bash
# Production (Azure KeyVault)
npx ms-auth login \
  --url https://your-site.com \
  --email user@company.com \
  --credential-provider azure-keyvault \
  --keyvault-endpoint https://vault.vault.azure.net \
  --keyvault-secret secret-name
```

**Q: How do I handle multiple environments?**

A: Use different `.env` files or environment-specific configuration:

```bash
# Development
SYSTEM_DEBUG=true npm run login

# Production
MS_AUTH_CREDENTIAL_PROVIDER=azure-keyvault npm run login
```

**Q: Can I use this in CI/CD pipelines?**

A: Yes! Use GitHub Secrets or Azure KeyVault providers:

```yaml
# GitHub Actions example
- name: Authenticate
  env:
    MS_AUTH_EMAIL: ${{ secrets.MS_AUTH_EMAIL }}
    MS_USER_PASSWORD: ${{ secrets.MS_USER_PASSWORD }}
    MS_AUTH_CREDENTIAL_PROVIDER: environment
    MS_AUTH_ENV_VARIABLE_NAME: MS_USER_PASSWORD
  run: npx ms-auth login --url https://your-site.com
```

## License

MIT
