import esbuild from "esbuild";

esbuild
  .build({
    bundle: true, // Includes all dependencies in the final output
    entryPoints: ["src/client/extension.js"],
    format: "cjs",
    external: ["vscode"],
    outfile: "out/extension.js",
    platform: "node",
    sourcemap: true,
  })
  .catch(() => process.exit(1));

esbuild
  .build({
    bundle: true, // Includes all dependencies in the final output
    entryPoints: ["src/server/server.js"],
    format: "cjs",
    external: ["vscode"],
    outfile: "out/server.js",
    platform: "node",
    sourcemap: true,
  })
  .catch(() => process.exit(1));
