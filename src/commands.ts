import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ContentItem, parseSyncContent, SyncResponse } from './utils';

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

  const profileMaps = Object.fromEntries(profileNames.map(x => [x.name, x.id]));

  // Select source profiles
  const sourceProfiles = await vscode.window.showQuickPick(profileNames.map(x => x.name), {
    canPickMany: true,
    placeHolder: 'Select profiles to merge',
    title: 'Merge Profiles'
  });

  if (!sourceProfiles || sourceProfiles.length < 2) {
    return;
  }

  try {
    vscode.window.showInformationMessage(`Enter name for the new merged profile:`);

    // 1. Create new profile
    await vscode.commands.executeCommand('workbench.profiles.actions.createProfile');

    vscode.window.showInformationMessage('Created new profile for merging, switch to it now');

    await vscode.commands.executeCommand('workbench.profiles.actions.switchProfile');

    vscode.window.showInformationMessage('Switched profiles, Now merging selected profiles into the new profile...');

    const newProfileNames = await getAvailableProfileNames();
    const newProfileMaps = Object.fromEntries(
      newProfileNames
        .filter(x => !profileMaps[x.name])
        .map(x => [x.name, x.id])
    );

    // 2. For each source profile, temporarily switch and collect extensions
    const allExtensions = new Set<string>();
    
    for (const profileName of sourceProfiles) {
      // Switch to profile (this is hacky - VSCode doesn't have programmatic switching)
      // We'd need to read profile files directly from filesystem
      const extensions = await getProfileExtensions(profileName, profileMaps[profileName]);
      extensions.forEach(ext => allExtensions.add(ext));
    }

    // 3. Install collected extensions to new profile
    for (const extensionId of allExtensions) {
      await vscode.commands.executeCommand('workbench.extensions.installExtension', extensionId);
    }

    vscode.window.showInformationMessage(`Merged ${sourceProfiles.length} profiles into "${Object.keys(newProfileMaps)[0]}" profile successfully!`);
    
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to merge profiles: ${error}`);
  }
}

// Helper: Get extensions from a specific profile
async function getProfileExtensions(profileName: string, profileId: string): Promise<string[]> {
  // This requires reading VSCode's profile storage directly
  // Profile data is stored in: ~/.vscode/profiles/{profile-id}/
  
  try {
    const profilePath = getProfilePath();
    const extensionsFile = vscode.Uri.joinPath(profilePath, profileId, 'extensions.json');
    
    const content = await vscode.workspace.fs.readFile(extensionsFile);
    const data = JSON.parse(new TextDecoder().decode(content));
    
    return data.extensions || [];
  } catch (error) {
    console.warn(`Could not read extensions for profile ${profileName}:`, error);
    return [];
  }
}

function getConfigPath(): vscode.Uri {
  // VSCode profiles are stored in user data directory
  // 1) Determine the base "User" settings folder:
  const home = os.homedir();
  let userSettingsPath: string;

  if (process.platform === 'darwin') {
    // macOS: ~/Library/Application Support/Code/User
    userSettingsPath = path.join(
      home,
      'Library',
      'Application Support',
      'Code',
      'User'
    );
  } else if (process.platform === 'win32') {
    // Windows: %APPDATA%\Code\User
    const appData = process.env.APPDATA!;
    userSettingsPath = path.join(appData, 'Code', 'User');
  } else {
    // Linux: ~/.config/Code/User
    userSettingsPath = path.join(home, '.config', 'Code', 'User');
  }

  return vscode.Uri.file(userSettingsPath);
}

// Helper: Get profile filesystem path
function getProfileMappingPath(): vscode.Uri {
  let userSettingsPath = getConfigPath();

  // 2) Point at the "profiles" folder under that
  const lastSyncprofilesUri = vscode.Uri.joinPath(userSettingsPath, 'sync', 'profiles', 'lastSyncprofiles.json');

  return lastSyncprofilesUri;
}

// Helper: Get profile filesystem path
function getProfilePath(): vscode.Uri {
  let userSettingsPath = getConfigPath();

  // 2) Point at the "profiles" folder under that
  const profilesUri = vscode.Uri.joinPath(userSettingsPath, 'profiles');

  return profilesUri;
}

// Helper: Get available profile names by scanning filesystem
async function getAvailableProfileNames(): Promise<ContentItem[]> {
  try {
    const profilesMappingPath = getProfileMappingPath();
    const file = await vscode.workspace.fs.readFile(profilesMappingPath);
    const profilesData = JSON.parse(new TextDecoder().decode(file)) as SyncResponse;
    
    return parseSyncContent(profilesData.syncData.content);
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

  const profileMaps = Object.fromEntries(profileNames.map(x => [x.name, x.id]));

  const selectedProfiles = await vscode.window.showQuickPick(profileNames.map(x => x.name), {
    canPickMany: true,
    placeHolder: 'Select 2 profiles to compare',
    title: 'Compare Profiles'
  });

  if (!selectedProfiles || selectedProfiles.length !== 2) {
    vscode.window.showErrorMessage('Please select exactly 2 profiles');
    return;
  }

  const [profile1, profile2] = selectedProfiles;
  const ext1 = await getProfileExtensions(profile1, profileMaps[profile1]);
  const ext2 = await getProfileExtensions(profile2, profileMaps[profile2]);

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
