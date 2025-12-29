import type { TokenCredential } from "@azure/identity";
import {
  AzureCliCredential,
  AzurePowerShellCredential,
  ChainedTokenCredential,
  InteractiveBrowserCredential,
  AzureDeveloperCliCredential,
} from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { CredentialProvider } from "./CredentialProvider";
import type { AzureKeyVaultConfig, CredentialResult } from "../types";
import { log } from "../utils";

/**
 * Azure KeyVault credential provider
 * Retrieves passwords or certificates from Azure KeyVault
 */
export class AzureKeyVaultProvider extends CredentialProvider {
  private client: SecretClient | null = null;
  private credential: TokenCredential | null = null;

  constructor(config: AzureKeyVaultConfig) {
    super(config);
    this.validateConfig();
  }

  getProviderName(): string {
    return "Azure KeyVault";
  }

  validateConfig(): void {
    const config = this.config as AzureKeyVaultConfig;
    if (!config.keyVaultEndpoint) {
      throw new Error("KeyVault endpoint is required");
    }
    if (!config.secretName) {
      throw new Error("Secret name is required");
    }
    try {
      new URL(config.keyVaultEndpoint);
    } catch {
      throw new Error(
        `Invalid KeyVault endpoint URL: ${config.keyVaultEndpoint}`
      );
    }
  }

  private getTokenCredential(): TokenCredential {
    if (!this.credential) {
      const credentials: TokenCredential[] = [
        new AzureCliCredential(),
        new AzurePowerShellCredential(),
        new AzureDeveloperCliCredential(),
      ];

      // Only add interactive browser credential if not in CI/CD
      if (!process.env.TF_BUILD && !process.env.CI) {
        credentials.push(
          new InteractiveBrowserCredential({
            redirectUri: "http://localhost:8080/",
          })
        );
      }

      this.credential = new ChainedTokenCredential(...credentials);
    }
    return this.credential;
  }

  private getClient(): SecretClient {
    if (!this.client) {
      const config = this.config as AzureKeyVaultConfig;
      this.client = new SecretClient(
        config.keyVaultEndpoint,
        this.getTokenCredential()
      );
    }
    return this.client;
  }

  async getCredential(): Promise<CredentialResult> {
    const config = this.config as AzureKeyVaultConfig;
    log(
      `[AzureKeyVaultProvider] Retrieving secret '${config.secretName}' from '${config.keyVaultEndpoint}'`
    );

    const client = this.getClient();
    const secret = await client.getSecret(config.secretName, {
      version: config.secretVersion,
    });

    if (!secret.value) {
      throw new Error(
        `Unable to retrieve secret '${config.secretName}' from KeyVault. ` +
          `Please check permissions and ensure the secret exists.`
      );
    }

    const { expiresOn, notBefore, enabled, contentType } = secret.properties;

    log(
      `[AzureKeyVaultProvider] Secret metadata: ` +
        `enabled=${enabled ?? "unknown"}, ` +
        `notBefore=${notBefore?.toISOString() ?? "none"}, ` +
        `expiresOn=${expiresOn?.toISOString() ?? "none"}, ` +
        `contentType=${contentType ?? "unknown"}`
    );

    // Validate secret properties
    if (!enabled) {
      throw new Error(`Secret '${config.secretName}' is disabled`);
    }

    if (expiresOn && expiresOn.getTime() < Date.now()) {
      throw new Error(
        `Secret '${config.secretName}' expired on ${expiresOn.toISOString()}`
      );
    }

    if (notBefore && notBefore.getTime() > Date.now()) {
      throw new Error(
        `Secret '${
          config.secretName
        }' is not valid before ${notBefore.toISOString()}`
      );
    }

    // Determine credential type based on content type
    if (contentType === "application/x-pkcs12") {
      // Certificate (PFX format, base64 encoded)
      const certificate = Buffer.from(secret.value, "base64");
      log(
        `[AzureKeyVaultProvider] Retrieved certificate (${certificate.byteLength} bytes)`
      );
      return {
        type: "certificate",
        value: certificate,
      };
    } else {
      // Password (plain text)
      log(
        `[AzureKeyVaultProvider] Retrieved password (${secret.value.length} characters)`
      );
      return {
        type: "password",
        value: secret.value,
      };
    }
  }
}
