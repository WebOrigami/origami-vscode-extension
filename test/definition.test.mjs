import assert from "node:assert";
import { describe, test } from "node:test";
import definition from "../src/server/definition.mjs";
import { getPathAtOffset } from "../src/utilities.mjs";
import documentFixture from "./documentFixture.mjs";

describe("definition", () => {
  test("retrieve definition of a local variable", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await documentFixture();

    // Get a position inside the template substitution
    const text = document.getText();
    const offset = text.indexOf("${ na") + 4;
    const position = document.positionAt(offset);

    const location = await definition(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );

    assert(location);
    assert(location.uri.endsWith("fixtures/test.ori")); // in same file
    assert.deepEqual(location.range, {
      start: { line: 4, character: 9 }, // start of lambda parameters
      end: { line: 4, character: 9 },
    });
  });

  test("retrieve definition of a file between source file and workspace root", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await documentFixture();

    // Get position in the template.ori reference
    const text = document.getText();
    const offset = text.indexOf("template.ori");
    const position = document.positionAt(offset);

    const location = await definition(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );

    assert(location);
    assert(location.uri.endsWith("/test/fixtures/template.ori"));
    assert.deepEqual(location.range, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 0 },
    });
  });

  test("getPathAtPosition returns the path at the given position", () => {
    const text = `random stuff test/fixtures/test.ori.html`;
    const position = 27; // "t" after last slash
    const path = getPathAtOffset(text, position);
    assert.equal(path, "test/fixtures/test.ori.html");
  });
});
