import { compile } from "@weborigami/language";
import * as fs from "node:fs/promises";
import url from "node:url";
import { TextDocument } from "vscode-languageserver-textdocument";

// Return an Origami document and associated data
export async function origamiFixture() {
  const uri = url.resolve(import.meta.url, "fixtures/test.ori");
  const filePath = url.fileURLToPath(uri);
  const source = String(await fs.readFile(filePath));
  const compileResult = compile.expression(source).code;
  const document = TextDocument.create(uri, "origami", 1, source);
  const projectRoot = url.resolve(uri, "../..");
  const projectRootPath = url.fileURLToPath(projectRoot);
  const workspaceFolderPaths = [projectRootPath];
  return {
    document,
    compileResult,
    workspaceFolderPaths,
  };
}

// Return an Origami template document and associated data
export async function origamiTemplateFixture() {
  const uri = url.resolve(import.meta.url, "fixtures/test.ori.html");
  const filePath = url.fileURLToPath(uri);
  const source = String(await fs.readFile(filePath));
  const compileResult = compile.templateDocument(source).code;
  const document = TextDocument.create(uri, "origami-html", 1, source);
  const projectRoot = url.resolve(uri, "../..");
  const projectRootPath = url.fileURLToPath(projectRoot);
  const workspaceFolderPaths = [projectRootPath];
  return {
    document,
    compileResult,
    workspaceFolderPaths,
  };
}
