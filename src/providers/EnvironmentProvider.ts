import { CredentialProvider } from "./CredentialProvider";
import type { EnvironmentConfig, CredentialResult } from "../types";
import { log } from "../utils";

/**
 * Environment variable credential provider
 * Retrieves passwords or certificates from environment variables
 */
export class EnvironmentProvider extends CredentialProvider {
  constructor(config: EnvironmentConfig) {
    super(config);
    this.validateConfig();
  }

  getProviderName(): string {
    return "Environment Variable";
  }

  validateConfig(): void {
    const config = this.config as EnvironmentConfig;
    if (!config.variableName) {
      throw new Error("Environment variable name is required");
    }
  }

  async getCredential(): Promise<CredentialResult> {
    const config = this.config as EnvironmentConfig;
    log(
      `[EnvironmentProvider] Reading credential from environment variable '${config.variableName}'`
    );

    const value = process.env[config.variableName];
    if (!value) {
      throw new Error(
        `Environment variable '${config.variableName}' is not set or empty. ` +
          `Please set this variable with the credential value.`
      );
    }

    // Try to detect if it's a base64 encoded certificate
    try {
      const decoded = Buffer.from(value, "base64");
      // Check if it's a valid DER/PFX certificate (starts with 0x30)
      if (decoded.length > 100 && decoded[0] === 0x30) {
        log(
          `[EnvironmentProvider] Retrieved base64-encoded certificate (${decoded.byteLength} bytes)`
        );
        return {
          type: "certificate",
          value: decoded,
        };
      }
    } catch {
      // Not base64 or not a certificate
    }

    // Default to password
    log(
      `[EnvironmentProvider] Retrieved password (${value.length} characters)`
    );
    return {
      type: "password",
      value: value,
    };
  }
}
