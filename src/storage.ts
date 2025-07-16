import * as vscode from "vscode";
import type { ExtensionList, ExtensionValue, ProfileList, StorageKeyID } from "./types";

// Use workspaceState for enabled/disabled extensions (workspace)
export async function getWorkspaceStorageValue(ctx: vscode.ExtensionContext, key: "enabled" | "disabled"): Promise<ExtensionValue[]> {
  const data = ctx.workspaceState.get<ExtensionValue[]>(`extensionsIdentifiers/${key}`);
  return data ?? [];
}

export async function setWorkspaceStorageValue(ctx: vscode.ExtensionContext, key: "enabled" | "disabled", extensions: ExtensionValue[]) {
  return await ctx.workspaceState.update(`extensionsIdentifiers/${key}`, extensions);
}

// Use globalState for disabled extensions (global)
export async function getDisabledExtensionsGlobalStorage(ctx: vscode.ExtensionContext): Promise<ExtensionValue[]> {
  const data = ctx.globalState.get<ExtensionValue[]>("extensionsIdentifiers/disabled");
  return data ?? [];
}

// VSCode hides disabled extensions
// https://github.com/microsoft/vscode/issues/15466
export function getEnabledExtensions() {
  return vscode.extensions.all
    .filter((e) => !/.*(?:\\\\|\/)resources(?:\\\\|\/)app(?:\\\\|\/)extensions(?:\\\\|\/).*/i.test(e.extensionPath)); // ignore internal extensions
}


export async function setGlobalStateValue(ctx: vscode.ExtensionContext, key: StorageKeyID, value: ExtensionList | ProfileList) {
  return await ctx.globalState.update(key, value);
}

export async function getGlobalStateValue(ctx: vscode.ExtensionContext, key: StorageKeyID): Promise<ExtensionList | ProfileList> {
  const data = ctx.globalState.get<ExtensionList | ProfileList>(key);
  if (data !== undefined) {
    return data;
  }
  return {}; // default
}
