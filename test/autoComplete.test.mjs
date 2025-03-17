import assert from "node:assert";
import { describe, test } from "node:test";
import * as url from "url";
import { completion } from "../src/server/autoComplete.mjs";

describe("auto complete", () => {
  test("includes names of files between source file and workspace root", async () => {
    const foo = import.meta.url;
    const uri = url.resolve(import.meta.url, "fixtures/test.ori");
    const textDocument = { uri };
    const workspaceFolderPaths = [
      "/Users/jan/Source/Origami/origami-vscode-extension",
    ];
    const completions = await completion(
      { textDocument },
      workspaceFolderPaths
    );
    function hasCompletion(label) {
      return Object.values(completions).some(
        (completion) => completion.label === label
      );
    }
    assert(hasCompletion("test.ori.html")); // in same folder
    assert(hasCompletion("test/")); // ancestor folder
    assert(hasCompletion("ReadMe.md")); // file at workspace root
  });
});
