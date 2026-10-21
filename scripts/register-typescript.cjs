// Test/audit runner only. Application builds continue to use Next's compiler.
const ts = require("typescript");
const fs = require("node:fs");
const Module = require("node:module");
const original = Module._load;
Module._load = function (name, ...args) {
  if (name === "server-only") return {};
  return original.call(this, name, ...args);
};
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
};
