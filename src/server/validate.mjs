import { compile } from "@weborigami/language";
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
export default async function validate(document) {
  const text = document.getText();
  let error;
  try {
    compile.expression(text);
    // If we get this far, there are no errors to report
    return [];
  } catch (e) {
    error = e;
  }

  // Reformat the error as a diagnostic
  const { location } = error;
  const range = {
    start: {
      line: location.start.line - 1,
      character: location.start.column - 1,
    },
    end: {
      line: location.end.line - 1,
      character: location.end.column - 1,
    },
  };
  const diagnostic = {
    severity: DiagnosticSeverity.Error,
    range,
    message: error.message,
  };

  return [diagnostic];
}
