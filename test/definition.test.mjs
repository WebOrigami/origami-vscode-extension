import { compile } from "@weborigami/language";
import assert from "node:assert";
import * as fs from "node:fs/promises";
import { describe, test } from "node:test";
import url from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";
import definition, { getPathAtPosition } from "../src/server/definition.mjs";

describe("definition", () => {
  test("retrieve definition of a local variable", async () => {
    const uri = url.resolve(import.meta.url, "fixtures/test.ori");
    const textDocument = { uri };

    const filePath = url.fileURLToPath(uri);
    const source = String(await fs.readFile(filePath));
    const compiled = compile.expression(source);

    // Get a position inside the template substitution
    const document = TextDocument.create(uri, "origami", 1, source);
    const offset = source.indexOf("${ na") + 4;
    const position = document.positionAt(offset);

    const params = { textDocument, position };
    const location = await definition(params, document, [], compiled);
    assert(location.uri.endsWith("fixtures/test.ori")); // in same file
    assert.deepEqual(location.range, {
      start: { line: 4, character: 9 }, // start of lambda parameters
      end: { line: 4, character: 9 },
    });
  });

  test("retrieve definition of a file between source file and workspace root", async () => {
    // Fake file, we just care that it's in the fixtures folder
    const uri = url.resolve(import.meta.url, "doesntExist.ori");
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
    const location = await definition(
      params,
      textDocument,
      [url.fileURLToPath(projectRoot)],
      null
    );
    assert(location.uri.endsWith("/test/fixtures/test.ori.html"));
    assert.deepEqual(location.range, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    });
  });

  test("getPathAtPosition returns the path at the given position", () => {
    const text = `random stuff test/fixtures/test.ori.html`;
    const position = 27; // "t" after last slash
    const path = getPathAtPosition(text, position);
    assert.equal(path, "test/fixtures/test.ori.html");
  });
});
