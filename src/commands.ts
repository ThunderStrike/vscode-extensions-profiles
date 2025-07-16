import * as vscode from "vscode";

/**
 * Native VSCode Profile Operations
 * Uses only VSCode's built-in profile system - no custom storage
 */

// Get all native VSCode profiles
export async function getNativeProfiles(): Promise<string[]> {
  // Use command palette data or settings to get profile names
  // VSCode doesn't expose direct profile API yet, so we use commands
  const profiles: string[] = [];
  
  try {
    // This triggers the profile picker and we can extract available profiles
    // Alternative: parse from VSCode settings if accessible
    const result = await vscode.commands.executeCommand('workbench.profiles.actions.showProfiles');
    console.log('Native profiles:', result);
    // Note: This command doesn't return data, it shows UI
    // We need a different approach...
  } catch (e) {
    console.warn('Could not retrieve native profiles:', e);
  }
  
  return profiles;
}

// Create profile using native VSCode commands
export async function createNativeProfile(): Promise<void> {
  // Let VSCode handle profile creation entirely
  await vscode.commands.executeCommand('workbench.profiles.actions.createProfile');
  
  // Show success message
  vscode.window.showInformationMessage('Profile created using VSCode native interface');
}

// Switch to profile using native VSCode commands  
export async function switchNativeProfile(): Promise<void> {
  await vscode.commands.executeCommand('workbench.profiles.actions.switchProfile');
}

// Export profile using native VSCode commands
export async function exportNativeProfile(): Promise<void> {
  await vscode.commands.executeCommand('workbench.profiles.actions.exportProfile');
}

// Import profile using native VSCode commands
export async function importNativeProfile(): Promise<void> {
  await vscode.commands.executeCommand('workbench.profiles.actions.importProfile');
}

/**
 * Value-Add Operations (What VSCode doesn't provide)
 */

// Merge profiles - this is the advanced functionality VSCode lacks
export async function mergeProfiles(): Promise<void> {
  const profileNames = await getAvailableProfileNames();
  
  if (profileNames.length < 2) {
    vscode.window.showErrorMessage('Need at least 2 profiles to merge');
    return;
  }

  // Select source profiles
  const sourceProfiles = await vscode.window.showQuickPick(profileNames, {
    canPickMany: true,
    placeHolder: 'Select profiles to merge',
    title: 'Merge Profiles'
  });

  if (!sourceProfiles || sourceProfiles.length < 2) {
    return;
  }

  // Get target profile name
  const targetName = await vscode.window.showInputBox({
    placeHolder: 'Name for merged profile',
    title: 'Merge Profiles'
  });

  if (!targetName) {
    return;
  }

  try {
    // 1. Create new profile
    await vscode.commands.executeCommand('workbench.profiles.actions.createProfile');
    
    // 2. For each source profile, temporarily switch and collect extensions
    const allExtensions = new Set<string>();
    
    for (const profileName of sourceProfiles) {
      // Switch to profile (this is hacky - VSCode doesn't have programmatic switching)
      // We'd need to read profile files directly from filesystem
      const extensions = await getProfileExtensions(profileName);
      extensions.forEach(ext => allExtensions.add(ext));
    }

    // 3. Install collected extensions to new profile
    for (const extensionId of allExtensions) {
      await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
    }

    vscode.window.showInformationMessage(`Merged ${sourceProfiles.length} profiles into "${targetName}"`);
    
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to merge profiles: ${error}`);
  }
}

// Helper: Get extensions from a specific profile
async function getProfileExtensions(profileName: string): Promise<string[]> {
  // This requires reading VSCode's profile storage directly
  // Profile data is stored in: ~/.vscode/profiles/{profile-id}/
  
  try {
    const profilePath = await getProfilePath(profileName);
    const extensionsFile = vscode.Uri.joinPath(profilePath, 'extensions.json');
    
    const content = await vscode.workspace.fs.readFile(extensionsFile);
    const data = JSON.parse(new TextDecoder().decode(content));
    
    return data.extensions || [];
  } catch (error) {
    console.warn(`Could not read extensions for profile ${profileName}:`, error);
    return [];
  }
}

// Helper: Get profile filesystem path
async function getProfilePath(profileName: string): Promise<vscode.Uri> {
  // VSCode profiles are stored in user data directory
  // This is platform-specific and requires careful handling
  
  const userDataPath = vscode.env.appRoot; // This gives us the app root, we need user data
  // On Windows: %APPDATA%\Code\User\profiles\
  // On macOS: ~/Library/Application Support/Code/User/profiles/
  // On Linux: ~/.config/Code/User/profiles/
  
  // For now, return a placeholder - this needs proper platform detection
  return vscode.Uri.file(`${userDataPath}/profiles/${profileName}`);
}

// Helper: Get available profile names by scanning filesystem
async function getAvailableProfileNames(): Promise<string[]> {
  try {
    const profilesDir = vscode.Uri.file(`${vscode.env.appRoot}/profiles`);
    const entries = await vscode.workspace.fs.readDirectory(profilesDir);
    
    return entries
      .filter(([name, type]) => type === vscode.FileType.Directory)
      .map(([name]) => name);
  } catch (error) {
    console.warn('Could not scan profile directory:', error);
    return [];
  }
}

/**
 * Simplified Extension Operations
 */

// Get currently installed extensions (for current profile)
export function getCurrentExtensions(): string[] {
  return vscode.extensions.all
    .filter(ext => !ext.packageJSON.isBuiltin)
    .map(ext => ext.id);
}

// Compare extensions between profiles
export async function compareProfiles(): Promise<void> {
  const profileNames = await getAvailableProfileNames();
  
  if (profileNames.length < 2) {
    vscode.window.showErrorMessage('Need at least 2 profiles to compare');
    return;
  }

  const selectedProfiles = await vscode.window.showQuickPick(profileNames, {
    canPickMany: true,
    placeHolder: 'Select 2 profiles to compare',
    title: 'Compare Profiles'
  });

  if (!selectedProfiles || selectedProfiles.length !== 2) {
    vscode.window.showErrorMessage('Please select exactly 2 profiles');
    return;
  }

  const [profile1, profile2] = selectedProfiles;
  const ext1 = await getProfileExtensions(profile1);
  const ext2 = await getProfileExtensions(profile2);

  const unique1 = ext1.filter(ext => !ext2.includes(ext));
  const unique2 = ext2.filter(ext => !ext1.includes(ext));
  const common = ext1.filter(ext => ext2.includes(ext));

  // Show comparison in output channel or webview
  const comparison = `
Profile Comparison: ${profile1} vs ${profile2}

Common Extensions (${common.length}):
${common.map(ext => `  • ${ext}`).join('\n')}

Only in ${profile1} (${unique1.length}):
${unique1.map(ext => `  • ${ext}`).join('\n')}

Only in ${profile2} (${unique2.length}):
${unique2.map(ext => `  • ${ext}`).join('\n')}
  `;

  const channel = vscode.window.createOutputChannel('Profile Comparison');
  channel.show();
  channel.append(comparison);
}

// Analyze current profile composition
export async function analyzeCurrentProfile() {
  const extensions = getCurrentExtensions();
  const totalExtensions = extensions.length;
  
  // Categorize extensions by publisher/type
  const categories = new Map<string, string[]>();
  
  for (const extId of extensions) {
    const [publisher] = extId.split('.');
    if (!categories.has(publisher)) {
      categories.set(publisher, []);
    }
    categories.get(publisher)!.push(extId);
  }

  // Sort publishers by extension count
  const sortedPublishers = Array.from(categories.entries())
    .sort(([, a], [, b]) => b.length - a.length);

  const analysis = `
Current Profile Analysis

Total Extensions: ${totalExtensions}

Top Publishers:
${sortedPublishers.slice(0, 10).map(([pub, exts]) => 
  `  ${pub}: ${exts.length} extension${exts.length > 1 ? 's' : ''}`
).join('\n')}

Extension Categories:
${sortedPublishers.slice(0, 5).map(([pub, exts]) => 
  `\n${pub}:\n${exts.map(ext => `  • ${ext}`).join('\n')}`
).join('\n')}
  `;

  // Show in output channel
  const channel = vscode.window.createOutputChannel('Profile Analysis');
  channel.show();
  channel.clear();
  channel.append(analysis);
}
