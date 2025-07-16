import * as vscode from "vscode";
import {
  createNativeProfile,
  switchNativeProfile,
  exportNativeProfile,
  importNativeProfile,
  mergeProfiles,
  compareProfiles,
  analyzeCurrentProfile
} from "./commands";
import { createProfileStatusBar } from "./status-bar";

/**
 * Ultra-lean extension that enhances VSCode's native profiles
 * Focuses only on advanced operations VSCode doesn't provide
 */

export function activate(context: vscode.ExtensionContext) {
  console.log('Profiles Plus extension is now active!');
  
  // Native profile operations (delegate to VSCode)
  context.subscriptions.push(
    vscode.commands.registerCommand('profiles-plus.create', createNativeProfile),
    vscode.commands.registerCommand('profiles-plus.switch', switchNativeProfile),
    vscode.commands.registerCommand('profiles-plus.export', exportNativeProfile),
    vscode.commands.registerCommand('profiles-plus.import', importNativeProfile)
  );

  // Advanced operations (our value-add)
  context.subscriptions.push(
    vscode.commands.registerCommand('profiles-plus.merge', mergeProfiles),
    vscode.commands.registerCommand('profiles-plus.compare', compareProfiles),
    vscode.commands.registerCommand('profiles-plus.analyze', analyzeCurrentProfile)
  );

  // Status bar for current profile
  createProfileStatusBar(context);
}


export function deactivate() {
  // Clean shutdown
}