// Common JS module that triggers the loading of the server ES module
(async function load() {
  await import("./server.mjs");
})();
