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

  // Declare that the client will handle Origami files
  const clientOptions = {
    documentSelector: [
      { scheme: "file", language: "origami" },
      { scheme: "untitled", language: "origami" },
    ],
  };

  // Create the language client
  client = new LanguageClient(
    "origamiLanguageServer",
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
