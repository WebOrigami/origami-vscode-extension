import { FileTree, trailingSlash } from "@weborigami/async-tree";
import { ops } from "@weborigami/language";
import path from "node:path";
import { fileURLToPath } from "node:url";

import languageServerPackage from "vscode-languageserver";
const { CompletionItemKind } = languageServerPackage;

/**
 * @typedef {@import("@weborigami/language").Code} Code
 * @typedef {@import("@weborigami/language").Position} PeggyPosition
 * @typedef {@import("vscode-languageserver").CompletionItemKind} CompletionItemKind
 * @typedef {@import("vscode-languageserver").CompletionItem} CompletionItem
 * @typedef {@import("vscode-languageserver").TextDocumentPositionParams} TextDocumentPositionParams
 * @typedef {@import("vscode-languageserver").TextDocument} TextDocument
 */

// Maps a folder URI to a set of completions for that folder's files
// @ts-ignore - not sure why TS complains about this line
const cachedFolderCompletions = new Map();

/**
 * Return completion items applicable to the given document
 *
 * @param {TextDocumentPositionParams} params
 * @param {string[]} workspaceFolderPaths
 * @param {Code|Error} compiledResult
 * @returns {CompletionItem[]}
 */
export default async function autoComplete(
  params,
  workspaceFolderPaths,
  compiledResult
) {
  const { textDocument, position } = params;
  const uri = new URL(textDocument.uri);
  if (uri.protocol !== "file:") {
    return [];
  }

  let positionCompletions = [];
  if (position && compiledResult && !(compiledResult instanceof Error)) {
    const peggyPosition = lspPositionToPeggyPosition(position);
    const { code } = compiledResult;
    positionCompletions = getPositionCompletions(code, peggyPosition);
  }

  // Get completions based on the document's folder
  const documentPath = fileURLToPath(uri);
  const folderPath = path.dirname(documentPath);
  const folderCompletions = await getFolderCompletions(
    folderPath,
    workspaceFolderPaths
  );

  return positionCompletions.concat(folderCompletions);
}

async function getFolderCompletions(folderPath, workspaceFolderPaths) {
  if (cachedFolderCompletions.has(folderPath)) {
    return cachedFolderCompletions.get(folderPath);
  }

  let parentCompletions;
  if (
    workspaceFolderPaths.length > 0 &&
    !workspaceFolderPaths.includes(folderPath)
  ) {
    // Get parent folder completions
    const parentFolder = path.dirname(folderPath);
    parentCompletions = await getFolderCompletions(
      parentFolder,
      workspaceFolderPaths
    );
  } else {
    parentCompletions = [];
  }

  const tree = new FileTree(folderPath);
  const keys = await tree.keys();
  let completions = keys.map((key) => {
    const kind = trailingSlash.has(key)
      ? CompletionItemKind.Folder
      : CompletionItemKind.File;
    return {
      label: key,
      kind,
    };
  });

  completions = parentCompletions.concat(completions);

  cachedFolderCompletions.set(folderPath, completions);
  return completions;
}

/**
 * Return completions for the given position, returning null if the source
 * didn't compile, or if the start position doesn't fall within the source that
 * produced the compiled result
 *
 * @param {Code|Error} compiledResult
 * @param {PeggyPosition} peggyPosition
 * @returns {CompletionItem[]}
 */
function getPositionCompletions(code, peggyPosition) {
  const completions = [];
  for (const declaration of declarationsAbovePosition(code, peggyPosition)) {
    const fn = declaration[0];
    switch (fn) {
      case ops.object:
        // Add each of the object keys
        const entries = declaration.slice(1);
        for (const entry of entries) {
          const key = entry[0];
          completions.push({
            label: key,
            kind: CompletionItemKind.Property,
          });
        }
        break;

      case ops.lambda:
        // Add the lambda arguments
        const args = declaration[1];
        for (const arg of args) {
          completions.push({
            label: arg,
            kind: CompletionItemKind.Variable,
          });
        }
        break;
    }
  }
  return completions;
}

/**
 * Given a position in source code, yield the set of object or lambda
 * declarations that surround that position, working up toward the root of the
 * code.
 *
 * @param {Code} code
 * @param {PeggyPosition} peggyPosition
 */
function* declarationsAbovePosition(code, peggyPosition) {
  if (!Array.isArray(code) || code.location === undefined) {
    return;
  }

  const { location } = code;
  if (
    peggyPosition.line < location.start.line ||
    peggyPosition.line > location.end.line ||
    (peggyPosition.line === location.start.line &&
      peggyPosition.column < location.start.column) ||
    (peggyPosition.line === location.end.line &&
      peggyPosition.column > location.end.column)
  ) {
    // Position is outside of this code
    return;
  }

  // Which argument does the position fall within?
  for (const arg of code) {
    if (Array.isArray(arg)) {
      // If position is outside argument this will return immediately
      yield* declarationsAbovePosition(arg, peggyPosition);
    }
  }

  // Only yield object and lambda declarations
  const fn = code[0];
  if (fn === ops.object || fn === ops.lambda) {
    yield code;
  }
}

/**
 * Convert an LSP position to an Origami position
 *
 * Origami positions are based on Peggy.js positions, which use 1-based line and
 * column numbers. LSP positions use 0-based line and column numbers.
 *
 * @param {import("vscode-languageserver").Position} lspPosition
 * @returns {PeggyPosition}
 */
function lspPositionToPeggyPosition(lspPosition) {
  return {
    line: lspPosition.line + 1,
    column: lspPosition.character + 1,
  };
}
