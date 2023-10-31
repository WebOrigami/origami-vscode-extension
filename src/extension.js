import * as vscode from "vscode";
import { TreeFS } from "./TreeFS.js";

/**
 * @param {import("vscode").ExtensionContext} context
 export */
export function activate(context) {
  console.log("activate");

  const treeFs = new TreeFS();

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("treefs", treeFs)
  );
  let initialized = false;

  context.subscriptions.push(
    vscode.commands.registerCommand("treefs.init", () => {
      console.log("treefs.init");

      if (!initialized) {
        treeFs.writeFile(
          vscode.Uri.parse(`treefs:/file.txt`),
          Buffer.from("Hello, world."),
          {
            create: true,
            overwrite: true,
          }
        );

        initialized = true;
      }

      vscode.workspace.updateWorkspaceFolders(0, 0, {
        uri: vscode.Uri.parse("treefs:/"),
        name: "TreeFS - Sample",
      });
    })
  );
}
