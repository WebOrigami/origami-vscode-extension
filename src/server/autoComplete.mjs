import languageServerPackage from "vscode-languageserver";
const { CompletionItemKind } = languageServerPackage;

/**
 * @typedef {@import("vscode-languageserver").TextDocumentPositionParams} TextDocumentPositionParams
 * @typedef {@import("vscode-languageserver").CompletionItem} CompletionItem
 */

/**
 * Return an initial list of completion items
 *
 * @param {TextDocumentPositionParams} textDocumentPosition
 * @returns {CompletionItem[]}
 */
export function completion(textDocumentPosition) {
  const result = [
    {
      label: "TypeScript",
      kind: CompletionItemKind.Text,
      data: 1,
    },
    {
      label: "JavaScript",
      kind: CompletionItemKind.Text,
      data: 2,
    },
    {
      label: "tree:",
      kind: CompletionItemKind.Text,
      data: 3,
    },
  ];
  return result;
}

/**
 * Resolve additional information for the given completion item
 *
 * @param {CompletionItem} item
 */
export function completionResolve(item) {
  if (item.data === 1) {
    item.detail = "TypeScript details";
    item.documentation = "TypeScript documentation";
  } else if (item.data === 2) {
    item.detail = "JavaScript details";
    item.documentation = "JavaScript documentation";
  } else if (item.data === 3) {
    item.detail = "tree: details";
    item.documentation = "tree: documentation";
  }
  return item;
}
