import { FileTree } from "@weborigami/async-tree";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/**
 * Compile the document and return diagnostics
 *
 * @typedef {@import("vscode-languageserver").TypeDefinitionParams} TypeDefinitionParams
 * @typedef {import("vscode-languageserver").Location} Location
 * @typedef {import("vscode-languageserver-textdocument").TextDocument} TextDocument
 *
 * @param {TypeDefinitionParams} params
 * @param {TextDocument} document
 * @param {string[]} workspaceFolderPaths
 * @returns {Location | null}
 */
export default async function definition(
  params,
  document,
  workspaceFolderPaths
) {
  // Get the path the cursor is inside of
  const text = document.getText();
  const position = document.offsetAt(params.position);
  const targetPath = getPathAtPosition(text, position);
  // If the position isn't inside a path, return null. Also return null if the
  // path includes a colon -- we don't handle protocols (or port numbers).
  if (targetPath === null || targetPath.includes(":")) {
    return null;
  }

  const uri = params.textDocument.uri;
  const documentPath = fileURLToPath(uri);
  const folderPath = path.dirname(documentPath);

  // Find path root in project scope, might be a file or a folder
  const keys = targetPath.split("/");
  const rootKey = keys.shift();
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

// If the position is inside a path, return the path. Otherwise, return null.
export function getPathAtPosition(text, position) {
  // Based on the Origami path regex in origami.pegjs, but allows slashes
  // because we're not parsing the path here. Also allows colons to account for
  // protocols and port numbers.
  const pathCharRegex = /[^(){}\[\],\\ \t\n\r]/;
  // Back up to the start of the path
  let start = position;
  while (start > 0 && pathCharRegex.test(text[start - 1])) {
    start--;
  }
  // Advance to the end of the path
  let end = position;
  while (end < text.length && pathCharRegex.test(text[end])) {
    end++;
  }
  return start < end ? text.slice(start, end) : null;
}
