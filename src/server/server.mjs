import { TextDocument } from "vscode-languageserver-textdocument";
import * as autoComplete from "./autoComplete.mjs";

import languageServerPackage from "vscode-languageserver";
const {
  createConnection,
  Diagnostic,
  DiagnosticSeverity,
  DocumentDiagnosticReportKind,
  InitializeResult,
  ProposedFeatures,
  TextDocuments,
  TextDocumentSyncKind,
} = languageServerPackage;

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize(
  /** @param {@import("vscode-languageserver").InitializeParams} params */
  (params) => {
    const capabilities = params.capabilities;

    hasDiagnosticRelatedInformationCapability =
      capabilities?.textDocument?.publishDiagnostics?.relatedInformation ??
      false;

    /** @type {InitializeResult} */
    const result = {
      capabilities: {
        textDocumentSync: TextDocumentSyncKind.Incremental,
        // Tell the client that this server supports code completion.
        completionProvider: {
          resolveProvider: true,
        },
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
      items: await validateTextDocument(document),
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
  validateTextDocument(change.document);
});

/** @param {TextDocument} textDocument */
async function validateTextDocument(textDocument) {
  const maxNumberOfProblems = 100;

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText();
  const pattern = /\b[A-Z]{2,}\b/g;

  /** @type {RegExpExecArray | null} */
  let m;

  let problems = 0;
  const diagnostics = [];
  while ((m = pattern.exec(text)) && problems < maxNumberOfProblems) {
    problems++;
    /** @type {Diagnostic} */
    const diagnostic = {
      severity: DiagnosticSeverity.Warning,
      range: {
        start: textDocument.positionAt(m.index),
        end: textDocument.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: "ex",
    };
    if (hasDiagnosticRelatedInformationCapability) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: "Spelling matters",
        },
        {
          location: {
            uri: textDocument.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: "Particularly for names",
        },
      ];
    }
    diagnostics.push(diagnostic);
  }
  return diagnostics;
}

// Wire up auto-complete
connection.onCompletion(autoComplete.completion);
connection.onCompletionResolve(autoComplete.completionResolve);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
