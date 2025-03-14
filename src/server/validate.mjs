import languageServerPackage from "vscode-languageserver";
const { Diagnostic, DiagnosticSeverity } = languageServerPackage;

/**
 * Return diagnostics for the given document
 *
 * @typedef {import("vscode-languageserver").Diagnostic} Diagnostic
 * @typedef {import("vscode-languageserver").DiagnosticSeverity} DiagnosticSeverity
 * @typedef {import("vscode-languageserver-textdocument").TextDocument} TextDocument
 *
 * @param {TextDocument} document
 * @param {boolean} includeRelatedInformation
 */
export default async function validate(document, includeRelatedInformation) {
  const maxNumberOfProblems = 100;

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = document.getText();
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
        start: document.positionAt(m.index),
        end: document.positionAt(m.index + m[0].length),
      },
      message: `${m[0]} is all uppercase.`,
      source: "ex",
    };
    if (includeRelatedInformation) {
      diagnostic.relatedInformation = [
        {
          location: {
            uri: document.uri,
            range: Object.assign({}, diagnostic.range),
          },
          message: "Spelling matters",
        },
      ];
    }
    diagnostics.push(diagnostic);
  }

  return diagnostics;
}
