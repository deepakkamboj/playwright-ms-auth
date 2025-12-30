#!/usr/bin/env node

import { Command } from "commander";
import { authenticate } from "./authenticate";
import { loadConfigFromEnv, validateConfig } from "./config";
import { EnvVars } from "./types";
import { log } from "./utils";

const program = new Command();

program
  .name("ms-auth")
  .description("Microsoft Entra authentication CLI for Playwright")
  .version("1.0.0");

program
  .command("login")
  .description("Perform Microsoft Entra authentication and save storage state")
  .requiredOption("-u, --url <url>", "Target URL to authenticate against")
  .option("-e, --email <email>", `User email (or set ${EnvVars.EMAIL})`)
  .option(
    "-t, --credential-type <type>",
    `Credential type: password|certificate (or set ${EnvVars.CREDENTIAL_TYPE})`,
    "password"
  )
  .option(
    "-p, --credential-provider <provider>",
    `Credential provider: azure-keyvault|local-file|environment|github-secrets (or set ${EnvVars.CREDENTIAL_PROVIDER})`,
    "azure-keyvault"
  )
  .option(
    "--keyvault-endpoint <endpoint>",
    `Azure KeyVault endpoint (or set ${EnvVars.KEYVAULT_ENDPOINT})`
  )
  .option(
    "--keyvault-secret <secret>",
    `Azure KeyVault secret name (or set ${EnvVars.KEYVAULT_SECRET_NAME})`
  )
  .option(
    "--local-file <path>",
    `Local file path for credential (or set ${EnvVars.LOCAL_FILE_PATH})`
  )
  .option(
    "--env-variable <name>",
    `Environment variable name (or set ${EnvVars.ENV_VARIABLE_NAME})`
  )
  .option(
    "--password <password>",
    `Password for authentication (not recommended for production, use credential providers instead)`
  )
  .option(
    "--github-repo <repo>",
    `GitHub repository owner/repo (or set ${EnvVars.GITHUB_REPOSITORY})`
  )
  .option(
    "--github-secret <secret>",
    `GitHub secret name (or set ${EnvVars.GITHUB_SECRET_NAME})`
  )
  .option(
    "--output-dir <dir>",
    `Output directory for storage state (or set ${EnvVars.OUTPUT_DIR})`
  )
  .option("--headful", "Run browser in headful mode (visible browser window)")
  .option("--debug", "Enable debug logging")
  .action(async (options) => {
    try {
      // Enable debug logging if requested
      if (options.debug) {
        process.env[EnvVars.SYSTEM_DEBUG] = "true";
      }

      log("[CLI] Starting authentication");
      log(`[CLI] Target URL: ${options.url}`);

      // Set environment variables from CLI options
      if (options.email) process.env[EnvVars.EMAIL] = options.email;
      if (options.credentialType)
        process.env[EnvVars.CREDENTIAL_TYPE] = options.credentialType;

      // Handle password option - automatically set provider to environment
      if (options.password) {
        process.env[EnvVars.CREDENTIAL_PROVIDER] = "environment";
        process.env[EnvVars.ENV_VARIABLE_NAME] = "MS_AUTH_PASSWORD_INLINE";
        process.env["MS_AUTH_PASSWORD_INLINE"] = options.password;
      } else if (options.credentialProvider) {
        process.env[EnvVars.CREDENTIAL_PROVIDER] = options.credentialProvider;
      }

      if (options.keyvaultEndpoint)
        process.env[EnvVars.KEYVAULT_ENDPOINT] = options.keyvaultEndpoint;
      if (options.keyvaultSecret)
        process.env[EnvVars.KEYVAULT_SECRET_NAME] = options.keyvaultSecret;
      if (options.localFile)
        process.env[EnvVars.LOCAL_FILE_PATH] = options.localFile;
      if (options.envVariable)
        process.env[EnvVars.ENV_VARIABLE_NAME] = options.envVariable;
      if (options.githubRepo)
        process.env[EnvVars.GITHUB_REPOSITORY] = options.githubRepo;
      if (options.githubSecret)
        process.env[EnvVars.GITHUB_SECRET_NAME] = options.githubSecret;
      if (options.outputDir)
        process.env[EnvVars.OUTPUT_DIR] = options.outputDir;

      // Load configuration from environment
      const config = loadConfigFromEnv();

      // Set headless mode based on --headful flag
      config.headless = !options.headful; // If --headful is set, headless = false

      validateConfig(config);

      log(`[CLI] Email: ${config.email}`);
      log(`[CLI] Credential type: ${config.credentialType}`);
      log(`[CLI] Credential provider: ${config.credentialProvider}`);
      log(`[CLI] Browser mode: ${config.headless ? "headless" : "headful"}`);

      // Perform authentication
      await authenticate(config, options.url);

      console.log("✅ Authentication successful!");
      process.exit(0);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("❌ Authentication failed:", message);

      if (options.debug && error instanceof Error && error.stack) {
        console.error(error.stack);
      }

      process.exit(1);
    }
  });

program
  .command("env-help")
  .description("Show all supported environment variables")
  .action(() => {
    console.log("Supported Environment Variables:\n");
    console.log("Core Configuration:");
    console.log(`  ${EnvVars.EMAIL}               - User email address`);
    console.log(
      `  ${EnvVars.CREDENTIAL_TYPE}     - Credential type (password|certificate)`
    );
    console.log(
      `  ${EnvVars.CREDENTIAL_PROVIDER} - Provider type (azure-keyvault|local-file|environment|github-secrets)`
    );
    console.log(
      `  ${EnvVars.OUTPUT_DIR}          - Output directory for storage state`
    );
    console.log(
      `  ${EnvVars.LOGIN_ENDPOINT}      - Entra login endpoint (default: login.microsoftonline.com)`
    );
    console.log(
      `  ${EnvVars.STORAGE_STATE_EXPIRATION} - Hours until storage state expires (default: 24)`
    );
    console.log();
    console.log("Azure KeyVault Provider:");
    console.log(`  ${EnvVars.KEYVAULT_ENDPOINT}   - KeyVault endpoint URL`);
    console.log(`  ${EnvVars.KEYVAULT_SECRET_NAME}- Secret name in KeyVault`);
    console.log();
    console.log("Local File Provider:");
    console.log(`  ${EnvVars.LOCAL_FILE_PATH}     - Path to credential file`);
    console.log(
      `  ${EnvVars.CERTIFICATE_PASSWORD}- Password for encrypted certificate`
    );
    console.log();
    console.log("Environment Variable Provider:");
    console.log(
      `  ${EnvVars.ENV_VARIABLE_NAME}   - Name of environment variable containing credential`
    );
    console.log();
    console.log("GitHub Secrets Provider:");
    console.log(
      `  ${EnvVars.GITHUB_REPOSITORY}   - GitHub repository (owner/repo)`
    );
    console.log(`  ${EnvVars.GITHUB_SECRET_NAME}  - GitHub secret name`);
    console.log(`  ${EnvVars.GITHUB_TOKEN}        - GitHub token (optional)`);
    console.log();
    console.log("Debug:");
    console.log(
      `  ${EnvVars.SYSTEM_DEBUG}        - Enable debug logging (true|false)`
    );
  });

program.parse();
