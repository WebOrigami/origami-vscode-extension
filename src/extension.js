const vscode = require("vscode");
const { TreeFS } = require("./TreeFS");

/**
 * @param {import("vscode").ExtensionContext} context
 */
function activate(context) {
  console.log("activate");

  const treeFs = new TreeFS();

  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider("treefs", treeFs)
  );
  let initialized = false;

  context.subscriptions.push(
    vscode.commands.registerCommand("treefs.init", () => {
      console.log("treefs.init");

      if (initialized) {
        return;
      }
      initialized = true;

      // most common files types
      treeFs.writeFile(
        vscode.Uri.parse(`treefs:/file.txt`),
        Buffer.from("Hello, world."),
        {
          create: true,
          overwrite: true,
        }
      );

      vscode.workspace.updateWorkspaceFolders(0, 0, {
        uri: vscode.Uri.parse("treefs:/"),
        name: "TreeFS - Sample",
      });
    })
  );
}

module.exports = {
  activate,
};
