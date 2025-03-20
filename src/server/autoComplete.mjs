import { FileTree, trailingSlash } from "@weborigami/async-tree";
import { ops } from "@weborigami/language";
import path from "node:path";
import { fileURLToPath } from "node:url";
import localDeclarations from "./localDeclarations.mjs";
import * as position from "./position.mjs";

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

  let positionCompletions = [];
  if (position && compiledResult && !(compiledResult instanceof Error)) {
    const { code } = compiledResult;
    positionCompletions = getPositionCompletions(code, lspPosition);
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
  const isWorkspaceFolder = workspaceFolderPaths.some(
    (workspaceFolder) =>
      path.resolve(workspaceFolder) === path.resolve(folderPath)
  );
  if (!isWorkspaceFolder && folderPath !== "/") {
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
 * @param {LSPPosition} lspPosition
 * @returns {CompletionItem[]}
 */
function getPositionCompletions(code, lspPosition) {
  const peggyPosition = position.lspPositionToPeggyPosition(lspPosition);
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
