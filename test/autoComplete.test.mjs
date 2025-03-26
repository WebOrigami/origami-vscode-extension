import assert from "node:assert";
import { describe, test } from "node:test";
import { autoComplete } from "../src/server/autoComplete.mjs";
import { origamiFixture } from "./fixtures.mjs";

describe("auto complete", () => {
  test("completions include names of files between source file and workspace root", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();

    const position = { line: 0, character: 0 };
    const completions = await autoComplete(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );

    assert(hasCompletion(completions, "test.ori.html")); // in same folder
    assert(hasCompletion(completions, "test")); // ancestor folder
    assert(hasCompletion(completions, "ReadMe.md")); // file at workspace root
  });

  test("completions include object keys and lambda parameters within scope of cursor", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();

    // Get a position inside the template substitution in the lambda
    const text = document.getText();
    const offset = text.indexOf("${ ") + 3;
    const position = document.positionAt(offset);

    const completions = await autoComplete(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );

    assert(hasCompletion(completions, "name")); // lambda parameter
    assert(hasCompletion(completions, "data")); // object key
  });

  test("completions after path with trailing slash include file names", async () => {
    const { compileResult, document, workspaceFolderPaths } =
      await origamiFixture();

    // Get a position after a path fragment
    const text = document.getText();
    const fragment = "src/client/";
    const offset = text.indexOf(fragment) + fragment.length;
    const position = document.positionAt(offset);

    const completions = await autoComplete(
      document,
      position,
      workspaceFolderPaths,
      compileResult
    );

    assert(hasCompletion(completions, "builtins.json")); // file in same folder
  });
});

function hasCompletion(completions, label) {
  return Object.values(completions).some(
    (completion) => completion.label === label
  );
}
