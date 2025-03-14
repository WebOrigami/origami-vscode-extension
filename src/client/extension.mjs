// This ES module relies upon `vscode` being set as a global variable by the
// CommonJS wrapper, as VS Code won't otherwise make that module available here.

import * as path from "path";

// vscode-languageclient is a CommonJS module so we can't use import syntax, but
// can use destructuring assignment instead
import languageClientPackage from "vscode-languageclient";
const { LanguageClient, TransportKind } = languageClientPackage;

let client;

export function activate(context) {
  // The server is implemented in node
  // const serverModule = context.asAbsolutePath(path.join("out", "server.js"));
  const serverModule = context.asAbsolutePath(
    path.join("src", "server", "server.cjs")
  );

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
  };

  // Options to control the language client
  const clientOptions = {
    // Register the server for plain text documents
    documentSelector: [
      { scheme: "file", language: "origami" },
      { scheme: "untitled", language: "origami" },
    ],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "languageServerExample",
    "Language Server Example",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
