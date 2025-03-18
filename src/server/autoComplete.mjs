import { FileTree, trailingSlash } from "@weborigami/async-tree";
import { ops } from "@weborigami/language";
import { fileURLToPath } from "node:url";
import path from "path";

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
    positionCompletions = getPositionCompletions(code, peggyPosition) ?? [];
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
  if (!Array.isArray(code)) {
    // Not actually code
    return null;
  }

  // Does the position fall within the source range?
  const { location } = code;
  if (
    peggyPosition.line < location.start.line ||
    peggyPosition.line > location.end.line ||
    (peggyPosition.line === location.start.line &&
      peggyPosition.column < location.start.column) ||
    (peggyPosition.line === location.end.line &&
      peggyPosition.column > location.end.column)
  ) {
    // Outside range
    return null;
  }

  // Which argument does the position fall within?
  let completions = [];
  for (const arg of code) {
    const argCompletions = getPositionCompletions(arg, peggyPosition);
    if (argCompletions !== null) {
      completions = argCompletions;
      break;
    }
  }

  const fn = code[0];
  switch (fn) {
    case ops.object:
      // Add each of the object keys
      const entries = code.slice(1);
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
      const args = code[1];
      for (const arg of args) {
        completions.push({
          label: arg,
          kind: CompletionItemKind.Variable,
        });
      }
      break;
  }

  return completions;
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
