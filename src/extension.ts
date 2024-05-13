import * as vscode from 'vscode';
import * as parsing from './parsing';

// Parent file of twincat-reviewr treeview
class MainFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly filepath: string,
        public readonly declaration: string,
        public readonly implementation: string)
    {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
    }
}

// Subfile of twincat-reviewr treeview (method, property...)
class SubFileItem extends vscode.TreeItem {
    constructor(
        public readonly label: string, 
        public readonly declaration: string,
        public readonly implementation: string,
        public readonly iconPath: vscode.ThemeIcon) 
    {
        super(label, vscode.TreeItemCollapsibleState.None);
    }
}

// Data provider for twincat-reviewer treeview
class ReviewerTreeviewDataProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    // Array to hold the sub items
    private subItems: SubFileItem[] = [];

    // Main item representing the root of the tree view
    private mainItem: MainFileItem;

    constructor(
        public readonly mainLabel: string,
        public readonly filePath: string,
        public readonly declaration: string,
        public readonly implementation: string) {
        // Create the main item with the provided label
        this.mainItem = new MainFileItem(mainLabel, filePath, declaration, implementation);

        // Create subitems with the provided labels
        // TODO: import and use better icons
        // this.subItems.push(...methods.map(label => new SubFileItem(label, filePath, vscode.ThemeIcon.File)));
        // this.subItems.push(...properties.map(label => new SubFileItem(label, filePath, vscode.ThemeIcon.File)));
    }

    addMethod(label: string, declaration: string, implementation: string, iconPath: vscode.ThemeIcon) {
        this.subItems.push(new SubFileItem(label, declaration, implementation, iconPath));
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

// Event handler for item selection in the twincat-reviewer tree view
function handleTreeViewItemSelected(selectedItem: any) {
    // Retrieve the file path or identifier associated with the selected subfile
    const filePath = selectedItem.filePath; // Assuming `filePath` is the property containing the file path

    // Parse the file to extract the relevant content
    console.log(selectedItem.declaration);
    console.log(selectedItem.implementation);
    // Create or show the custom readonly editor
    // showCustomReadonlyEditor(parsedContent);
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

                    console.log(data.Implementation);
                    const treeViewProvider = new ReviewerTreeviewDataProvider(data.$.Name, filename, data.Declaration[0], data.Implementation[0].ST[0]);
                    data.Method.forEach((method : any) => {
                        treeViewProvider.addMethod(method.$.Name, method.Declaration[0], method.Implementation[0].ST[0], vscode.ThemeIcon.File);
                    });
                    // data.Property.forEach(property: any => {
                    //     treeViewProvider.addMethod(property.$.Name, property.Declaration, property.Implementation, vscode.ThemeIcon.File);
                    // });
                    const treeView = vscode.window.createTreeView('twincat-reviewer.customTreeView', { treeDataProvider: treeViewProvider });

                    // Register event handler for item selection in the custom tree view
                    treeView.onDidChangeSelection((event) => {
                        const selectedItem = event.selection[0];
                        if (selectedItem) {
                            handleTreeViewItemSelected(selectedItem);
                        }
                    });

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
