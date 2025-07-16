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