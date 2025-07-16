import * as vscode from "vscode";
import { GLOBAL_PROFILE_NAME } from "./constans";
import { getGlobalStateValue, setGlobalStateValue } from "./storage";
import type { ExtensionList, ExtensionValue, ProfileList } from "./types";

import path = require("path");

// ✅ Keep - Still needed for VS Code config path
export function getVSCodeConfigPath(): string {
  return path.dirname(vscode.env.appRoot);
}

// ✅ Keep - VS Code extension API
export function getInstalledExtensions(): readonly vscode.Extension<any>[] {
  return vscode.extensions.all.filter(
    (ext) => !ext.packageJSON.isBuiltin && !ext.extensionPath.includes("/extensions/ms-vscode.")
  );
}

// ✅ Keep - VS Code storage APIs
export function getWorkspaceStoragePath(ctx: vscode.ExtensionContext): string {
  return ctx.storageUri?.fsPath || "";
}

export function getGlobalStoragePath(ctx: vscode.ExtensionContext): string {
  return ctx.globalStorageUri.fsPath;
}

// ✅ Keep - Workspace identification
export function getWorkspaceIdentifier(): string {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) { return ""; }

  if (workspaceFolders.length === 1) {
    return Buffer.from(workspaceFolders[0].uri.toString()).toString("base64");
  } else {
    // Multi-root workspace
    const combined = workspaceFolders.map((f) => f.uri.toString()).join("|");
    return Buffer.from(combined).toString("base64");
  }
}

// ✅ Keep - Helper functions for VS Code file system
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(filePath));
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<any> {
  try {
    const content = await vscode.workspace.fs.readFile(vscode.Uri.file(filePath));
    return JSON.parse(new TextDecoder().decode(content));
  } catch (error) {
    throw new Error(`Failed to read JSON file ${filePath}: ${error}`);
  }
}

// ✅ Keep - Used for object sorting
function sortObjectByKey(obj: any) {
  return Object.keys(obj)
    .sort()
    .reduce((result: any, key) => {
      result[key] = obj[key];
      return result;
    }, {});
}

// ✅ Keep - Core profile management functions
export async function getProfiles(ctx: vscode.ExtensionContext): Promise<ProfileList> {
  let data = await getGlobalStateValue(ctx, "profiles") as ProfileList;

  // Initialize global profile if it doesn't exist
  if (!data[GLOBAL_PROFILE_NAME]) {
    data[GLOBAL_PROFILE_NAME] = {};
    await setGlobalStateValue(ctx, "profiles", data);
  }

  return sortObjectByKey(data) as ProfileList;
}

export async function getExtensions(ctx: vscode.ExtensionContext) {
  return (await getGlobalStateValue(ctx, "extensions")) as ExtensionList;
}

// ✅ Keep - Core extension discovery using VS Code APIs
export async function getAllExtensions(): Promise<ExtensionValue[]> {
  const extensions: ExtensionValue[] = [];

  const allExtensions = vscode.extensions.all.filter(
    (ext) => !ext.packageJSON.isBuiltin && !ext.extensionPath.includes("/extensions/ms-vscode.")
  );

  for (const ext of allExtensions) {
    const packageJson = ext.packageJSON;

    let extInfo: ExtensionValue = {
      id: ext.id,
      uuid: packageJson.__metadata?.id,
      label: packageJson.displayName || packageJson.name,
      description: packageJson.description,
    };

    // Handle localized labels if needed
    if (extInfo.label && /^%.*%$/gim.test(extInfo.label)) {
      extInfo.label = await getExtensionLocaleValue(ext.extensionPath, extInfo.label);
    }

    if (extInfo.description && /^%.*%$/gim.test(extInfo.description)) {
      extInfo.description = await getExtensionLocaleValue(ext.extensionPath, extInfo.description);
    }

    extensions.push(extInfo);
  }

  return extensions.sort((a, b) => a.label!.localeCompare(b.label!));
}

// ✅ Keep - Localization support
// ✅ Modernized - Use VS Code URI APIs for extension localization
export async function getExtensionLocaleValue(extPath: string, key: string): Promise<string> {
  const cleanKey = key.replace(/%/g, "");
  const language = vscode.env.language;

  try {
    const extensionUri = vscode.Uri.file(extPath);

    // Try language-specific file first
    const languageFile = vscode.Uri.joinPath(extensionUri, `package.nls.${language}.json`);
    if (await fileExists(languageFile.fsPath)) {
      try {
        const localeData = await readJsonFile(languageFile.fsPath);
        if (localeData[cleanKey]) {
          return localeData[cleanKey];
        }
      } catch (e) {
        console.warn(`Error reading language file "${languageFile.fsPath}": ${e}`);
      }
    }

    // Fallback to default localization file
    const defaultFile = vscode.Uri.joinPath(extensionUri, "package.nls.json");
    if (await fileExists(defaultFile.fsPath)) {
      try {
        const defaultData = await readJsonFile(defaultFile.fsPath);
        if (defaultData[cleanKey]) {
          return defaultData[cleanKey];
        }
      } catch (e) {
        console.warn(`Error reading default locale file "${defaultFile.fsPath}": ${e}`);
      }
    }

    return key;
  } catch (e) {
    console.warn(`Error processing locale value for key "${key}": ${e}`);
    return key;
  }
}