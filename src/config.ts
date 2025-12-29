import type {
  MsAuthConfig,
  CredentialProviderType,
  CredentialType,
  AzureKeyVaultConfig,
  LocalFileConfig,
  EnvironmentConfig,
  GitHubSecretsConfig,
  ProviderConfig,
} from "./types";
import { EnvVars } from "./types";

/**
 * Load configuration from environment variables
 */
export function loadConfigFromEnv(): MsAuthConfig {
  const email = process.env[EnvVars.EMAIL];
  if (!email) {
    throw new Error(`${EnvVars.EMAIL} environment variable is required`);
  }

  const credentialType = (process.env[EnvVars.CREDENTIAL_TYPE] ||
    "password") as CredentialType;
  const credentialProvider = (process.env[EnvVars.CREDENTIAL_PROVIDER] ||
    "azure-keyvault") as CredentialProviderType;

  const providerConfig = loadProviderConfigFromEnv(credentialProvider);

  return {
    email,
    credentialType,
    credentialProvider,
    providerConfig,
    outputDir: process.env[EnvVars.OUTPUT_DIR],
    storageStateExpiration: process.env[EnvVars.STORAGE_STATE_EXPIRATION]
      ? parseInt(process.env[EnvVars.STORAGE_STATE_EXPIRATION]!)
      : 24,
    loginEndpoint: process.env[EnvVars.LOGIN_ENDPOINT],
  };
}

/**
 * Load provider-specific configuration from environment variables
 */
function loadProviderConfigFromEnv(
  providerType: CredentialProviderType
): ProviderConfig {
  switch (providerType) {
    case "azure-keyvault":
      return loadAzureKeyVaultConfigFromEnv();
    case "local-file":
      return loadLocalFileConfigFromEnv();
    case "environment":
      return loadEnvironmentConfigFromEnv();
    case "github-secrets":
      return loadGitHubSecretsConfigFromEnv();
    default:
      throw new Error(`Unsupported credential provider: ${providerType}`);
  }
}

function loadAzureKeyVaultConfigFromEnv(): AzureKeyVaultConfig {
  const keyVaultEndpoint = process.env[EnvVars.KEYVAULT_ENDPOINT];
  const secretName = process.env[EnvVars.KEYVAULT_SECRET_NAME];

  if (!keyVaultEndpoint) {
    throw new Error(
      `${EnvVars.KEYVAULT_ENDPOINT} environment variable is required for Azure KeyVault provider`
    );
  }
  if (!secretName) {
    throw new Error(
      `${EnvVars.KEYVAULT_SECRET_NAME} environment variable is required for Azure KeyVault provider`
    );
  }

  return {
    keyVaultEndpoint,
    secretName,
  };
}

function loadLocalFileConfigFromEnv(): LocalFileConfig {
  const filePath = process.env[EnvVars.LOCAL_FILE_PATH];

  if (!filePath) {
    throw new Error(
      `${EnvVars.LOCAL_FILE_PATH} environment variable is required for local file provider`
    );
  }

  return {
    filePath,
    certificatePassword: process.env[EnvVars.CERTIFICATE_PASSWORD],
  };
}

function loadEnvironmentConfigFromEnv(): EnvironmentConfig {
  const variableName = process.env[EnvVars.ENV_VARIABLE_NAME];

  if (!variableName) {
    throw new Error(
      `${EnvVars.ENV_VARIABLE_NAME} environment variable is required for environment provider`
    );
  }

  return {
    variableName,
    passwordVariableName: process.env[EnvVars.CERTIFICATE_PASSWORD],
  };
}

function loadGitHubSecretsConfigFromEnv(): GitHubSecretsConfig {
  const repository = process.env[EnvVars.GITHUB_REPOSITORY];
  const secretName = process.env[EnvVars.GITHUB_SECRET_NAME];

  if (!repository) {
    throw new Error(
      `${EnvVars.GITHUB_REPOSITORY} environment variable is required for GitHub Secrets provider`
    );
  }
  if (!secretName) {
    throw new Error(
      `${EnvVars.GITHUB_SECRET_NAME} environment variable is required for GitHub Secrets provider`
    );
  }

  return {
    repository,
    secretName,
    token: process.env[EnvVars.GITHUB_TOKEN],
  };
}

/**
 * Validate configuration
 */
export function validateConfig(config: MsAuthConfig): void {
  if (!config.email) {
    throw new Error("Email is required");
  }

  if (!config.credentialType) {
    throw new Error("Credential type is required");
  }

  if (!config.credentialProvider) {
    throw new Error("Credential provider is required");
  }

  if (!config.providerConfig) {
    throw new Error("Provider configuration is required");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(config.email)) {
    throw new Error(`Invalid email format: ${config.email}`);
  }
}
