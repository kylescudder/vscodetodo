// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';
import { SidebarProvider } from './SidebarProvider';
import * as auth from './authenticate';
import { TokenManager } from './TokenManager';
import { authenticate } from './authenticate';


export function activate(context: vscode.ExtensionContext) {
	TokenManager.globalState = context.globalState;
	const sidebarProvider = new SidebarProvider(context.extensionUri);
	context.subscriptions.push(
	  vscode.window.registerWebviewViewProvider(
		"thingstodo-sidebar",
		sidebarProvider
	  )
	);
	const item = vscode.window.createStatusBarItem(
		vscode.StatusBarAlignment.Right
	);
	item.text = "$(tasklist) Add To Do";
	item.command = "thingstodo.addToDo";
	item.show();
	
	context.subscriptions.push(
		vscode.commands.registerCommand("thingstodo.refresh", () => {
			vscode.commands.executeCommand(
				"workbench.action.closeSidebar"
			);
			vscode.commands.executeCommand(
				"workbench.view.extension.thingstodo-sidebar-view"
			);
			setTimeout(() => {
				vscode.commands.executeCommand(
					"workbench.action.webview.openDeveloperTools"
				);
			}, 500);
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand("vscodetodo.helloWorld", () => {
			vscode.window.showInformationMessage(
				"token value is: " + TokenManager.getToken()
			);
		})
	);
		vscode.commands.registerCommand("thingstodo.addToDo", () => {
			const {activeTextEditor} = vscode.window;

			if (!activeTextEditor) {
				vscode.window.showInformationMessage("No active text editor");
				return;
			}
			const text = activeTextEditor.document.getText(
				activeTextEditor.selection
			);
			sidebarProvider._view?.webview.postMessage({
				type: "new-todo",
				value: text
			});
		})
	);
	// context.subscriptions.push(
	// 	vscode.commands.registerCommand("vscodetodo.authenticate", () => {
	// 		authenticate();
	// 	})
	// );

}
export function deactivate() {}
