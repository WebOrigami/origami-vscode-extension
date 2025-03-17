import { compile } from "@weborigami/language";
import languageServerPackage from "vscode-languageserver";
const { Diagnostic, DiagnosticSeverity } = languageServerPackage;

// Map document URIs to their compiled Code (or Error)
export const compileResults = new Map();

/**
 * Compile the document and return diagnostics
 *
 * @typedef {import("vscode-languageserver").Diagnostic} Diagnostic
 * @typedef {import("vscode-languageserver").DiagnosticSeverity} DiagnosticSeverity
 * @typedef {import("vscode-languageserver-textdocument").TextDocument} TextDocument
 *
 * @param {TextDocument} document
 * @returns {Diagnostic[]}
 */
export function validate(document) {
  const text = document.getText();
  let result;
  try {
    result = compile.expression(text);
  } catch (error) {
    result = error;
  }
  compileResults.set(document.uri, result);

  return result instanceof Error ? errorDiagnostic(result) : [];
}

// Convert an Error to a diagnostic
function errorDiagnostic(error) {
  const { location, message } = error;
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
    message,
  };

  return [diagnostic];
}
