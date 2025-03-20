import { FileTree } from "@weborigami/async-tree";
import path from "node:path";
import process from "node:process";

// Find the key in the project scope, starting at the given folder path and
// walking up to one of the workspace roots or the file system root.
export default async function findInProjectScope(
  key,
  folderPath,
  workspaceFolderPaths
) {
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

    const isWorkspaceFolder = workspaceFolderPaths.some(
      (workspaceFolder) =>
        path.resolve(workspaceFolder) === path.resolve(currentPath)
    );
    if (isWorkspaceFolder) {
      break;
    }

    currentPath = path.dirname(currentPath);
  }

  return null;
}
