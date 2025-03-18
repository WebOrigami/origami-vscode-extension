import { fileURLToPath } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import autoComplete from "./autoComplete.mjs";
import definition from "./definition.mjs";
import * as diagnostics from "./diagnostics.mjs";

import languageServerPackage from "vscode-languageserver";
const {
  createConnection,
  DocumentDiagnosticReportKind,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} = languageServerPackage;

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

let workspaceFolderPaths;

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

connection.onInitialize(
  /** @param {@import("vscode-languageserver").InitializeParams} params */
  (params) => {
    const workspaceFolders = params.workspaceFolders ?? [];
    workspaceFolderPaths = workspaceFolders.map((folder) =>
      fileURLToPath(folder.uri)
    );

    /** @type {InitializeResult} */
    const result = {
      capabilities: {
        // Tell the client that this server supports code completion.
        completionProvider: true,
        definitionProvider: true,
        diagnosticProvider: {
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
        textDocumentSync: TextDocumentSyncKind.Incremental,
      },
    };

    return result;
  }
);

connection.onInitialized(() => {
  console.log("Origami LSP initialized");
});

connection.languages.diagnostics.on(async (params) => {
  const document = documents.get(params.textDocument.uri);
  /** @type {DocumentDiagnosticReport} */
  let result;
  if (document !== undefined) {
    result = {
      kind: DocumentDiagnosticReportKind.Full,
      items: diagnostics.validate(document),
    };
  } else {
    // We don't know the document. We can either try to read it from disk
    // or we don't report problems for it.
    result = {
      kind: DocumentDiagnosticReportKind.Full,
      items: [],
    };
  }
  return result;
});

// Wire up auto-complete
connection.onCompletion((params) => {
  const compiledResult = diagnostics.compileResults.get(
    params.textDocument.uri
  );
  return autoComplete(params, workspaceFolderPaths, compiledResult);
});

// Go to Definition
connection.onDefinition((params) => {
  const document = documents.get(params.textDocument.uri);
  return definition(params, document, workspaceFolderPaths);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
// REVIEW: Given diagnostics.on above, why is this necessary?
documents.onDidChangeContent((change) => diagnostics.validate(change.document));

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
