const fs = require('fs');
const Args = require('./args');

const _CACHE = {};

function load() {
  // TODO: what if no files?
  const raw = {
    youtube: fs.readFileSync("./cache/youtube.json").toString() || '{}',
    spotify: fs.readFileSync("./cache/spotify.json").toString() || '{}'
  }
  Object.keys(raw).forEach((key) => _CACHE[key] = JSON.parse(raw[key]));
}

function write() {
  // TODO: what if no files?
  fs.writeFileSync("./cache/youtube.json", JSON.stringify(_CACHE.youtube || {}));
  fs.writeFileSync("./cache/spotify.json", JSON.stringify(_CACHE.spotify || {}));
}

function get(path) {
  const value = path.reduce((acc, curr) => acc[curr] ? acc[curr] : {}, _CACHE);
  return (value.length || Object.keys(value).length) ? value : null;
}

function set(path, value) {
  if (!value.length && !Object.keys(value).length) {
    return;
  }
  const cache = path.slice(0, path.length - 1).reduce((acc, curr) => {
    if (!acc[curr]) {
      acc[curr] = {};
    }
    return acc[curr];
  }, _CACHE);
  const key = path[path.length - 1];
  cache[key] = value;
}

// {
//   youtube: {
//     search: {
//       video: {
//         'some query': 'response'
//       }
//     }
//   }
// }

function print() {
  Args.get().debug && console.log(`Cache:\n${JSON.stringify(_CACHE, undefined, 2)}`);
}

module.exports = {
  load,
  write,
  get,
  set,
  print
};
