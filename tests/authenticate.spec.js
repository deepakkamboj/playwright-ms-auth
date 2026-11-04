const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const { test } = require("@playwright/test");
const ts = require("typescript");

const source = ts.transpileModule(
  readFileSync(join(__dirname, "../src/authenticate.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }
).outputText;

const cases = [
  {
    name: "forwards the protected PFX passphrase",
    providerConfig: {
      filePath: "unused.pfx",
      certificatePassword: "synthetic-test-passphrase",
    },
    passphrase: "synthetic-test-passphrase",
  },
  {
    name: "accepts an undefined certificate password",
    providerConfig: {
      filePath: "unused.pfx",
      certificatePassword: undefined,
    },
    passphrase: undefined,
  },
  {
    name: "accepts an omitted certificate password",
    providerConfig: { filePath: "unused.pfx" },
    passphrase: undefined,
  },
];

for (const { name, providerConfig, passphrase } of cases) {
  test(name, async () => {
    const stop = new Error("Stop before certificate authentication or network access");
    const certificate = Buffer.from("synthetic-certificate");
    let capturedOptions;
    const page = {
      goto: async () => {},
      url: () => "https://login.microsoftonline.com/",
      getByRole: () => ({ fill: async () => {}, click: async () => {} }),
      screenshot: async () => {},
    };
    const context = { newPage: async () => page, close: async () => {} };
    const browser = { newContext: async () => context, close: async () => {} };
    const mocks = {
      "@playwright/test": {
        chromium: { launch: async () => browser },
        expect: () => ({ toHaveURL: async () => {} }),
      },
      "./providers": {
        CredentialProviderFactory: {
          createProvider: () => ({
            getCredential: async () => ({ type: "certificate", value: certificate }),
          }),
        },
      },
      "./certAuth": {
        addCertAuthRoute: async (_page, options) => {
          capturedOptions = options;
          throw stop;
        },
      },
      "./utils": {
        getStorageStatePath: () => "unused-state.json",
        isStorageStateValid: async () => false,
        log: () => {},
        ensureDirExists: async () => {},
        getAuthScreenshotPath: () => "unused-screenshot.png",
      },
      "node:crypto": require("node:crypto"),
    };
    const loadedModule = { exports: {} };
    const execute = vm.runInNewContext(
      `(function(require, module, exports) { ${source}\n})`,
      { URL, console: { log: () => {} } }
    );
    execute((specifier) => {
      assert.ok(Object.hasOwn(mocks, specifier), `Unexpected dependency: ${specifier}`);
      return mocks[specifier];
    }, loadedModule, loadedModule.exports);

    await assert.rejects(
      loadedModule.exports.authenticate(
        {
          email: "test@example.com",
          credentialType: "certificate",
          credentialProvider: "local-file",
          providerConfig,
        },
        "https://apps.powerapps.com/"
      ),
      (error) => error === stop
    );

    assert.equal(capturedOptions.pfx, certificate);
    assert.equal(capturedOptions.passphrase, passphrase);
    assert.equal(capturedOptions.authEndpoint, "login.microsoftonline.com");
  });
}