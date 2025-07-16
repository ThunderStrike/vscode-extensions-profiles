import * as assert from "node:assert";
import * as vscode from "vscode";
import { suite, test } from "mocha";
import {
  getWorkspaceStorageValue,
  setWorkspaceStorageValue,
  getDisabledExtensionsGlobalStorage,
  getEnabledExtensions,
  setGlobalStateValue,
  getGlobalStateValue
} from "../../src/storage";

suite("Test storage", () => {
  vscode.window.showInformationMessage("Start storage tests.");

  let mockContext: vscode.ExtensionContext;

  setup(() => {
    // Create a mock context with workspace and global state
    mockContext = {
      workspaceState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
      },
      globalState: {
        get: (key: string) => undefined,
        update: (key: string, value: any) => Promise.resolve(),
      },
    } as any;
  });

  test("getWorkspaceStorageValue returns empty array when no data", async () => {
    const result = await getWorkspaceStorageValue(mockContext, "enabled");
    assert.deepStrictEqual(result, []);
  });

  test("getWorkspaceStorageValue returns stored data", async () => {
    const mockExtensions = [{ id: "test.extension", uuid: "test-uuid", label: "Test Extension" }];
    mockContext.workspaceState.get = (key: string) => {
      if (key === "extensionsIdentifiers/enabled") {
        return mockExtensions;
      }
      return undefined;
    };

    const result = await getWorkspaceStorageValue(mockContext, "enabled");
    assert.deepStrictEqual(result, mockExtensions);
  });

  test("setWorkspaceStorageValue calls update with correct key and value", async () => {
    let updateCalled = false;
    let updateKey = "";
    let updateValue: any;

    mockContext.workspaceState.update = (key: string, value: any) => {
      updateCalled = true;
      updateKey = key;
      updateValue = value;
      return Promise.resolve();
    };

    const mockExtensions = [{ id: "test.extension", uuid: "test-uuid", label: "Test Extension" }];
    await setWorkspaceStorageValue(mockContext, "disabled", mockExtensions);

    assert.strictEqual(updateCalled, true);
    assert.strictEqual(updateKey, "extensionsIdentifiers/disabled");
    assert.deepStrictEqual(updateValue, mockExtensions);
  });

  test("getDisabledExtensionsGlobalStorage returns empty array when no data", async () => {
    const result = await getDisabledExtensionsGlobalStorage(mockContext);
    assert.deepStrictEqual(result, []);
  });

  test("getDisabledExtensionsGlobalStorage returns stored data", async () => {
    const mockExtensions = [{ id: "disabled.extension", uuid: "disabled-uuid", label: "Disabled Extension" }];
    mockContext.globalState.get = (key: string) => {
      if (key === "extensionsIdentifiers/disabled") {
        return mockExtensions;
      }
      return undefined;
    };

    const result = await getDisabledExtensionsGlobalStorage(mockContext);
    assert.deepStrictEqual(result, mockExtensions);
  });

  test("getEnabledExtensions filters out internal extensions", () => {
    const result = getEnabledExtensions();
    assert.ok(Array.isArray(result));

    // Check that internal extensions are filtered out
    const hasInternalExtensions = result.some(ext =>
      /.*(?:\\\\|\/)resources(?:\\\\|\/)app(?:\\\\|\/)extensions(?:\\\\|\/).*/i.test(ext.extensionPath)
    );
    assert.strictEqual(hasInternalExtensions, false);
  });

  test("setGlobalStateValue calls update with correct parameters", async () => {
    let updateCalled = false;
    let updateKey = "";
    let updateValue: any;

    mockContext.globalState.update = (key: string, value: any) => {
      updateCalled = true;
      updateKey = key;
      updateValue = value;
      return Promise.resolve();
    };

    const mockData = { profile1: { "ext1": { uuid: "ext1-uuid", label: "Extension 1" } } };
    await setGlobalStateValue(mockContext, "profiles", mockData);

    assert.strictEqual(updateCalled, true);
    assert.strictEqual(updateKey, "profiles");
    assert.deepStrictEqual(updateValue, mockData);
  });

  test("getGlobalStateValue returns empty object when no data", async () => {
    const result = await getGlobalStateValue(mockContext, "profiles");
    assert.deepStrictEqual(result, {});
  });

  test("getGlobalStateValue returns stored data", async () => {
    const mockData = { profile1: { "ext1": { uuid: "ext1-uuid", label: "Extension 1" } } };
    mockContext.globalState.get = (key: string) => {
      if (key === "profiles") {
        return mockData;
      }
      return undefined;
    };

    const result = await getGlobalStateValue(mockContext, "profiles");
    assert.deepStrictEqual(result, mockData);
  });

  test("getGlobalStateValue returns empty object for undefined data", async () => {
    mockContext.globalState.get = () => undefined;
    const result = await getGlobalStateValue(mockContext, "extensions");
    assert.deepStrictEqual(result, {});
  });
});
