import * as vscode from "vscode";
import { TodoProvider } from "./todoProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "waypoint" is now active!');

  const disposable = vscode.commands.registerCommand(
    "waypoint.helloWorld",
    () => {
      vscode.window.showInformationMessage("Hello World from Waypoint!");
    },
  );
  context.subscriptions.push(disposable);

  const todoProvider = new TodoProvider(context);
  vscode.window.registerTreeDataProvider("waypointTodoView", todoProvider);

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.command = "workbench.view.extension.waypoint-sidebar";
  context.subscriptions.push(statusBarItem);

  const updateStatusBar = async () => {
    await todoProvider.getChildren();
    const count = todoProvider.getTotalCount();
    statusBarItem.text = `$(checklist) ${count} todos`;
    statusBarItem.show();
  };

  // Single choke point: anything that calls todoProvider.refresh()
  // (save, config change, toggleDone) will update the status bar too
  context.subscriptions.push(
    todoProvider.onDidChangeTreeData(() => {
      updateStatusBar();
    }),
  );

  updateStatusBar(); // initial population

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      todoProvider.refresh();
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("waypoint.tags")) {
        todoProvider.refresh();
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waypoint.toggleDone", (item) => {
      if (item?.todo?.id) {
        todoProvider.toggleDone(item.todo.id);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("waypoint.openSettings", () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "waypoint",
      );
    }),
  );
}

export function deactivate() {}
