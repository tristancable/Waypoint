import * as vscode from "vscode";

// A small fallback palette, used for any tag that isn't in the user's color settings
const FALLBACK_PALETTE = [
  "#a074c4",
  "#4ec9b0",
  "#dcdcaa",
  "#569cd6",
  "#d16969",
];

function makeDotIcon(hexColor: string): vscode.Uri {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><circle cx="8" cy="8" r="5" fill="${hexColor}"/></svg>`;
  return vscode.Uri.parse(
    `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
  );
}

function getColorForTag(
  tag: string,
  userColors: Record<string, string>,
  allTags: string[],
): string {
  if (userColors[tag]) {
    return userColors[tag];
  }
  const index = allTags.indexOf(tag) % FALLBACK_PALETTE.length;
  return FALLBACK_PALETTE[index];
}

interface RawTodo {
  tag: string;
  message: string;
  filePath: string;
  fileName: string;
  line: number;
  id: string; // stable identifier for "done" tracking
}

// A collapsible row representing one file
class FileNode extends vscode.TreeItem {
  constructor(
    public readonly fileName: string,
    public readonly todos: RawTodo[],
  ) {
    super(fileName, vscode.TreeItemCollapsibleState.Expanded);
    this.description = `${todos.length}`;
    this.iconPath = vscode.ThemeIcon.File;
  }
}

// A single todo row, nested under a FileNode
class TodoItem extends vscode.TreeItem {
  constructor(
    public readonly todo: RawTodo,
    public readonly done: boolean,
    public readonly color: string,
  ) {
    super(`${todo.tag}: ${todo.message}`, vscode.TreeItemCollapsibleState.None);

    this.command = {
      command: "vscode.open",
      title: "Open file",
      arguments: [
        vscode.Uri.file(todo.filePath),
        { selection: new vscode.Range(todo.line, 0, todo.line, 0) },
      ],
    };

    if (done) {
      this.description = "done";
      this.iconPath = new vscode.ThemeIcon("check");
    } else {
      this.iconPath = makeDotIcon(color);
    }

    // Right-click context menu will use this to know which command to show
    this.contextValue = done ? "todoDone" : "todoOpen";
  }
}

type TreeNode = FileNode | TodoItem;

export class TodoProvider implements vscode.TreeDataProvider<TreeNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<void | undefined> =
    new vscode.EventEmitter<void | undefined>();
  readonly onDidChangeTreeData: vscode.Event<void | undefined> =
    this._onDidChangeTreeData.event;

  private allTodos: RawTodo[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  // Total count, used by the status bar
  getTotalCount(): number {
    return this.allTodos.filter((t) => !this.isDone(t.id)).length;
  }

  private isDone(id: string): boolean {
    const doneIds = this.context.workspaceState.get<string[]>(
      "waypoint.done",
      [],
    );
    return doneIds.includes(id);
  }

  toggleDone(id: string): void {
    const doneIds = this.context.workspaceState.get<string[]>(
      "waypoint.done",
      [],
    );
    const next = doneIds.includes(id)
      ? doneIds.filter((d) => d !== id)
      : [...doneIds, id];
    this.context.workspaceState.update("waypoint.done", next);
    this.refresh();
  }

  async getChildren(element?: TreeNode): Promise<TreeNode[]> {
    // Top level: return one FileNode per file that has todos
    if (!element) {
      await this.scan();
      const byFile = new Map<string, RawTodo[]>();
      for (const todo of this.allTodos) {
        const list = byFile.get(todo.fileName) ?? [];
        list.push(todo);
        byFile.set(todo.fileName, list);
      }
      return Array.from(byFile.entries()).map(
        ([fileName, todos]) => new FileNode(fileName, todos),
      );
    }

    // Second level: return TodoItems for a given file
    if (element instanceof FileNode) {
      const config = vscode.workspace.getConfiguration("waypoint");
      const tagMap = config.get<Record<string, string>>("tags", {
        TODO: "#e2c08d",
        FIXME: "#f14c4c",
        HACK: "#cc6633",
        NOTE: "#3794ff",
      });
      const allTags = Object.keys(tagMap);

      return element.todos.map((todo) => {
        const color = getColorForTag(todo.tag, tagMap, allTags);
        return new TodoItem(todo, this.isDone(todo.id), color);
      });
    }

    return [];
  }

  private async scan(): Promise<void> {
    const config = vscode.workspace.getConfiguration("waypoint");
    const tagMap = config.get<Record<string, string>>("tags", {
      TODO: "#e2c08d",
      FIXME: "#f14c4c",
      HACK: "#cc6633",
      NOTE: "#3794ff",
    });
    const tags = Object.keys(tagMap);
    const regex = new RegExp(
      `(?:\\/\\/|#|<!--)\\s*(${tags.join("|")})\\b:?\\s*(.*)`,
      "i",
    );

    const files = await vscode.workspace.findFiles(
      "**/*.{js,jsx,ts,tsx,py,java,c,cpp,h,go,rb,php,css,html,md}",
      "**/{node_modules,.git,dist,out,build,.next,.turbo,coverage,.vscode-test}/**",
    );

    const results: RawTodo[] = [];

    for (const file of files) {
      let text: string;
      try {
        const bytes = await vscode.workspace.fs.readFile(file);
        text = Buffer.from(bytes).toString("utf8");
      } catch {
        continue;
      }

      const lines = text.split("\n");
      lines.forEach((lineText, index) => {
        const match = regex.exec(lineText);
        if (match) {
          const tag = match[1].toUpperCase();
          const message = match[2].trim();
          const fileName = file.path.split("/").pop() ?? file.path;
          results.push({
            tag,
            message,
            filePath: file.fsPath,
            fileName,
            line: index,
            id: `${file.fsPath}:${message}`, // stable-ish across small line shifts
          });
        }
      });
    }

    this.allTodos = results;
  }
}
