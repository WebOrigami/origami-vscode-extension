import { FileTree, trailingSlash } from "@weborigami/async-tree";
import { fileURLToPath } from "node:url";
import path from "path";

import languageServerPackage from "vscode-languageserver";
const { CompletionItemKind } = languageServerPackage;

/**
 * @typedef {@import("vscode-languageserver").TextDocument} TextDocument
 * @typedef {@import("vscode-languageserver").CompletionItem} CompletionItem
 * @typedef {@import("vscode-languageserver").CompletionItemKind} CompletionItemKind
 */

// Maps a folder URI to a set of completions for that folder's files
const folderCompletions = new Map();

/**
 * Return completion items applicable to the given document
 *
 * @param {TextDocument} textDocument
 * @param {string[]} workspaceFolderPaths
 * @returns {CompletionItem[]}
 */
export async function completion(textDocument, workspaceFolderPaths) {
  const url = new URL(textDocument.uri);
  if (url.protocol !== "file:") {
    return [];
  }

  const documentPath = fileURLToPath(url);
  const folderPath = path.dirname(documentPath);

  const completions = await getFolderCompletions(
    folderPath,
    workspaceFolderPaths
  );
  return completions;
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
