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
    let initialized = false;
    context.subscriptions.push(vscode.commands.registerCommand("treefs.init", () => {
        console.log("treefs.init");
        if (!initialized) {
            treeFs.writeFile(vscode.Uri.parse(`treefs:/file.txt`), Buffer.from("Hello, world."), {
                create: true,
                overwrite: true,
            });
            initialized = true;
        }
        vscode.workspace.updateWorkspaceFolders(0, 0, {
            uri: vscode.Uri.parse("treefs:/"),
            name: "TreeFS - Sample",
        });
    }));
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map