/*
 * Generate the import map, because writing one by hand is *very* verbose.
 * This way of managing an importmap is *very expilicit*.
 * In most cases you can rely on esm.sh (and others) to correctly handle
 * the dependencies.
 *
 * TODO:
 *   make a UI toggle or something to change between simple and explicit techniques
 */
// let version = "latest";
let sha = '9b5a07d';
let version = `0.8.10-unstable.${sha}`; /* unstable / nightly */
let map = {
  'inspect-utils': 'https://esm.sh/inspect-utils',
};

let packages = [
  // Used
  '@starbeam/collections',
  '@starbeam/reactive',
  '@starbeam/universal',
  // Dependencies that we want to make sure only get included once
  // '@starbeam/core-utils',
  '@starbeam/debug',
  '@starbeam/runtime',
  '@starbeam/tags',
  '@starbeam/verify',
  ['@starbeam/resource', `0.0.1-unstable.${sha}`],
  ['@starbeam/shared', `1.3.8-unstable.${sha}`],
  ['@starbeam/tags', `0.0.1-unstable.${sha}`],
];

for (let pkg of packages) {
  if (Array.isArray(pkg)) {
    let [name, version] = pkg;

    map[pkg] = `https://esm.sh/*${name}@${version}?raw`;

    continue;
  }

  map[pkg] = `https://esm.sh/*${pkg}@${version}?raw`;
}

let mapContent = { imports: map };

let importMap = document.createElement('script');

importMap.setAttribute('type', 'importmap');
importMap.innerHTML = JSON.stringify(mapContent, null, '\t');

console.info(`importmap content:\n`, mapContent);

document.head.append(importMap);
