/*
 * Generate the import map, because writing one by hand is *very* verbose.
 * This way of managing an importmap is *very expilicit*.
 * In most cases you can rely on esm.sh (and others) to correctly handle
 * the dependencies.
 *
 * TODO:
 *   make a UI toggle or something to change between simple and explicit techniques
 */
// let version = '0.8.10-unstable.398c1bd'; /* unstable / nightly */
let version = "latest";
let map = {
  "@starbeam/collections": "https://esm.run/@starbeam/collections@0.8.9",
  "@starbeam/universal": "https://esm.run/@starbeam/universal@0.8.9",
  "@starbeam/js": "https://esm.run/@starbeam/js@0.8.9",
};

let packages = [
  // '@starbeam/collections',
  // '@starbeam/core-utils',
  // '@starbeam/debug',
  // '@starbeam/js',
  // '@starbeam/shared',
  // '@starbeam/timeline',
  // '@starbeam/universal',
  // '@starbeam/verify',
];

for (let pkg of packages) {
  map[pkg] = `https://esm.sh/*${pkg}@${version}`;
}

let mapContent = { imports: map };

let importMap = document.createElement("script");

importMap.setAttribute("type", "importmap");
importMap.innerHTML = JSON.stringify(mapContent, null, "\t");

console.info(`importmap content:\n`, mapContent);

document.head.append(importMap);
