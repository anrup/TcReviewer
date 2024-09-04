import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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

class CommentData {
    comment : string = '';
    lines : Map<string, Array<number>> = new Map();

    // Metadata
    readonly commentId : number;
    readonly object : string;
    constructor (commentId: number, object : string) {
        this.commentId = commentId;
        this.object = object;
    }

    IsCommentWithId(args: {commentId: number}) : boolean {
        return this.commentId === args.commentId;
    }
    UpdateSelectedLines(args: {section: string, lineId : number}) {
        if (!this.lines.has(args.section)) {
            this.lines.set(args.section, []);
        }

        let idx = this.lines.get(args.section)!.indexOf(args.lineId);       
        if (idx === -1) {
            this.lines.get(args.section)!.push(args.lineId);
        }
        else {
            this.lines.get(args.section)!.splice(idx, 1);
        }

    }
}

class CommentController {
    comments : Array<CommentData> = [];
    currentCommentData : (CommentData | null) = null;
    currentCommentId : number = 0;

    OnNewLineSelected(args: {object: string, section: string, lineId: number}): CommentData {
        if (this.currentCommentData === null) {
            this.currentCommentId++;
            this.currentCommentData = new CommentData(this.currentCommentId, args.object);
        }

        this.currentCommentData.UpdateSelectedLines({section: args.section, lineId: args.lineId});
        return this.currentCommentData;
    }

    SaveCommentData(args: {message: string}) {
        if (this.currentCommentData === null) {
            return;
        }

        this.currentCommentData.comment = args.message;
        this.comments.push(this.currentCommentData);
        this.ResetCommentData();

        console.log([...this.comments.values()]);
    }

    DeleteCommentData() {
        // Check if currentCommentData exists in comments array, then remove it
        if (this.currentCommentData !== null) {
            if (this.comments.includes(this.currentCommentData)){
                let rmIdx = this.comments.indexOf(this.currentCommentData);
                this.comments.splice(rmIdx, 1);
            }
        }
        this.ResetCommentData();
    }

    GenerateCurrentCommentDescription() : string {
        return 'placeholder';
    }

    LoadComment(args: {commentId : number}) {
        console.log('open comment with ID', args.commentId);
        let commentData = this.comments.find((comment : CommentData) => comment.commentId === args.commentId);

        console.log('found comment', commentData);
        if (commentData !== undefined) {
            this.currentCommentData = commentData;
        }
        else {
            console.error(`Could not find comment with comment ID ${args.commentId}`);
        }
    }

    CommentExists(commentId : number) : boolean {
        let commentData = this.comments.find((comment : CommentData) => comment.commentId === commentId);
        return commentData !== undefined;
    }

    ReadFromFile() {/*TODO*/}
    WriteToFile() {/*TODO*/}

    ResetCommentData() {
        this.currentCommentData = null;
    }

}

// Event handler for item selection in the twincat-reviewer tree view
function handleTreeViewItemSelected(context: vscode.ExtensionContext, commentController: CommentController, selectedItem: any) {
    // Parse the file to extract the relevant content
    const declLines = selectedItem.declaration.split(/\r?\n/);
    const implLines = selectedItem.implementation.split(/\r?\n/);
    createTcView(context, commentController, selectedItem.label, declLines, implLines);
}

function createTcView(context: vscode.ExtensionContext, commentController: CommentController, label: string, declaration: any, implementation: any) {
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
                case 'LogLineNumber':
                    // Send a highlight command back to the webview
                    
                    let commentData = commentController.OnNewLineSelected({object: label, section: message.section, lineId: parseInt(message.lineNumber)});
                    
                    panel.webview.postMessage({ command: 'HighlightLine', lineNumbers: commentData.lines.get(message.section), section: message.section });

                    return;
                // TODO: remove when not needed
                case 'LogFromScript':
                    console.log('Message from script.js:', message.message);
                    // You can perform other actions here based on the message
                    return;

                case 'SaveComment' :
                    if (commentController.currentCommentData !== null) {
                        if (!commentController.CommentExists(commentController.currentCommentData.commentId)) {
                            // Update comment sidebar
                            panel.webview.postMessage({ 
                                command: 'AddComment', 
                                commentDescription: commentController.GenerateCurrentCommentDescription(), 
                                commentId: String(commentController.currentCommentData.commentId) });
                            commentController.SaveCommentData({message: message.message});
                        }
                    }

                    // Clear the view
                    panel.webview.postMessage({ command: 'highlightLine', lineNumbers: [], section: 'declaration' });
                    panel.webview.postMessage({ command: 'highlightLine', lineNumbers: [], section: 'implementation' });
                    return;

                case 'DeleteComment' :
                    console.log(commentController.currentCommentData);
                    panel.webview.postMessage({ 
                        command: 'DeleteComment', 
                        commentId: String(commentController.currentCommentData?.commentId) });
                    commentController.DeleteCommentData();
                    return;

                case 'OpenComment' :
                    commentController.LoadComment({commentId: Number(message.commentId)});
                    console.log(commentController.currentCommentData);
                    panel.webview.postMessage({command: 'OpenCommentWindow',
                        description: commentController.currentCommentData?.comment
                    });
            }
        },
        undefined,
        context.subscriptions
    );
}

export function activate(context: vscode.ExtensionContext) {

    let commentController = new CommentController;

    let disposable = vscode.commands.registerCommand('twincat-reviewer.startReview', (resource: vscode.Uri) => {
        if (resource) {
            // Get the filename from the resource
            const filename = resource.fsPath;
            vscode.window.showInformationMessage(`Selected file: ${filename}`);

            let pouData = parsing.parseFile(filename);
            
            pouData
                .then((data) => {

                    const methods = data.Method.map((obj : any) => obj.$.Name);
                    const properties = data.Property.map((obj : any) => obj.$.Name);

                    vscode.window.showInformationMessage(`File contains methods ${methods}`);
                    vscode.window.showInformationMessage(`File contains methods ${properties}`);

                    const treeViewProvider = new ReviewerTreeviewDataProvider(data.$.Name, filename, data.Declaration[0], data.Implementation[0].ST[0]);
                    data.Method.forEach((method : any) => {
                        treeViewProvider.addMethod(method.$.Name, method.Declaration[0], method.Implementation[0].ST[0], vscode.ThemeIcon.File);
                    });

                    const treeView = vscode.window.createTreeView('twincat-reviewer.customTreeView', { treeDataProvider: treeViewProvider });

                    // Register event handler for item selection in the custom tree view
                    treeView.onDidChangeSelection((event) => {
                        const selectedItem = event.selection[0];
                        if (selectedItem) {
                            handleTreeViewItemSelected(context, commentController, selectedItem);
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
