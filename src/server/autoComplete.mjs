import { FileTree, trailingSlash } from "@weborigami/async-tree";
import { fileURLToPath } from "node:url";
import path from "path";

import languageServerPackage from "vscode-languageserver";
const { CompletionItemKind } = languageServerPackage;

/**
 * @typedef {@import("vscode-languageserver").TextDocument} TextDocument
 * @typedef {import("vscode-languageserver").TextDocumentPositionParams} TextDocumentPositionParams
 * @typedef {@import("vscode-languageserver").CompletionItem} CompletionItem
 * @typedef {@import("vscode-languageserver").CompletionItemKind} CompletionItemKind
 * @typedef {import("@weborigami/language").Code} Code
 */

// Maps a folder URI to a set of completions for that folder's files
const folderCompletions = new Map();

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

  const positionCompletions = getPositionCompletions(compiledResult, position);

  // Get completions based on the document's folder
  const documentPath = fileURLToPath(uri);
  const folderPath = path.dirname(documentPath);
  const result = await getFolderCompletions(folderPath, workspaceFolderPaths);
  return result;
}

async function getFolderCompletions(folderPath, workspaceFolderPaths) {
  if (folderCompletions.has(folderPath)) {
    return folderCompletions.get(folderPath);
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

  folderCompletions.set(folderPath, completions);
  return completions;
}

/**
 * Return completions for the given position
 *
 * @param {Code|Error} compiledResult
 * @param {import("vscode-languageserver").Position} position
 * @returns {CompletionItem[]}
 */
function getPositionCompletions(compiledResult, position) {
  return [];
}
