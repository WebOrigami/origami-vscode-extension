import { compile } from "@weborigami/language";
import languageServerPackage from "vscode-languageserver";
import { origamiPositionToLSPPosition } from "./utilities.mjs";
const { Diagnostic, DiagnosticSeverity } = languageServerPackage;

// Map document URIs to their compiled Code, or Error, or null (if source is
// empty)
export const compileResults = new Map();

/**
 * Compile the document and return diagnostics
 *
 * @typedef {import("vscode-languageserver").Diagnostic} Diagnostic
 * @typedef {import("./index.ts").OrigamiPosition} OrigamiPosition
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
    result = text.trim().length > 0 ? compile.expression(text) : null;
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
    start: origamiPositionToLSPPosition(location.start),
    end: origamiPositionToLSPPosition(location.end),
  };
  const diagnostic = {
    severity: DiagnosticSeverity.Error,
    range,
    message,
  };

  return [diagnostic];
}
