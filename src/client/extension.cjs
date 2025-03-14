// CommonJS client module triggers loading of the ES client module

// Pass the injected vscode package to the ES module via a global
globalThis.vscode = require("vscode");

let extension;

module.exports = {
  async activate(context) {
    extension ??= await import("./extension.mjs");
    extension.activate(context);
  },
};
