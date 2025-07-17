import * as vscode from "vscode";

// Get current profile name from VSCode settings
// export function getCurrentProfileName(): string | undefined {
//   const config = vscode.workspace.getConfiguration();
//   // VSCode stores current profile info in workspace/global settings
//   // Need to check how VSCode exposes this
//   return config.get('workbench.profiles.current');
// }

async function getCurrentProfileFromStorage() {
    try {
        // Construct path to global storage
        const globalStorageUri = vscode.Uri.joinPath(
            vscode.Uri.file(vscode.env.appRoot),
            '..', 'User', 'globalStorage', 'storage.json'
        );
        
        // Read the storage file
        const storageContent = await vscode.workspace.fs.readFile(globalStorageUri);
        console.log({
          storageContent
        })

        const storageData = JSON.parse(Buffer.from(storageContent).toString('utf8'));
        
        // Parse profile information
        // The exact structure may vary, but profile info is typically stored here
        console.log('Global storage:', storageData);
        
        return storageData;
        
    } catch (error) {
        console.error('Error reading global storage:', error);
        return null;
    }
}


// Get current profile name (platform-specific detection)
export async function getCurrentProfileName(): Promise<string | undefined> {
  // VSCode doesn't directly expose current profile name
  // We need to infer it from workspace/global settings

  return await getCurrentProfileFromStorage();
  
  // try {
  //   const config = vscode.workspace.getConfiguration();
  //   console.log('Current configuration:', config);
    
  //   // Check if we're in a profile-specific workspace
  //   const workspaceFile = vscode.workspace.workspaceFile;
  //   if (workspaceFile) {
  //     // Extract profile from workspace path if it's profile-specific
  //     const pathParts = workspaceFile.fsPath.split(/[/\\]/);
  //     const profileIndex = pathParts.findIndex(part => part === 'profiles');
  //     if (profileIndex >= 0 && profileIndex < pathParts.length - 1) {
  //       return pathParts[profileIndex + 1];
  //     }
  //   }
    
  //   // Fallback: check environment or other indicators
  //   return undefined;
  // } catch (error) {
  //   console.warn('Could not determine current profile:', error);
  //   return undefined;
  // }
}

export async function updateProfileStatus(statusBar: vscode.StatusBarItem) {
  // Try to detect current profile name
  const currentProfile = await getCurrentProfileName();
  
  if (currentProfile) {
    statusBar.text = `$(account) ${currentProfile}`;
  } else {
    statusBar.text = "$(account) Default";
  }
}


/** A UUID string, e.g. "9810c86c-9bb2-47ad-91d3-f54dc8d19619". */
export type UUID = string;

/** One entry in the parsed content array. */
export interface ContentItem {
  /** Unique item identifier. */
  id: UUID;
  /** Human‑readable name. */
  name: string;
  /** Collection UUID this item belongs to. */
  collection: UUID;
  /** Icon name, e.g. "rocket" or "code". */
  icon: string;
  /** Optional map of feature flags (empty object if none). */
  useDefaultFlags?: Record<string, unknown>;
}

/** The payload returned by your sync endpoint. */
export interface SyncResponse {
  /** Overall reference ID for this sync event. */
  ref: UUID;
  syncData: SyncData;
}

/** Inner sync details. */
export interface SyncData {
  /** Sync schema version; here always 2. */
  version: number;
  /** Originating machine’s UUID. */
  machineId: UUID;
  /** Raw JSON string of `ContentItem[]`. */
  content: string;
}

/**
 * Parse the raw content into typed items.
 * @param raw JSON string from `syncData.content`
 * @returns Array of `ContentItem`
 * @example
 * ```ts
 * const resp: SyncResponse = await fetch(...).then(r => r.json());
 * const items = parseContent(resp.syncData.content);
 * ```
 */
export function parseSyncContent(raw: string): ContentItem[] {
  return JSON.parse(raw) as ContentItem[];
}
