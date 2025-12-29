import { readFile } from "node:fs/promises";
import { CredentialProvider } from "./CredentialProvider";
import type { LocalFileConfig, CredentialResult } from "../types";
import { log } from "../utils";

/**
 * Local file credential provider
 * Retrieves passwords or certificates from local file system
 */
export class LocalFileProvider extends CredentialProvider {
  constructor(config: LocalFileConfig) {
    super(config);
    this.validateConfig();
  }

  getProviderName(): string {
    return "Local File";
  }

  validateConfig(): void {
    const config = this.config as LocalFileConfig;
    if (!config.filePath) {
      throw new Error("File path is required for local file provider");
    }
  }

  async getCredential(): Promise<CredentialResult> {
    const config = this.config as LocalFileConfig;
    log(`[LocalFileProvider] Reading credential from '${config.filePath}'`);

    try {
      const fileContent = await readFile(config.filePath);

      // Detect file type based on extension or content
      const isTextFile = config.filePath.match(/\.(txt|pwd|password)$/i);
      const isCertFile = config.filePath.match(/\.(pfx|p12|cer|crt|pem)$/i);

      if (isTextFile) {
        // Text file containing password
        const password = fileContent.toString("utf-8").trim();
        log(
          `[LocalFileProvider] Retrieved password (${password.length} characters)`
        );
        return {
          type: "password",
          value: password,
        };
      } else if (isCertFile || fileContent[0] === 0x30) {
        // Certificate file (PFX/P12) or binary content starting with 0x30 (DER encoded)
        log(
          `[LocalFileProvider] Retrieved certificate (${fileContent.byteLength} bytes)`
        );
        return {
          type: "certificate",
          value: fileContent,
        };
      } else {
        // Try to detect if it's base64 encoded certificate
        try {
          const decoded = Buffer.from(
            fileContent.toString("utf-8").trim(),
            "base64"
          );
          if (decoded.length > 0 && decoded[0] === 0x30) {
            log(
              `[LocalFileProvider] Retrieved base64-encoded certificate (${decoded.byteLength} bytes)`
            );
            return {
              type: "certificate",
              value: decoded,
            };
          }
        } catch {
          // Not base64
        }

        // Default to password
        const password = fileContent.toString("utf-8").trim();
        log(
          `[LocalFileProvider] Retrieved password (${password.length} characters)`
        );
        return {
          type: "password",
          value: password,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to read credential file '${config.filePath}': ${message}`
      );
    }
  }
}
