import type { CredentialResult, ProviderConfig } from "../types";

/**
 * Abstract base class for credential providers
 * Implements Factory pattern for extensibility
 */
export abstract class CredentialProvider {
  constructor(protected config: ProviderConfig) {}

  /**
   * Retrieve the credential from the provider
   * @returns Promise resolving to the credential
   */
  abstract getCredential(): Promise<CredentialResult>;

  /**
   * Validate the provider configuration
   * @throws Error if configuration is invalid
   */
  abstract validateConfig(): void;

  /**
   * Get a human-readable name for logging
   */
  abstract getProviderName(): string;
}
