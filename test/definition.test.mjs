import assert from "node:assert";
import { describe, test } from "node:test";
import url from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import * as definition from "../src/server/definition.mjs";

describe("definition", () => {
  test("completions include names of files between source file and workspace root", async () => {
    const uri = url.resolve(import.meta.url, "fixture.ori");
    const text = `random stuff test/fixtures/test.ori.html`;
    const textDocument = TextDocument.create(
      uri,
      "origami", // language
      1, // version
      text
    );
    const position = { line: 1, character: 35 }; // at final period
    const params = {
      textDocument,
      position,
    };
    const projectRoot = url.resolve(import.meta.url, "../../");
    const location = await definition.default(params, textDocument, [
      url.fileURLToPath(projectRoot),
    ]);
    assert(location.uri.endsWith("/test/fixtures/test.ori.html"));
    assert.deepEqual(location.range, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    });
  });

  test("getPathAtPosition returns the path at the given position", () => {
    const text = `random stuff test/fixtures/test.ori.html`;
    const position = 27; // "t" after last slash
    const path = definition.getPathAtPosition(text, position);
    assert.equal(path, "test/fixtures/test.ori.html");
  });
});
