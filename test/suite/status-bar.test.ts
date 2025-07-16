import * as assert from "node:assert";
import * as vscode from "vscode";
import { suite, test } from "mocha";
import { createStatusBarItem, getStatusBar } from "../../src/status-bar";

suite("Test status-bar", () => {
  vscode.window.showInformationMessage("Start status-bar tests.");

  let mockContext: vscode.ExtensionContext;

  setup(() => {
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

  test("createStatusBarItem creates status bar item with default text", () => {
    const statusBarItem = createStatusBarItem("vscode-extension-profiles.Apply", mockContext);

    assert.ok(statusBarItem);
    assert.strictEqual(statusBarItem.name, "Extension Profiles");
    assert.strictEqual(statusBarItem.command, "vscode-extension-profiles.Apply");
    assert.strictEqual(statusBarItem.tooltip, "Select and apply profile");
    assert.strictEqual(statusBarItem.text, "$(extensions) Select a profile");
    assert.strictEqual(statusBarItem.alignment, vscode.StatusBarAlignment.Right);
    assert.strictEqual(statusBarItem.priority, 100);
  });

  test("createStatusBarItem creates status bar item with profile name", () => {
    mockContext.workspaceState.get = (key: string) => {
      if (key === "profile") {
        return "My Profile";
      }
      return undefined;
    };

    const statusBarItem = createStatusBarItem("vscode-extension-profiles.Apply", mockContext);

    assert.ok(statusBarItem);
    assert.strictEqual(statusBarItem.text, "$(extensions) My Profile");
  });

  test("createStatusBarItem handles empty profile name", () => {
    mockContext.workspaceState.get = (key: string) => {
      if (key === "profile") {
        return "";
      }
      return undefined;
    };

    const statusBarItem = createStatusBarItem("vscode-extension-profiles.Apply", mockContext);

    assert.ok(statusBarItem);
    assert.strictEqual(statusBarItem.text, "$(extensions) Select a profile");
  });

  test("getStatusBar returns the created status bar item", () => {
    const statusBarItem = createStatusBarItem("vscode-extension-profiles.Apply", mockContext);
    const retrievedStatusBar = getStatusBar();

    assert.strictEqual(statusBarItem, retrievedStatusBar);
  });

  test("status bar item properties are correctly set", () => {
    const statusBarItem = createStatusBarItem("vscode-extension-profiles.Apply", mockContext);

    // Test that the status bar item has the correct properties
    assert.ok(statusBarItem.name);
    assert.ok(statusBarItem.command);
    assert.ok(statusBarItem.tooltip);
    assert.ok(statusBarItem.text);
    assert.ok(typeof statusBarItem.alignment === "number");
    assert.ok(typeof statusBarItem.priority === "number");
  });
});
