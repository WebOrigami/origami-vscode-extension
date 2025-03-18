import { compile } from "@weborigami/language";
import assert from "node:assert";
import * as fs from "node:fs/promises";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as url from "url";
import autoComplete from "../src/server/autoComplete.mjs";

describe("auto complete", () => {
  test("completions include names of files between source file and workspace root", async () => {
    const uri = url.resolve(import.meta.url, "fixtures/test.ori");
    const params = {
      textDocument: { uri },
    };
    const workspaceFolderPaths = [
      "/Users/jan/Source/Origami/origami-vscode-extension",
    ];
    const completions = await autoComplete(params, workspaceFolderPaths);
    assert(hasCompletion(completions, "test.ori.html")); // in same folder
    assert(hasCompletion(completions, "test/")); // ancestor folder
    assert(hasCompletion(completions, "ReadMe.md")); // file at workspace root
  });

  test("completions include object keys and lambda parameters within scope of cursor", async () => {
    const uri = url.resolve(import.meta.url, "fixtures/test.ori");
    const position = { line: 3, character: 30 }; // inside template substitution
    const textDocument = { uri };

    const filePath = fileURLToPath(uri);
    const source = await fs.readFile(filePath);
    const compiled = compile.expression(String(source));

    const params = { textDocument, position };
    const completions = await autoComplete(params, [], compiled);
    assert(hasCompletion(completions, "name")); // lambda parameter
    assert(hasCompletion(completions, "data")); // object key
  });
});

function hasCompletion(completions, label) {
  return Object.values(completions).some(
    (completion) => completion.label === label
  );
}
