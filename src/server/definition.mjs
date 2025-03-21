import { FileTree } from "@weborigami/async-tree";
import { ops } from "@weborigami/language";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as utilities from "../utilities.mjs";
import findInProjectScope from "./findInProjectScope.mjs";
import localDeclarations from "./localDeclarations.mjs";

/**
 * Compile the document and return diagnostics
 *
 * @typedef {import("@weborigami/language").AnnotatedCode} AnnotatedCode
 * @typedef {import("./types.js").OrigamiPosition} OrigamiPosition
 * @typedef {import("vscode-languageserver").Location} Location
 * @typedef {import("vscode-languageserver").Position} LSPPosition
 * @typedef {import("vscode-languageserver-textdocument").TextDocument} TextDocument
 *
 * @param {TextDocument} document
 * @param {LSPPosition} lspPosition
 * @param {string[]} workspaceFolderPaths
 * @param {import("./types.js").CompileResult} compileResult
 * @returns {Promise<Location | null>}
 */
export default async function definition(
  document,
  lspPosition,
  workspaceFolderPaths,
  compileResult
) {
  // Get the path the cursor is inside of
  const text = document.getText();
  const offset = document.offsetAt(lspPosition);
  const targetPath = utilities.getPathAtOffset(text, offset);

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
  if (rootKey === undefined) {
    return null;
  }

  if (keys.length === 0 && compileResult && !(compileResult instanceof Error)) {
    // Path is a single key, try looking for local declarations first
    const range = localDeclarationRange(compileResult, rootKey, lspPosition);
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
    /** @type {string} */
    // @ts-ignore always defined
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

/**
 * If the key corresponds to a local declaration in the code, return the range
 * of the declaration. Otherwise, return null.
 *
 * @param {AnnotatedCode} code
 * @param {string} key
 * @param {LSPPosition} lspPosition
 * @returns {import("vscode-languageserver").Range | null}
 */
function localDeclarationRange(code, key, lspPosition) {
  const origamiPosition = utilities.lspPositionToOrigamiPosition(lspPosition);
  // Walk up from the current position to visit all declarations in scope
  for (const declaration of localDeclarations(code, origamiPosition)) {
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
        start: utilities.origamiPositionToLSPPosition(location.start),
        end: utilities.origamiPositionToLSPPosition(location.start),
      };
      return range;
    }
  }

  return null;
}
