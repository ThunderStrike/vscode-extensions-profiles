import * as vscode from "vscode";
import { updateProfileStatus } from "./utils";

// Show current profile info in status bar
export function createProfileStatusBar(context: vscode.ExtensionContext) {
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right, 
    100
  );
  
  statusBar.name = "Profile Status";
  statusBar.command = 'profiles-plus.switch';
  statusBar.tooltip = "Click to switch profiles";
  
  // Update status bar text based on current profile
  updateProfileStatus(statusBar);
  
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Listen for workspace changes to update status
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(() => {
      updateProfileStatus(statusBar);
    })
  );
}