import { CredentialProvider } from "./CredentialProvider";
import { AzureKeyVaultProvider } from "./AzureKeyVaultProvider";
import { LocalFileProvider } from "./LocalFileProvider";
import { EnvironmentProvider } from "./EnvironmentProvider";
import { GitHubSecretsProvider } from "./GitHubSecretsProvider";
import type {
  CredentialProviderType,
  ProviderConfig,
  AzureKeyVaultConfig,
  LocalFileConfig,
  EnvironmentConfig,
  GitHubSecretsConfig,
} from "../types";

/**
 * Factory for creating credential providers
 * Implements Abstract Factory pattern for extensibility
 */
export class CredentialProviderFactory {
  /**
   * Create a credential provider based on type and configuration
   * @param type Provider type
   * @param config Provider-specific configuration
   * @returns CredentialProvider instance
   */
  static createProvider(
    type: CredentialProviderType,
    config: ProviderConfig
  ): CredentialProvider {
    switch (type) {
      case "azure-keyvault":
        return new AzureKeyVaultProvider(config as AzureKeyVaultConfig);

      case "local-file":
        return new LocalFileProvider(config as LocalFileConfig);

      case "environment":
        return new EnvironmentProvider(config as EnvironmentConfig);

      case "github-secrets":
        return new GitHubSecretsProvider(config as GitHubSecretsConfig);

      default:
        throw new Error(`Unsupported credential provider type: ${type}`);
    }
  }

  /**
   * Get list of supported provider types
   */
  static getSupportedProviders(): CredentialProviderType[] {
    return ["azure-keyvault", "local-file", "environment", "github-secrets"];
  }
}
