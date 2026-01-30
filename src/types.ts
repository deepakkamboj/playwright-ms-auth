/**
 * Authentication configuration types for playwright-ms-auth
 */

/** Supported credential types */
export type CredentialType = "password" | "certificate";

/** Supported credential provider types */
export type CredentialProviderType =
  | "azure-keyvault"
  | "local-file"
  | "environment"
  | "github-secrets";

/** Base configuration for authentication */
export interface AuthConfig {
  /** User email/username */
  email: string;

  /** Type of authentication credential */
  credentialType: CredentialType;

  /** Provider for credential retrieval */
  credentialProvider: CredentialProviderType;

  /** Directory to store authentication state */
  outputDir?: string;

  /** Hours until storage state expires (default: 24) */
  storageStateExpiration?: number;

  /** Entra login endpoint (default: login.microsoftonline.com) */
  loginEndpoint?: string;

  /** Run browser in headless mode (default: true) */
  headless?: boolean;

  /**
   * Wait for MSAL tokens in localStorage before saving state (default: true)
   *
   * This ensures SPAs have time to initialize MSAL and write tokens to localStorage.
   * Recommended for Power Platform, SharePoint, and other Microsoft SPAs.
   *
   * Set to false to disable waiting (not recommended for SPAs)
   */
  waitForMsalTokens?: boolean;

  /**
   * Maximum time to wait for MSAL tokens in milliseconds (default: 30000)
   *
   * Increase this if your SPA takes longer than 30 seconds to initialize MSAL.
   * Only applies when waitForMsalTokens is true.
   */
  msalTokenTimeout?: number;
}

/** Configuration for Azure KeyVault credential provider */
export interface AzureKeyVaultConfig {
  /** KeyVault endpoint URL */
  keyVaultEndpoint: string;

  /** Secret name in KeyVault */
  secretName: string;

  /** Optional secret version */
  secretVersion?: string;
}

/** Configuration for local file credential provider */
export interface LocalFileConfig {
  /** Path to the credential file (password or certificate) */
  filePath: string;

  /** Password for encrypted certificate (optional) */
  certificatePassword?: string;
}

/** Configuration for environment variable credential provider */
export interface EnvironmentConfig {
  /** Name of the environment variable containing the credential */
  variableName: string;

  /** For certificates: optional password variable */
  passwordVariableName?: string;
}

/** Configuration for GitHub Secrets credential provider */
export interface GitHubSecretsConfig {
  /** Repository in format 'owner/repo' */
  repository: string;

  /** Secret name */
  secretName: string;

  /** GitHub token for authentication */
  token?: string;
}

/** Union type for all provider configurations */
export type ProviderConfig =
  | AzureKeyVaultConfig
  | LocalFileConfig
  | EnvironmentConfig
  | GitHubSecretsConfig;

/** Complete authentication configuration */
export interface MsAuthConfig extends AuthConfig {
  /** Provider-specific configuration */
  providerConfig: ProviderConfig;
}

/** CLI environment variable names */
export const EnvVars = {
  /** User email */
  EMAIL: "MS_AUTH_EMAIL",

  /** Credential type (password|certificate) */
  CREDENTIAL_TYPE: "MS_AUTH_CREDENTIAL_TYPE",

  /** Credential provider type */
  CREDENTIAL_PROVIDER: "MS_AUTH_CREDENTIAL_PROVIDER",

  /** Azure KeyVault endpoint */
  KEYVAULT_ENDPOINT: "MS_AUTH_KEYVAULT_ENDPOINT",

  /** KeyVault secret name */
  KEYVAULT_SECRET_NAME: "MS_AUTH_KEYVAULT_SECRET_NAME",

  /** Local file path */
  LOCAL_FILE_PATH: "MS_AUTH_LOCAL_FILE_PATH",

  /** Certificate password */
  CERTIFICATE_PASSWORD: "MS_AUTH_CERTIFICATE_PASSWORD",

  /** Environment variable name for credential */
  ENV_VARIABLE_NAME: "MS_AUTH_ENV_VARIABLE_NAME",

  /** Output directory for storage state */
  OUTPUT_DIR: "MS_AUTH_OUTPUT_DIR",

  /** Entra login endpoint */
  LOGIN_ENDPOINT: "MS_AUTH_LOGIN_ENDPOINT",

  /** Storage state expiration hours */
  STORAGE_STATE_EXPIRATION: "MS_AUTH_STORAGE_STATE_EXPIRATION",

  /** GitHub repository */
  GITHUB_REPOSITORY: "MS_AUTH_GITHUB_REPOSITORY",

  /** GitHub secret name */
  GITHUB_SECRET_NAME: "MS_AUTH_GITHUB_SECRET_NAME",

  /** GitHub token */
  GITHUB_TOKEN: "MS_AUTH_GITHUB_TOKEN",

  /** Debug logging */
  SYSTEM_DEBUG: "SYSTEM_DEBUG",

  /** Wait for MSAL tokens in localStorage (default: true) */
  WAIT_FOR_MSAL_TOKENS: "MS_AUTH_WAIT_FOR_MSAL_TOKENS",

  /** Maximum time to wait for MSAL tokens in milliseconds (default: 30000) */
  MSAL_TOKEN_TIMEOUT: "MS_AUTH_MSAL_TOKEN_TIMEOUT",
} as const;

/** Result of credential retrieval */
export interface CredentialResult {
  /** Type of credential retrieved */
  type: CredentialType;

  /** The credential value (password string or certificate buffer) */
  value: string | Buffer;
}

/** User information for authentication */
export interface UserInfo {
  /** User email */
  email: string;

  /** User alias/identifier */
  alias?: string;

  /** Display name */
  displayName?: string;
}
