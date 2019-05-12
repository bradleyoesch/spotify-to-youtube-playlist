const fs = require('fs');
const Args = require('./args');

const filepath = './src/resources/cache/';
const cacheNames = [ 'youtube', 'spotify' ];
const _CACHE = {};
let hits = 0;

function load() {
  cacheNames.forEach((name) => {
    try {
      const cache = fs.readFileSync(`${filepath}${name}.json`).toString() || '{}';
      _CACHE[name] = JSON.parse(cache);
    } catch (err) {
      if (err.code === 'ENOENT') {
        _CACHE[name] = {};
      } else {
        throw new Error(err);
      }
    }
  });
}

function write() {
  cacheNames.forEach((name) => {
    fs.writeFileSync(`${filepath}${name}.json`, JSON.stringify(_CACHE[name] || {}));
  });
}

function getIn(path, defaultValue = null) {
  const value = path.reduce((acc, curr) => acc[curr] ? acc[curr] : {}, _CACHE);
  return (value.length || Object.keys(value).length) ? value : defaultValue;
}

function setIn(path, value) {
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

function increment() {
  hits = hits + 1;
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

function print(what) {
  if (what === 'hits') {
    console.log('hits: ' + hits);
  }
  Args.get().printCache && console.log(`Cache:\n${JSON.stringify(_CACHE, undefined, 2)}`);
}

module.exports = {
  load,
  write,
  getIn,
  setIn,
  print,
  increment
};
