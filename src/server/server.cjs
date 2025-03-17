// CommonJS wrapper module triggers loading of the ES server module

// A CommonJS module can't have a top-level async call to dynamically import an
// ES module, but we can do so via an immediately-invoked async function
(async function load() {
  await import("./server.mjs");
})();
