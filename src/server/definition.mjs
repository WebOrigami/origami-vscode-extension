import { FileTree } from "@weborigami/async-tree";
import { ops } from "@weborigami/language";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import localDeclarations from "./localDeclarations.mjs";
import * as position from "./position.mjs";

/**
 * Compile the document and return diagnostics
 *
 * @typedef {@import("@weborigami/language").Code} Code
 * @typedef {@import("@weborigami/language").Position} PeggyPosition
 * @typedef {import("vscode-languageserver").Location} Location
 * @typedef {import("vscode-languageserver").Position} LSPPosition
 * @typedef {import("vscode-languageserver-textdocument").TextDocument} TextDocument
 *
 * @param {TextDocument} document
 * @param {LSPPosition} lspPosition
 * @param {string[]} workspaceFolderPaths
 * @param {Code | Error} compiledResult
 * @returns {Location | null}
 */
export default async function definition(
  document,
  lspPosition,
  workspaceFolderPaths,
  compiledResult
) {
  // Get the path the cursor is inside of
  const text = document.getText();
  const offset = document.offsetAt(lspPosition);
  const targetPath = getPathAtOffset(text, offset);

  // If the position isn't inside a path, return null. Also return null if the
  // path includes a colon -- we don't handle protocols (or port numbers).
  if (targetPath === null || targetPath.includes(":")) {
    return null;
  }

  const uri = document.uri;
  const documentPath = fileURLToPath(uri);
  const folderPath = path.dirname(documentPath);

  // Find path root in project scope, might be a file or a folder
  const keys = targetPath.split("/");
  const rootKey = keys.shift();

  if (
    keys.length === 0 &&
    compiledResult &&
    !(compiledResult instanceof Error)
  ) {
    // Path is a single key, try looking for local declarations first
    const range = localDeclarationRange(
      compiledResult.code,
      rootKey,
      lspPosition
    );
    if (range !== null) {
      return {
        uri,
        range,
      };
    }
  }

  const root = await findInProjectScope(
    rootKey,
    folderPath,
    workspaceFolderPaths
  );

  if (root === null) {
    return null;
  }

  // Follow as many keys as possible until we find a file
  let { path: filePath, value: current } = root;
  while (current instanceof FileTree && keys.length > 0) {
    const key = keys.shift();
    const value = await current.get(key);
    if (value === undefined) {
      break;
    } else if (!(value instanceof FileTree)) {
      filePath = path.join(current.path, key);
    }
    current = value;
  }

  if (current instanceof FileTree) {
    // Path pointed to a folder, which we can't navigate to
    return null;
  }

  const resultHref = pathToFileURL(filePath).href;
  return {
    uri: resultHref,
    // Insertion point will be at the start of the file
    range: {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    },
  };
}

// Find the key in the project scope, starting at the given folder path and
// walking up to one of the workspace roots or the file system root.
async function findInProjectScope(key, folderPath, workspaceFolderPaths) {
  // Special cases
  if (key === "") {
    // root folder
    return {
      path: "/",
      value: new FileTree("/"),
    };
  } else if (key === "~") {
    // home folder
    return {
      path: process.env.HOME,
      value: new FileTree(process.env.HOME),
    };
  }

  let currentPath = folderPath;
  while (currentPath !== "/") {
    const fileTree = new FileTree(currentPath);
    const value = await fileTree.get(key);
    if (value !== undefined) {
      return {
        path: path.join(currentPath, key),
        value,
      };
    }

    if (workspaceFolderPaths?.includes(currentPath)) {
      break;
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
}

// If the offset is inside a path, return the path. Otherwise, return null.
export function getPathAtOffset(text, offset) {
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
  while (end < text.length && pathCharRegex.test(text[end])) {
    end++;
  }
  return start < end ? text.slice(start, end) : null;
}

/**
 * If the key corresponds to a local declaration in the code, return the range
 * of the declaration. Otherwise, return null.
 *
 * @param {Code} code
 * @param {string} key
 * @param {LSPPosition} lspPosition
 * @returns {LSPPosition | null}
 */
function localDeclarationRange(code, key, lspPosition) {
  const peggyPosition = position.lspPositionToPeggyPosition(lspPosition);
  // Walk up from the current position to visit all declarations in scope
  for (const declaration of localDeclarations(code, peggyPosition)) {
    const fn = declaration[0];
    let location;
    switch (fn) {
      case ops.object:
        const entries = declaration.slice(1);
        const entry = entries.find((entry) => entry[0] === key);
        location = entry?.location;
        break;

      case ops.lambda:
        const args = declaration[1];
        const argIndex = args.indexOf(key);
        if (argIndex >= 0) {
          // We don't have enough information to go to the exact position of the
          // argument, so we just go to the start of the lambda
          location = declaration.location;
        }
        break;
    }

    if (location) {
      const range = {
        start: position.peggyPositionToLSPPosition(location.start),
        end: position.peggyPositionToLSPPosition(location.start),
      };
      return range;
    }
  }

  return null;
}
