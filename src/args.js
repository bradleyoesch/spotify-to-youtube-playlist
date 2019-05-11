const _ = require('lodash');

let _args = {};
const INT_ARGS = ['limit', 'offset', 'chunkSize'];

const DEFAULT_ARGS = {
  limit: 5,
  offset: 0,
  chunkSize: 5
};

/**
 * Parses individual -key value and --flags
 */
function _parse() {
  const args = {};
  if (process.argv.length <= 2) {
    return {};
  }
  const argArr = process.argv.slice(2);
  for (let i = 0; i < argArr.length; i++) {
    const arg = argArr[i];
    const nextArg = argArr[i + 1];
    // only support --arg value and -flag
    if (arg[0] === '-') {
      if (arg[1] === '-') {
        args[arg.slice(2)] = !isNaN(nextArg) ? parseInt(nextArg) : nextArg;
        i++;
      } else {
        args[arg.slice(1)] = true;
      }
    }
  }
  args.debug && console.log(args);
  return args;
}

function set() {
  _args = Object.assign(DEFAULT_ARGS, _parse());
  INT_ARGS.forEach((arg) => _args[arg] = Math.max(0, _args[arg]));
}

function get() {
  return _.cloneDeep(_args);
}

module.exports = {
  set,
  get
}
