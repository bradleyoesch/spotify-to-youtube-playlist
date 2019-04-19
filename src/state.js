// quick shitty state to pass around to different files

// TODO: change this to args and figure out how to import default
// so I can do Args.limit but also Args.set(args)
const DEFAULT_ARGS = {
  limit: 5,
  offset: 0,
  chunkSize: 5
}

const State = {
  args: DEFAULT_ARGS
}

function setArgs(args) {
  State.args = Object.assign(State.args, args);
}

module.exports = {
  State,
  setArgs
};
