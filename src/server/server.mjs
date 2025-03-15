import { fileURLToPath } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as autoComplete from "./autoComplete.mjs";
import validate from "./validate.mjs";

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

let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize(
  /** @param {@import("vscode-languageserver").InitializeParams} params */
  (params) => {
    const capabilities = params.capabilities;

    const workspaceFolders = params.workspaceFolders ?? [];
    workspaceFolderPaths = workspaceFolders.map((folder) =>
      fileURLToPath(folder.uri)
    );

    hasDiagnosticRelatedInformationCapability =
      capabilities?.textDocument?.publishDiagnostics?.relatedInformation ??
      false;

    /** @type {InitializeResult} */
    const result = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        // Tell the client that this server supports code completion.
        completionProvider: {},
        diagnosticProvider: {
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
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
      items: await validate(
        document,
        hasDiagnosticRelatedInformationCapability
      ),
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

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validate(change.document, hasDiagnosticRelatedInformationCapability);
});

// Wire up auto-complete
connection.onCompletion((params) =>
  autoComplete.completion(params, workspaceFolderPaths)
);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
