import { fileURLToPath } from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import { autoComplete, folderChanged } from "./autoComplete.mjs";
import definition from "./definition.mjs";
import * as diagnostics from "./diagnostics.mjs";

// Hack to import the CommonJS version of vscode-languageserver;
// can't use `import { … }` syntax because it's a CommonJS module.
import languageServerPackage from "vscode-languageserver";
const {
  DidChangeWatchedFilesNotification,
  DocumentDiagnosticReportKind,
  FileChangeType,
  ProposedFeatures,
  TextDocumentSyncKind,
  TextDocuments,
  createConnection,
} = languageServerPackage;

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
// @ts-ignore The import hack above doesn't get the correct type
const connection = createConnection(ProposedFeatures.all);

let workspaceFolderPaths;

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

connection.onInitialize(
  /** @param {import("vscode-languageserver").InitializeParams} params */
  (params) => {
    const workspaceFolders = params.workspaceFolders ?? [];
    workspaceFolderPaths = workspaceFolders.map((folder) =>
      fileURLToPath(folder.uri)
    );

    /** @type {import("vscode-languageserver").InitializeResult} */
    const result = {
      capabilities: {
        completionProvider: {
          // In addition to normal triggers, we trigger on trailing slashes
          triggerCharacters: ["/"],
        },
        definitionProvider: true,
        diagnosticProvider: {
          interFileDependencies: false,
          workspaceDiagnostics: false,
        },
        textDocumentSync: TextDocumentSyncKind.Incremental,
        workspace: {
          // @ts-ignore The import hack above doesn't get the correct type
          didChangeWatchedFiles: {
            dynamicRegistration: false,
          },
        },
      },
    };

    return result;
  }
);

// connection.onInitialized(() => {
//   console.log("Origami LSP initialized");
// });

connection.languages.diagnostics.on(async (params) => {
  const document = documents.get(params.textDocument.uri);
  /** @type {import("vscode-languageclient").DocumentDiagnosticReport} */
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
  const { textDocument, position } = params;
  const uri = textDocument.uri;
  const document = documents.get(uri);
  const compileResult = diagnostics.compileResults.get(uri);
  if (document === undefined || compileResult === undefined) {
    // Called before diagnostics; shouldn't happen
    return [];
  }
  return autoComplete(document, position, workspaceFolderPaths, compileResult);
});

// Go to Definition
connection.onDefinition((params) => {
  const { textDocument, position } = params;
  const uri = textDocument.uri;
  const document = documents.get(uri);
  const compileResult = diagnostics.compileResults.get(uri);
  if (document === undefined || compileResult === undefined) {
    // Called before diagnostics; shouldn't happen
    return [];
  }
  return definition(document, position, workspaceFolderPaths, compileResult);
});

connection.onNotification(DidChangeWatchedFilesNotification.type, (params) => {
  for (const change of params.changes) {
    const { uri, type } = change;
    if (type === FileChangeType.Created || type === FileChangeType.Deleted) {
      // Let AutoComplete know it needs to recalc folder completions
      folderChanged(uri);
    }
  }
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
