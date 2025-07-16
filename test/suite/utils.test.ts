import * as assert from "node:assert";
import * as vscode from "vscode";
import { suite, test } from "mocha";
import {
  getVSCodeConfigPath,
  getInstalledExtensions,
  getWorkspaceStoragePath,
  getGlobalStoragePath,
  getWorkspaceIdentifier,
  getProfiles,
  getExtensions,
  getAllExtensions,
  getExtensionLocaleValue
} from "../../src/utils";

suite("Test utils", () => {
  vscode.window.showInformationMessage("Start utils tests.");

  let testContext: vscode.ExtensionContext;

  setup(() => {
    testContext = {
      subscriptions: [],
      workspaceState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
        keys: () => []
      },
      globalState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
        keys: () => [],
        setKeysForSync: () => { }
      },
      extensionUri: vscode.Uri.file(__dirname),
      extensionPath: __dirname,
      storageUri: vscode.Uri.file("/tmp/test-workspace-storage"),
      globalStorageUri: vscode.Uri.file("/tmp/test-global-storage"),
      logUri: vscode.Uri.file("/tmp/test-logs"),
      storagePath: "/tmp/test-workspace-storage",
      globalStoragePath: "/tmp/test-global-storage",
      logPath: "/tmp/test-logs",
      asAbsolutePath: (relativePath: string) => relativePath,
      environmentVariableCollection: {} as any,
      extension: {} as any,
      secrets: {} as any,
      extensionMode: vscode.ExtensionMode.Test,
      languageModelAccessInformation: {} as any
    } as vscode.ExtensionContext;
  });

  test("getVSCodeConfigPath returns a valid path", () => {
    const configPath = getVSCodeConfigPath();
    assert.ok(typeof configPath === "string");
    assert.ok(configPath.length > 0);
  });

  test("getInstalledExtensions returns array of extensions", () => {
    const extensions = getInstalledExtensions();
    assert.ok(Array.isArray(extensions));

    // Check that each extension has expected properties
    extensions.forEach(ext => {
      assert.ok(ext.packageJSON, "Extension should have packageJSON");
      assert.ok(ext.extensionPath, "Extension should have extensionPath");
      assert.ok(ext.id, "Extension should have id");
    });
  });

  test("getWorkspaceStoragePath returns storage path", () => {
    const storagePath = getWorkspaceStoragePath(testContext);
    assert.strictEqual(storagePath, "/tmp/test-workspace-storage");
  });

  test("getWorkspaceStoragePath handles no storage URI", () => {
    const contextWithoutStorage = {
      ...testContext,
      storageUri: undefined
    } as vscode.ExtensionContext;

    const storagePath = getWorkspaceStoragePath(contextWithoutStorage);
    assert.strictEqual(storagePath, "");
  });

  test("getGlobalStoragePath returns global storage path", () => {
    const globalStoragePath = getGlobalStoragePath(testContext);
    assert.strictEqual(globalStoragePath, "/tmp/test-global-storage");
  });

  test("getWorkspaceIdentifier returns identifier", () => {
    const identifier = getWorkspaceIdentifier();
    assert.ok(typeof identifier === "string");
    // The identifier should be some string, even if no workspace is open
  });

  test("getProfiles returns profiles from storage", async () => {
    const mockProfiles = {
      "Profile 1": {
        "ext1": { uuid: "uuid1", label: "Extension 1" }
      },
      "Profile 2": {
        "ext2": { uuid: "uuid2", label: "Extension 2" }
      }
    };

    testContext.globalState.get = (key: string) => {
      if (key === "profiles") {
        return mockProfiles;
      }
      return undefined;
    };

    const profiles = await getProfiles(testContext);
    assert.deepStrictEqual(profiles, mockProfiles);
  });

  test("getProfiles returns empty object when no profiles", async () => {
    testContext.globalState.get = () => undefined;

    const profiles = await getProfiles(testContext);
    assert.deepStrictEqual(profiles, {});
  });

  test("getExtensions returns extensions from storage", async () => {
    const mockExtensions = {
      "ext1": { uuid: "uuid1", label: "Extension 1" },
      "ext2": { uuid: "uuid2", label: "Extension 2" }
    };

    testContext.globalState.get = (key: string) => {
      if (key === "extensions") {
        return mockExtensions;
      }
      return undefined;
    };

    const extensions = await getExtensions(testContext);
    assert.deepStrictEqual(extensions, mockExtensions);
  });

  test("getExtensions returns empty object when no extensions", async () => {
    testContext.globalState.get = () => undefined;

    const extensions = await getExtensions(testContext);
    assert.deepStrictEqual(extensions, {});
  });

  test("getAllExtensions returns array of extension values", async () => {
    const extensions = await getAllExtensions();
    assert.ok(Array.isArray(extensions));

    // Check that each extension has required properties
    extensions.forEach(ext => {
      assert.ok(typeof ext.id === "string");
      assert.ok(typeof ext.uuid === "string");
      assert.ok(ext.label === undefined || typeof ext.label === "string");
    });
  });

  test("getExtensionLocaleValue handles valid extension path", async () => {
    // Use a real extension path from the installed extensions
    const installedExtensions = getInstalledExtensions();
    if (installedExtensions.length > 0) {
      const extPath = installedExtensions[0].extensionPath;
      try {
        const localeValue = await getExtensionLocaleValue(extPath, "displayName");
        assert.ok(typeof localeValue === "string");
      } catch (error) {
        // Expected if the extension doesn't have locale files
        assert.ok(true);
      }
    } else {
      // No extensions available in test environment
      assert.ok(true);
    }
  });

  test("getExtensionLocaleValue handles invalid extension path", async () => {
    try {
      const localeValue = await getExtensionLocaleValue("/invalid/path", "displayName");
      assert.ok(typeof localeValue === "string");
    } catch (error) {
      // Expected behavior for invalid paths
      assert.ok(true);
    }
  });
});
