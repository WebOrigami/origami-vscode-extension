// This ES module can rely upon `vscode` being set as a global variable by the
// CommonJS wrapper. (The code below doesn't use the `vscode` global yet.)

import * as path from "path";
import builtinCompletions from "./builtins.json" with { type: "json" };

import vscode from "./vscode.cjs";

// vscode-languageclient is a CommonJS module so we can't use `import { … }`
// syntax, but we can use destructuring assignment instead
import languageClientPackage from "vscode-languageclient";
import { getPathAtOffset } from "../utilities.mjs";

// @ts-ignore
const { LanguageClient, TransportKind } = languageClientPackage;

let client;

export function activate(context) {
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
      provideCompletionItems
    })
  );
}

export function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

/**
 * Return completion items for the given document position
 * 
 * @param {import("vscode").TextDocument} document 
 * @param {import("vscode").Position} position 
 */
function provideCompletionItems(document, position) {
  // Are we touching a path?
  const text = document.getText();
  const offset = document.offsetAt(position);
  const targetPath = getPathAtOffset(text, offset, {
    expandRight: false,
    requireSlash: true,
  });
  // If we're touching a path, don't provide the builtins as completions; that
  // wouldn't be useful
  return targetPath
    ? [] 
    : builtinCompletions;
}
