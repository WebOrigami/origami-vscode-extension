/**
 * Text utilities
 *
 * This includes conversions of text document positions between Origami and LSP.
 * Origami positions are based on Peggy.js positions, which use 1-based line and
 * column numbers. LSP positions use 0-based line and column numbers.
 *
 * @typedef {import("./index.ts").OrigamiPosition} OrigamiPosition
 * @typedef {import("vscode-languageserver").Position} LSPPosition
 */

/**
 * If the offset is inside a path, return the complete path. Otherwise, return
 * null.
 *
 * If expandRight is true, the returned path will include path characters to the
 * right of the offset.
 *
 * @param {string} text
 * @param {number} offset
 */
export function getPathAtOffset(text, offset, expandRight = true) {
  // Based on the Origami path regex in origami.pegjs, but allows slashes
  // because we're not parsing the path here. Also allows colons to account for
  // protocols and port numbers.
  const pathCharRegex = /[^(){}\[\],\\ \t\n\r]/;
  // Back up to the start of the path
  let start = offset;
  while (start > 0 && pathCharRegex.test(text[start - 1])) {
    start--;
  }
  // Advance to the end of the path
  let end = offset;
  if (expandRight) {
    while (end < text.length && pathCharRegex.test(text[end])) {
      end++;
    }
  }
  return start < end ? text.slice(start, end) : null;
}

/**
 * Convert an LSP position to an Origami position
 *
 * Origami positions are based on Peggy.js positions, which use 1-based line and
 * column numbers. LSP positions use 0-based line and column numbers.
 *
 * @param {LSPPosition} lspPosition
 * @returns {OrigamiPosition}
 */
export function lspPositionToOrigamiPosition(lspPosition) {
  return {
    line: lspPosition.line + 1,
    column: lspPosition.character + 1,
  };
}

/**
 * Convert an Origami position to an LSP-compatible position
 *
 * @param {OrigamiPosition} origamiPosition
 * @returns {LSPPosition}
 */
export function origamiPositionToLSPPosition(origamiPosition) {
  return {
    line: origamiPosition.line - 1,
    character: origamiPosition.column - 1,
  };
}
