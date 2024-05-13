import * as vscode from 'vscode';
import * as parsing from './parsing';

class MainFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filepath: string) 
    {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
    }
}

class SubFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string, 
        public readonly filePath: string, 
        public readonly iconPath: vscode.ThemeIcon) 
    {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}

class CustomTreeViewProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    // Array to hold the sub items
    private subItems: SubFileItem[] = [];

    // Main item representing the root of the tree view
    private mainItem: MainFileItem;

    constructor(filePath: string, mainLabel: string, methods: string[], properties: string[]) {
        // Create the main item with the provided label
        this.mainItem = new MainFileItem(mainLabel, filePath);

        // Create subitems with the provided labels
        // TODO: import and use better icons
        this.subItems.push(...methods.map(label => new SubFileItem(label, filePath, vscode.ThemeIcon.File)));
        this.subItems.push(...properties.map(label => new SubFileItem(label, filePath, vscode.ThemeIcon.File)));
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.ProviderResult<vscode.TreeItem[]> {
        if (!element) {
            return [this.mainItem];
        }

        return this.subItems;
    }
}

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('twincat-reviewer.startReview', (resource: vscode.Uri) => {
        if (resource) {
            // Get the filename from the resource
            const filename = resource.fsPath;
            vscode.window.showInformationMessage(`Selected file: ${filename}`);

            let pouData = parsing.parseFile(filename);
            
            pouData
                .then((data) => {
                    // const pouDeclarations = data.$.Declaration;
                    // const pouImplmenetation = data.$.Implementation;

                    const methods = data.Method.map((obj : any) => obj.$.Name);
                    const properties = data.Property.map((obj : any) => obj.$.Name);

                    vscode.window.showInformationMessage(`File contains methods ${methods}`);
                    vscode.window.showInformationMessage(`File contains methods ${properties}`);

                    const treeViewProvider = new CustomTreeViewProvider(filename, data.$.Name, methods, properties);
                    const treeView = vscode.window.createTreeView('twincat-reviewer.customTreeView', { treeDataProvider: treeViewProvider });
                    // const item1 = new SubFileItem('Item 1', '/path/to/file1.txt', filename, vscode.ThemeIcon.File);
                    // const item2 = new SubFileItem('Item 2', '/path/to/file2.txt', filename, vscode.ThemeIcon.File);
                    // treeViewProvider.setItems([item1, item2]);
                })
                .catch((error) => {
                    console.log(error);
                });


        } else {
            vscode.window.showErrorMessage('Cannot get filename. No file selected in the explorer.');
        }
    });

    context.subscriptions.push(disposable);
}

// Deactivate function (optional)
export function deactivate() {}
