import assert from "node:assert";
import { describe, test } from "node:test";
import autoComplete from "../src/server/autoComplete.mjs";
import documentFixture from "./documentFixture.mjs";

describe("auto complete", () => {
  test("completions include names of files between source file and workspace root", async () => {
    const { compiledResult, document, workspaceFolderPaths } =
      await documentFixture();

    const position = { line: 0, character: 0 };
    const completions = await autoComplete(
      document,
      position,
      workspaceFolderPaths,
      compiledResult
    );

    assert(hasCompletion(completions, "test.ori.html")); // in same folder
    assert(hasCompletion(completions, "test/")); // ancestor folder
    assert(hasCompletion(completions, "ReadMe.md")); // file at workspace root
  });

  test("completions include object keys and lambda parameters within scope of cursor", async () => {
    const { compiledResult, document, workspaceFolderPaths } =
      await documentFixture();

    // Get a position inside the template substitution in the lambda
    const text = document.getText();
    const offset = text.indexOf("${") + 2;
    const position = document.positionAt(offset);

    const completions = await autoComplete(
      document,
      position,
      workspaceFolderPaths,
      compiledResult
    );

    assert(hasCompletion(completions, "name")); // lambda parameter
    assert(hasCompletion(completions, "data")); // object key
  });

  test.skip("completions after path with trailing slash include file names", async () => {
    // const { compiledResult, document, workspaceFolderPaths } =
    //   await documentFixture();
    // const completions = await autoComplete(params, []);
    // assert(hasCompletion(completions, "test.ori.html"));
  });
});

function hasCompletion(completions, label) {
  return Object.values(completions).some(
    (completion) => completion.label === label
  );
}
