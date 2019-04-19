let _args = {};

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
}

// I know it's not technically private or immutable but I like calling it this way so I'm keeping it
function get() {
  return _args;
}

module.exports = {
  set,
  get
}
