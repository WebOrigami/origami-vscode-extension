// CommonJS client module triggers loading of the ES client module

// We need to acquire a reference to the vscode package here because it's not a
// real module -- VS Code somehow injects it at runtime.
const vscode = require("vscode");

let extension;

module.exports = {
  async activate(context) {
    extension ??= await import("./extension.mjs");
    // Give the extension a reference to vscode
    extension.setVsCode(vscode);
    extension.activate(context);
  },
};
