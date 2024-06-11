import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import * as parsing from './parsing';
import { arrayBuffer } from 'stream/consumers';

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
function handleTreeViewItemSelected(context: vscode.ExtensionContext, selectedItem: any) {
    // Parse the file to extract the relevant content
    const declLines = selectedItem.declaration.split(/\r?\n/);
    const implLines = selectedItem.implementation.split(/\r?\n/);
    createTcView(context, selectedItem.label, declLines, implLines);
}

function createTcView(context: vscode.ExtensionContext, label: string, declaration: any, implementation: any) {
    // Read the HTML file
    const htmlPath = vscode.Uri.file(path.join(context.extensionPath, 'views', 'TcView.html'));
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf-8');

    // Read the CSS file
    const cssPath = vscode.Uri.file(path.join(context.extensionPath, 'views', 'TcView.css'));
    const cssContent = fs.readFileSync(cssPath.fsPath, 'utf-8');

    // Create a webview panel for the custom editor
    const panel = vscode.window.createWebviewPanel(
        'customEditor',
        label,
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'views'))]
        }
    );

    // Read the script file
    const scriptPathOnDisk = vscode.Uri.file(path.join(context.extensionPath, 'views', 'TcView.js'));
    const scriptUri = panel.webview.asWebviewUri(scriptPathOnDisk);

    // Set the HTML content for the webview
    const replacedHtmlContent = htmlContent
        .replace('<link rel="stylesheet" href="styles.css">', `<style>${cssContent}</style>`)
        .replace('<!-- declaration -->', declaration.map((line : string, index : number) => `<div class="line" data-line-number="${index}"><pre>${line}</pre></div>`).join(''))
        .replace('<!-- implementation -->', implementation.map((line : string, index : number) => `<div class="line" data-line-number="${index}"><pre>${line}</pre></div>`).join(''))
        .replace('<script src="script.js"></script>', `<script src="${scriptUri}"></script>`);

    panel.webview.html = replacedHtmlContent;


    panel.webview.onDidReceiveMessage(
        message => {
            switch (message.command) {
                case 'logLineNumber':
                    console.log(`Line clicked in ${message.section}:`, message.lineNumber);
                    // Send a highlight command back to the webview
                    let highlightedLines = context.workspaceState.get(`${label}highlightedLines${message.section}`, [] as number[]);
                    
                    const index = highlightedLines.indexOf(parseInt(message.lineNumber));
                    console.log(`index`, index, 'of', parseInt(message.lineNumber));
                    if (index !== -1) {
                        // Value exists, remove it
                        highlightedLines.splice(index, 1);
                    } else {
                        // Value doesn't exist, add it
                        highlightedLines.push(parseInt(message.lineNumber));
                    }
                    context.workspaceState.update(`${label}highlightedLines${message.section}`, highlightedLines);

                    console.log(`highlighted lines:`, highlightedLines);
                    panel.webview.postMessage({ command: 'highlightLine', lineNumbers: highlightedLines, section: message.section });

                    return;
                // TODO: remove when not needed
                case 'logFromScript':
                    console.log('Message from script.js:', message.message);
                    // You can perform other actions here based on the message
                    return;
            }
        },
        undefined,
        context.subscriptions
    );
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
                            handleTreeViewItemSelected(context, selectedItem);
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
