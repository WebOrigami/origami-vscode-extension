import assert from "node:assert";
import { describe, test } from "node:test";
import definition from "../src/server/definition.mjs";
import { getPathAtOffset } from "../src/utilities.mjs";
import { origamiFixture } from "./fixtures.mjs";

describe("definition", () => {
  test("retrieve definition of a local variable", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();
    const position = positionOfText(document, "${ na"); // Inside "name"
    const location = await definition(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );
    assert(location);
    assert(location.uri.endsWith("fixtures/test.ori")); // in same file
    assert.deepEqual(location.range, {
      start: { line: 8, character: 10 }, // start of parameter
      end: { line: 8, character: 14 }, // end of parameter
    });
  });

  test("retrieve definition of a non-enumerable property", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();
    const position = positionOfText(document, "data");
    const location = await definition(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );
    assert(location);
    assert(location.uri.endsWith("fixtures/test.ori")); // in same file
    assert.deepEqual(location.range, {
      start: { line: 2, character: 2 },
      end: { line: 2, character: 44 },
    });
  });

  test("retrieve definition of a property with trailing slash", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();
    const position = positionOfText(document, "posts");
    const location = await definition(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );
    assert(location);
    assert(location.uri.endsWith("fixtures/test.ori")); // in same file
    assert.deepEqual(location.range, {
      start: { line: 12, character: 2 },
      end: { line: 12, character: 43 },
    });
  });

  test("retrieve definition of a file between source file and workspace root", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();
    const position = positionOfText(document, "template.ori"); // template reference
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

  test("retrieve definition of a file referenced with shorthand property", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();
    const position = positionOfText(document, "ReadMe.md");
    const location = await definition(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );
    assert(location);
    assert(location.uri.endsWith("ReadMe.md"));
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

function positionOfText(document, searchText) {
  const text = document.getText();
  const offset = text.indexOf(searchText) + searchText.length;
  return document.positionAt(offset);
}
