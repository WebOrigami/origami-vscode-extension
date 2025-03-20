// This ES module can rely upon `vscode` being set as a global variable by the
// CommonJS wrapper. (The code below doesn't use the `vscode` global yet.)

import * as path from "path";
import builtinCompletions from "./builtins.json" with { type: "json" };

// vscode-languageclient is a CommonJS module so we can't use `import { … }`
// syntax, but we can use destructuring assignment instead
import languageClientPackage from "vscode-languageclient";
// @ts-ignore
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
  const documentSelector = [
    { scheme: "file", language: "origami" },
    { scheme: "untitled", language: "origami" },
  ];
  const clientOptions = { documentSelector };

  // Create the language client
  client = new LanguageClient(
    "origamiLanguageServer",
    "Language Server Example",
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();

  // Register completions for Origami builtins
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(documentSelector, {
      provideCompletionItems() {
        return builtinCompletions;
      },
    })
  );
}

export function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
