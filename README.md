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

Perfect for enterprise test automation requiring secure, reusable authentication flows with multi-region support and smart session caching.

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
- 🔧 **CLI Tool**: Full-featured command-line interface
- 🌳 **Environment Variables**: Complete configuration via environment variables
- 💾 **Smart Caching**: Automatic storage state management with expiration
- 📝 **TypeScript**: Full type safety and IntelliSense support
- 🐛 **Debug Logging**: Comprehensive logging for troubleshooting

## Installation

```bash
npm install playwright-ms-auth
```

## Quick Start

### Using CLI

```bash
# Authenticate with Azure KeyVault
npx ms-auth login \
  --url https://your-app.com \
  --email user@company.com \
  --credential-provider azure-keyvault \
  --keyvault-endpoint https://your-vault.vault.azure.net \
  --keyvault-secret your-secret-name \
  --debug

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

Read credentials directly from environment variables.

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

**Environment Variables:**

- `MS_AUTH_ENV_VARIABLE_NAME`

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
- `MS_AUTH_CREDENTIAL_PROVIDER` - Provider type
- `MS_AUTH_OUTPUT_DIR` - Directory for storage state files
- `MS_AUTH_LOGIN_ENDPOINT` - Entra endpoint (default: `login.microsoftonline.com`)
- `MS_AUTH_STORAGE_STATE_EXPIRATION` - Hours until state expires (default: 24)
- `SYSTEM_DEBUG` - Enable debug logging (`true`/`false`)

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
├── bin/
│   └── ms-auth               # CLI executable
├── package.json
├── tsconfig.json
└── README.md
```

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

## License

MIT
