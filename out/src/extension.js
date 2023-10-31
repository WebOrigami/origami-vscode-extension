"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = require("vscode");
const TreeFS_js_1 = require("./TreeFS.js");
/**
 * @param {import("vscode").ExtensionContext} context
 export */
function activate(context) {
    console.log("activate");
    const treeFs = new TreeFS_js_1.TreeFS();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("treefs", treeFs));
    context.subscriptions.push(vscode.commands.registerCommand("treefs.init", () => {
        console.log("treefs.init");
        const root = treeFs.root;
        root.entries = new Map();
        root.size = 0;
        treeFs.writeFile(vscode.Uri.parse(`treefs:/file.txt`), Buffer.from("Hello, world."), {
            create: true,
            overwrite: true,
        });
        vscode.workspace.updateWorkspaceFolders(0, 0, {
            uri: vscode.Uri.parse("treefs:/"),
            name: "TreeFS - Sample",
        });
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map