import assert from "node:assert";
import { describe, test } from "node:test";
import { validate } from "../src/server/diagnostics.mjs";
import * as fixtures from "./fixtures.mjs";

describe("diagnostics", () => {
  test("valid Origami file has empty diagnostic report", async () => {
    const { document } = await fixtures.origamiFixture();
    const diagnostics = await validate(document);
    assert.deepEqual(diagnostics, []);
  });

  test("valid Origami template document has empty diagnostic report", async () => {
    const { document } = await fixtures.origamiTemplateFixture();
    const diagnostics = await validate(document);
    assert.deepEqual(diagnostics, []);
  });
});
