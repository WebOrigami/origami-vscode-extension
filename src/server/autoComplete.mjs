import { FileTree, trailingSlash } from "@weborigami/async-tree";
import { ops } from "@weborigami/language";
import path from "node:path";
import { fileURLToPath } from "node:url";
import findInProjectScope from "./findInProjectScope.mjs";
import localDeclarations from "./localDeclarations.mjs";
import * as utilities from "./utilities.mjs";

import languageServerPackage from "vscode-languageserver";
const { CompletionItemKind } = languageServerPackage;

/**
 * @typedef {@import("@weborigami/language").Code} Code
 * @typedef {@import("@weborigami/language").Position} PeggyPosition
 * @typedef {@import("vscode-languageserver").CompletionItemKind} CompletionItemKind
 * @typedef {@import("vscode-languageserver").CompletionItem} CompletionItem
 * @typedef {@import("vscode-languageserver").TextDocument} TextDocument
 * @typedef {import("vscode-languageserver").Position} LSPPosition
 */

// Maps a folder URI to a set of completions for that folder's files
// @ts-ignore - not sure why TS complains about this line
const cachedFolderCompletions = new Map();

/**
 * Return completion items applicable to the given document
 *
 * @param {TextDcoument} document
 * @param {LSPPosition} lspPosition
 * @param {string[]} workspaceFolderPaths
 * @param {Code | Error} compiledResult
 * @returns {CompletionItem[]}
 */
export default async function autoComplete(
  document,
  lspPosition,
  workspaceFolderPaths,
  compiledResult
) {
  const uri = new URL(document.uri);
  if (uri.protocol !== "file:") {
    return [];
  }
  const documentPath = fileURLToPath(uri);
  const folderPath = path.dirname(documentPath);

  // Is the character at the position a trailing slash?
  const text = document.getText();
  const offset = document.offsetAt(lspPosition);
  const char = text[offset - 1];
  const isTrailingSlash = char ? trailingSlash.has(char) : false;

  if (isTrailingSlash) {
    // We're at the end of a path
    const targetPath = utilities.getPathAtOffset(text, offset, false);
    return targetPath === null
      ? []
      : await getPathCompletions(targetPath, folderPath, workspaceFolderPaths);
  }

  let positionCompletions = [];
  if (utilities && compiledResult && !(compiledResult instanceof Error)) {
    const { code } = compiledResult;
    positionCompletions = getPositionCompletions(code, lspPosition);
  }

  // Get completions based on the scope available in the folder
  const scopeCompletions = await getFolderScopeCompletions(
    folderPath,
    workspaceFolderPaths
  );

  return positionCompletions.concat(scopeCompletions);
}

/**
 * Return the completions for files (including subfolders) in the given folder
 *
 * @param {string} folderPath
 */
async function getFolderCompletions(folderPath) {
  if (cachedFolderCompletions.has(folderPath)) {
    return cachedFolderCompletions.get(folderPath);
  }

  const tree = new FileTree(folderPath);
  const keys = await tree.keys();
  const completions = keys.map((key) => ({
    label: trailingSlash.remove(key),
    kind: trailingSlash.has(key)
      ? CompletionItemKind.Folder
      : CompletionItemKind.File,
  }));

  cachedFolderCompletions.set(folderPath, completions);
  return completions;
}

/**
 * Given a folder, return completions for the files in that folder and its
 * parent folders up to one of the workspace roots or the file system root.
 *
 * @param {string} folderPath
 * @param {string[]} workspaceFolderPaths
 */
async function getFolderScopeCompletions(folderPath, workspaceFolderPaths) {
  let parentCompletions;
  const isWorkspaceFolder = workspaceFolderPaths.some(
    (workspaceFolder) =>
      path.resolve(workspaceFolder) === path.resolve(folderPath)
  );
  if (!isWorkspaceFolder && folderPath !== "/") {
    // Get parent folder completions
    const parentFolder = path.dirname(folderPath);
    parentCompletions = await getFolderScopeCompletions(
      parentFolder,
      workspaceFolderPaths
    );
  } else {
    parentCompletions = [];
  }

  const folderCompetions = await getFolderCompletions(folderPath);
  const completions = parentCompletions.concat(folderCompetions);
  return completions;
}

/**
 * Given a path, see if resolves to a folder. If so, return completions for the
 * files in that folder.
 *
 * @param {string} targetPath
 * @param {string} folderPath
 * @param {string[]} workspaceFolderPaths
 */
async function getPathCompletions(
  targetPath,
  folderPath,
  workspaceFolderPaths
) {
  const keys = targetPath.split("/");
  // The path should end in a slash, so last key should be a space
  if (keys.at(-1) === "") {
    keys.pop();
  }
  const rootKey = keys.shift();

  // Find the root in the project scope
  const root = await findInProjectScope(
    rootKey,
    folderPath,
    workspaceFolderPaths
  );

  // We're only interested if the root is a folder
  if (root === null || !(root.value instanceof FileTree)) {
    return null;
  }

  // If there are more keys, we need to find the next folder in the path
  let current = root.value;
  for (const key of keys) {
    const next = await current.get(key);
    if (next instanceof FileTree) {
      current = next;
    } else {
      return null; // The path doesn't resolve to a folder
    }
  }

  // Get the completions for the files in the folder
  const targetFolderPath = current.path;
  const completions = await getFolderCompletions(
    targetFolderPath,
    workspaceFolderPaths
  );
  return completions;
}

/**
 * Return completions for the given position, returning null if the source
 * didn't compile, or if the start position doesn't fall within the source that
 * produced the compiled result
 *
 * @param {Code|Error} compiledResult
 * @param {LSPPosition} lspPosition
 * @returns {CompletionItem[]}
 */
function getPositionCompletions(code, lspPosition) {
  const peggyPosition = utilities.lspPositionToPeggyPosition(lspPosition);
  const completions = [];
  for (const declaration of localDeclarations(code, peggyPosition)) {
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
