/**
 * Conversions of text document positions between Origami and LSP
 *
 * Origami positions are based on Peggy.js positions, which use 1-based line and
 * column numbers. LSP positions use 0-based line and column numbers.
 *
 * @typedef {@import("@weborigami/language").Position} PeggyPosition
 * @typedef {import("vscode-languageserver").Position} LSPPosition
 */

/**
 * Convert an LSP position to an Origami position
 *
 * Origami positions are based on Peggy.js positions, which use 1-based line and
 * column numbers. LSP positions use 0-based line and column numbers.
 *
 * @param {LSPPosition} lspPosition
 * @returns {PeggyPosition}
 */
export function lspPositionToPeggyPosition(lspPosition) {
  return {
    line: lspPosition.line + 1,
    column: lspPosition.character + 1,
  };
}

/**
 * Convert an Origami position to an LSP-compatible position
 *
 * @param {PeggyPosition} peggyPosition
 * @returns {LSPPosition}
 */
export function peggyPositionToLSPPosition(peggyPosition) {
  return {
    line: peggyPosition.line - 1,
    character: peggyPosition.column - 1,
  };
}
